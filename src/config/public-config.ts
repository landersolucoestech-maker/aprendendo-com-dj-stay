export type AppEnvironment = "development" | "production";

interface RawPublicEnvironment {
  readonly appEnvironment: string | undefined;
  readonly supabaseUrl: string | undefined;
  readonly supabasePublishableKey: string | undefined;
  readonly viteMode: string;
  readonly isDevelopmentBuild: boolean;
  readonly isProductionBuild: boolean;
}

export interface PublicConfig {
  readonly appEnvironment: AppEnvironment;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly supabaseProjectRef: string;
}

const EXPECTED_PROJECT_REFS: Readonly<Record<AppEnvironment, string>> = {
  development: "jmtyurketfclaneqxohu",
  production: "tduvfrxagujryfnqpdmc",
};

function requireValue(value: string | undefined, variableName: string): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new Error(`Configuração pública ausente: ${variableName}.`);
  }

  return normalizedValue;
}

function parseAppEnvironment(value: string | undefined): AppEnvironment {
  const environment = requireValue(value, "VITE_APP_ENV");

  if (environment !== "development" && environment !== "production") {
    throw new Error(
      "VITE_APP_ENV deve ser exatamente 'development' ou 'production'.",
    );
  }

  return environment;
}

function validateBuildMode(
  appEnvironment: AppEnvironment,
  rawEnvironment: RawPublicEnvironment,
): void {
  const expectedMode = appEnvironment;

  if (rawEnvironment.viteMode !== expectedMode) {
    throw new Error(
      `Ambiente incompatível: VITE_APP_ENV=${appEnvironment} e MODE=${rawEnvironment.viteMode}.`,
    );
  }

  if (appEnvironment === "development" && !rawEnvironment.isDevelopmentBuild) {
    throw new Error("O ambiente development exige um build Vite de desenvolvimento.");
  }

  if (appEnvironment === "production" && !rawEnvironment.isProductionBuild) {
    throw new Error("O ambiente production exige um build Vite de produção.");
  }
}

function parseSupabaseUrl(value: string | undefined): {
  readonly url: string;
  readonly projectRef: string;
} {
  const rawUrl = requireValue(value, "VITE_SUPABASE_URL");
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("VITE_SUPABASE_URL não é uma URL válida.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("VITE_SUPABASE_URL deve utilizar HTTPS.");
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.port ||
    parsedUrl.search ||
    parsedUrl.hash ||
    (parsedUrl.pathname !== "/" && parsedUrl.pathname !== "")
  ) {
    throw new Error("VITE_SUPABASE_URL deve conter somente a origem do projeto.");
  }

  const hostnameMatch = /^([a-z0-9]{20})\.supabase\.co$/.exec(
    parsedUrl.hostname,
  );

  if (!hostnameMatch?.[1]) {
    throw new Error(
      "VITE_SUPABASE_URL deve apontar para um project ref válido em supabase.co.",
    );
  }

  return {
    url: parsedUrl.origin,
    projectRef: hostnameMatch[1],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeJwtPayload(key: string): Record<string, unknown> | null {
  const segments = key.split(".");

  if (segments.length !== 3 || !segments[1]) {
    return null;
  }

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload: unknown = JSON.parse(atob(paddedBase64));

    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

function validatePublishableKey(
  value: string | undefined,
  expectedProjectRef: string,
): string {
  const key = requireValue(value, "VITE_SUPABASE_PUBLISHABLE_KEY");

  if (key.startsWith("sb_secret_") || key.includes("service_role")) {
    throw new Error("Uma chave privilegiada do Supabase não pode ser usada no frontend.");
  }

  if (key.startsWith("sb_publishable_")) {
    if (key.length <= "sb_publishable_".length + 16) {
      throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY possui formato inválido.");
    }

    return key;
  }

  const jwtPayload = decodeJwtPayload(key);

  if (!jwtPayload) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY deve ser uma chave publishable ou anon válida.",
    );
  }

  if (jwtPayload.role !== "anon") {
    throw new Error("O JWT público do frontend deve possuir role anon.");
  }

  if (jwtPayload.ref !== expectedProjectRef) {
    throw new Error("A chave anon não pertence ao projeto Supabase esperado.");
  }

  return key;
}

export function createPublicConfig(
  rawEnvironment: RawPublicEnvironment,
): PublicConfig {
  const appEnvironment = parseAppEnvironment(rawEnvironment.appEnvironment);
  validateBuildMode(appEnvironment, rawEnvironment);

  const expectedProjectRef = EXPECTED_PROJECT_REFS[appEnvironment];
  const { url, projectRef } = parseSupabaseUrl(rawEnvironment.supabaseUrl);

  if (projectRef !== expectedProjectRef) {
    throw new Error(
      `Project ref incompatível com o ambiente ${appEnvironment}.`,
    );
  }

  const supabasePublishableKey = validatePublishableKey(
    rawEnvironment.supabasePublishableKey,
    expectedProjectRef,
  );

  return Object.freeze({
    appEnvironment,
    supabaseUrl: url,
    supabasePublishableKey,
    supabaseProjectRef: projectRef,
  });
}

export const publicConfig = createPublicConfig({
  appEnvironment: import.meta.env.VITE_APP_ENV,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  viteMode: import.meta.env.MODE,
  isDevelopmentBuild: import.meta.env.DEV,
  isProductionBuild: import.meta.env.PROD,
});
