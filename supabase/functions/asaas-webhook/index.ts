import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const MAX_BODY_BYTES = 256 * 1024;
const TOKEN_HEADER = "asaas-access-token";

interface AsaasWebhookEnvelope {
  id: string;
  event: string;
  payment?: Record<string, unknown>;
  [key: string]: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseSecretKey = (): string => {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed: unknown = JSON.parse(modernKeys);
      if (
        isObject(parsed) &&
        typeof parsed.default === "string" &&
        parsed.default.length > 0
      ) {
        return parsed.default;
      }
    } catch {
      // Fallback to the legacy key below.
    }
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacyKey) throw new Error("SUPABASE_SERVER_CREDENTIAL_NOT_CONFIGURED");
  return legacyKey;
};

const constantTimeEqual = (left: string, right: string): boolean => {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
};

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

const parseEnvelope = (value: unknown): AsaasWebhookEnvelope => {
  if (!isObject(value)) throw new Error("WEBHOOK_BODY_INVALID");

  const id = value.id;
  const event = value.event;
  if (
    typeof id !== "string" ||
    id.length < 3 ||
    id.length > 200 ||
    typeof event !== "string" ||
    !event.startsWith("PAYMENT_") ||
    event.length > 100
  ) {
    throw new Error("WEBHOOK_EVENT_INVALID");
  }

  return value as AsaasWebhookEnvelope;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const configuredToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!configuredToken || configuredToken.length < 16) {
    console.error("Asaas webhook token is not configured");
    return jsonResponse({ error: "WEBHOOK_NOT_CONFIGURED" }, 503);
  }

  const providedToken = request.headers.get(TOKEN_HEADER);
  if (!providedToken || !constantTimeEqual(providedToken, configuredToken)) {
    return jsonResponse({ error: "WEBHOOK_AUTHENTICATION_FAILED" }, 401);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return jsonResponse({ error: "CONTENT_TYPE_INVALID" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "WEBHOOK_BODY_TOO_LARGE" }, 413);
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "WEBHOOK_BODY_TOO_LARGE" }, 413);
    }

    const envelope = parseEnvelope(JSON.parse(rawBody));
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL_NOT_CONFIGURED");

    const serviceClient = createClient(supabaseUrl, parseSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await serviceClient.rpc(
      "process_asaas_payment_webhook",
      {
        p_event_id: envelope.id,
        p_event_type: envelope.event,
        p_payload: envelope,
      },
    );

    if (error) {
      console.error("Asaas webhook persistence failed", {
        code: error.code,
      });
      return jsonResponse({ error: "WEBHOOK_PERSISTENCE_FAILED" }, 500);
    }

    return jsonResponse(
      {
        received: true,
        duplicate: isObject(data) && data.duplicate === true,
        ignored: isObject(data) && data.ignored === true,
        failed: isObject(data) && data.failed === true,
      },
      200,
    );
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : "WEBHOOK_UNEXPECTED_ERROR";
    if (
      code === "WEBHOOK_BODY_INVALID" ||
      code === "WEBHOOK_EVENT_INVALID" ||
      error instanceof SyntaxError
    ) {
      return jsonResponse({ error: "WEBHOOK_BODY_INVALID" }, 400);
    }

    console.error("Asaas webhook unexpected failure", { code });
    return jsonResponse({ error: "WEBHOOK_UNEXPECTED_ERROR" }, 500);
  }
});
