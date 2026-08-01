import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { frontendErrorRpcClient } from "@/integrations/supabase/frontend-error-rpc";
import {
  frontendErrorCaptureResultSchema,
  type FrontendErrorSource,
} from "@/contracts/frontend-errors";
import { parseDataContract } from "@/contracts/contract-error";

const MAX_SESSION_FINGERPRINTS = 100;
const reportedFingerprints = new Set<string>();
const bearerTokenPattern = new RegExp(
  "(bearer\\s+)[A-Za-z0-9._~+/=-]{16,}",
  "gi",
);
let globalHandlersInstalled = false;

const redactSensitiveText = (value: string, maxLength: number): string =>
  value
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      "[EMAIL_REDACTED]",
    )
    .replace(
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
      "[JWT_REDACTED]",
    )
    .replace(bearerTokenPattern, "$1[TOKEN_REDACTED]")
    .trim()
    .slice(0, maxLength);

const normalizeRoute = (value: string): string => {
  const route = value.split("?", 1)[0]?.split("#", 1)[0]?.trim() || "/";
  const normalized = route
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      ":uuid",
    )
    .replace(/\/\d{5,}(?=\/|$)/g, "/:id");
  return (normalized.startsWith("/") ? normalized : `/${normalized}`).slice(0, 500);
};

const normalizeError = (value: unknown): Error => {
  if (value instanceof Error) return value;
  if (typeof value === "string" && value.trim()) return new Error(value);
  return new Error("Falha não tratada sem mensagem disponível");
};

const normalizeScriptPath = (value: string): string | null => {
  if (!value) return null;
  try {
    return new URL(value, window.location.origin).pathname.slice(0, 500);
  } catch {
    return null;
  }
};

const getRelease = (): string =>
  redactSensitiveText(
    import.meta.env.VITE_APP_RELEASE ?? import.meta.env.MODE ?? "unknown",
    150,
  ) || "unknown";

export type FrontendErrorReportInput = {
  source: FrontendErrorSource;
  route: string;
  error: unknown;
  componentStack?: string | null;
  metadata?: Record<string, Json>;
};

export const reportFrontendError = async (
  input: FrontendErrorReportInput,
): Promise<boolean> => {
  try {
    const error = normalizeError(input.error);
    const route = normalizeRoute(input.route);
    const errorName = redactSensitiveText(error.name || "Error", 150) || "Error";
    const errorMessage =
      redactSensitiveText(error.message, 2000) ||
      "Falha não tratada sem mensagem disponível";
    const componentStack = input.componentStack
      ? redactSensitiveText(input.componentStack, 8000)
      : undefined;
    const fingerprint = [input.source, route, errorName, errorMessage].join("|");

    if (reportedFingerprints.has(fingerprint)) return false;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;

    if (reportedFingerprints.size >= MAX_SESSION_FINGERPRINTS) {
      reportedFingerprints.clear();
    }
    reportedFingerprints.add(fingerprint);

    const { data, error: rpcError } = await frontendErrorRpcClient.rpc(
      "capture_frontend_error",
      {
        p_event_id: crypto.randomUUID(),
        p_source: input.source,
        p_route: route,
        p_error_name: errorName,
        p_error_message: errorMessage,
        ...(componentStack ? { p_component_stack: componentStack } : {}),
        p_release: getRelease(),
        p_metadata: input.metadata ?? {},
      },
    );

    if (rpcError) return false;

    parseDataContract(
      frontendErrorCaptureResultSchema,
      data,
      "persistência de erro do frontend",
    );
    return true;
  } catch {
    return false;
  }
};

export const installGlobalFrontendErrorHandlers = (): void => {
  if (globalHandlersInstalled) return;
  globalHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    void reportFrontendError({
      source: "window_error",
      route: window.location.pathname,
      error:
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "Falha global do navegador"),
      metadata: {
        script_path: normalizeScriptPath(event.filename),
        line: event.lineno || null,
        column: event.colno || null,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    void reportFrontendError({
      source: "unhandled_rejection",
      route: window.location.pathname,
      error: event.reason,
    });
  });
};
