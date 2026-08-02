import { afterEach, describe, expect, it, vi } from "vitest";

const DEVELOPMENT_REF = "jmtyurketfclaneqxohu";
const PRODUCTION_REF = "tduvfrxagujryfnqpdmc";
const VALID_PUBLISHABLE_KEY = `sb_publishable_${"a".repeat(17)}`;

type PublicConfigModule = typeof import("./public-config");

interface RawConfigInput {
  readonly appEnvironment: string | undefined;
  readonly supabaseUrl: string | undefined;
  readonly supabasePublishableKey: string | undefined;
  readonly viteMode: string;
  readonly isDevelopmentBuild: boolean;
  readonly isProductionBuild: boolean;
}

const developmentInput = (
  overrides: Partial<RawConfigInput> = {},
): RawConfigInput => ({
  appEnvironment: "development",
  supabaseUrl: `https://${DEVELOPMENT_REF}.supabase.co`,
  supabasePublishableKey: VALID_PUBLISHABLE_KEY,
  viteMode: "development",
  isDevelopmentBuild: true,
  isProductionBuild: false,
  ...overrides,
});

const productionInput = (
  overrides: Partial<RawConfigInput> = {},
): RawConfigInput => ({
  appEnvironment: "production",
  supabaseUrl: `https://${PRODUCTION_REF}.supabase.co`,
  supabasePublishableKey: VALID_PUBLISHABLE_KEY,
  viteMode: "production",
  isDevelopmentBuild: false,
  isProductionBuild: true,
  ...overrides,
});

const encodeJwtSegment = (value: unknown): string =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createJwt = (payload: unknown): string =>
  `${encodeJwtSegment({ alg: "HS256", typ: "JWT" })}.${encodeJwtSegment(payload)}.signature`;

const loadPublicConfigModule = async (): Promise<PublicConfigModule> => {
  vi.resetModules();
  vi.stubEnv("VITE_APP_ENV", "development");
  vi.stubEnv(
    "VITE_SUPABASE_URL",
    `https://${DEVELOPMENT_REF}.supabase.co`,
  );
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", VALID_PUBLISHABLE_KEY);
  vi.stubEnv("MODE", "development");
  vi.stubEnv("DEV", true);
  vi.stubEnv("PROD", false);

  return import("./public-config");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("public config", () => {
  it("inicializa publicConfig com o ambiente Vite controlado", async () => {
    const { publicConfig } = await loadPublicConfigModule();

    expect(publicConfig).toEqual({
      appEnvironment: "development",
      supabaseUrl: `https://${DEVELOPMENT_REF}.supabase.co`,
      supabasePublishableKey: VALID_PUBLISHABLE_KEY,
      supabaseProjectRef: DEVELOPMENT_REF,
    });
    expect(Object.isFrozen(publicConfig)).toBe(true);
  });

  it("normaliza valores e congela a configuração retornada", async () => {
    const { createPublicConfig } = await loadPublicConfigModule();
    const config = createPublicConfig(
      developmentInput({
        supabaseUrl: `  https://${DEVELOPMENT_REF}.supabase.co/  `,
        supabasePublishableKey: `  ${VALID_PUBLISHABLE_KEY}  `,
      }),
    );

    expect(config.supabaseUrl).toBe(
      `https://${DEVELOPMENT_REF}.supabase.co`,
    );
    expect(config.supabasePublishableKey).toBe(VALID_PUBLISHABLE_KEY);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("aceita JWT anon legado pertencente ao projeto de produção", async () => {
    const { createPublicConfig } = await loadPublicConfigModule();
    const anonKey = createJwt({ role: "anon", ref: PRODUCTION_REF });

    expect(
      createPublicConfig(
        productionInput({ supabasePublishableKey: anonKey }),
      ),
    ).toEqual({
      appEnvironment: "production",
      supabaseUrl: `https://${PRODUCTION_REF}.supabase.co`,
      supabasePublishableKey: anonKey,
      supabaseProjectRef: PRODUCTION_REF,
    });
  });

  it.each([
    [
      developmentInput({ appEnvironment: undefined }),
      "Configuração pública ausente: VITE_APP_ENV.",
    ],
    [
      developmentInput({ appEnvironment: "staging" }),
      "VITE_APP_ENV deve ser exatamente 'development' ou 'production'.",
    ],
    [
      developmentInput({ viteMode: "production" }),
      "Ambiente incompatível: VITE_APP_ENV=development e MODE=production.",
    ],
    [
      developmentInput({ isDevelopmentBuild: false }),
      "O ambiente development exige um build Vite de desenvolvimento.",
    ],
    [
      productionInput({ isProductionBuild: false }),
      "O ambiente production exige um build Vite de produção.",
    ],
  ] as const)("rejeita contrato de ambiente inválido", async (input, message) => {
    const { createPublicConfig } = await loadPublicConfigModule();

    expect(() => createPublicConfig(input)).toThrowError(message);
  });

  it.each([
    [undefined, "Configuração pública ausente: VITE_SUPABASE_URL."],
    ["url-invalida", "VITE_SUPABASE_URL não é uma URL válida."],
    [
      `http://${DEVELOPMENT_REF}.supabase.co`,
      "VITE_SUPABASE_URL deve utilizar HTTPS.",
    ],
    [
      `https://usuario:senha@${DEVELOPMENT_REF}.supabase.co`,
      "VITE_SUPABASE_URL deve conter somente a origem do projeto.",
    ],
    [
      `https://${DEVELOPMENT_REF}.supabase.co:8443`,
      "VITE_SUPABASE_URL deve conter somente a origem do projeto.",
    ],
    [
      `https://${DEVELOPMENT_REF}.supabase.co/rest`,
      "VITE_SUPABASE_URL deve conter somente a origem do projeto.",
    ],
    [
      `https://${DEVELOPMENT_REF}.supabase.co?query=1`,
      "VITE_SUPABASE_URL deve conter somente a origem do projeto.",
    ],
    [
      `https://${DEVELOPMENT_REF}.supabase.co#hash`,
      "VITE_SUPABASE_URL deve conter somente a origem do projeto.",
    ],
    [
      "https://example.com",
      "VITE_SUPABASE_URL deve apontar para um project ref válido em supabase.co.",
    ],
    [
      `https://${PRODUCTION_REF}.supabase.co`,
      "Project ref incompatível com o ambiente development.",
    ],
  ] as const)("rejeita URL Supabase inválida: %s", async (supabaseUrl, message) => {
    const { createPublicConfig } = await loadPublicConfigModule();

    expect(() =>
      createPublicConfig(developmentInput({ supabaseUrl })),
    ).toThrowError(message);
  });

  it.each([
    [
      undefined,
      "Configuração pública ausente: VITE_SUPABASE_PUBLISHABLE_KEY.",
    ],
    [
      `sb_secret_${"x".repeat(24)}`,
      "Uma chave privilegiada do Supabase não pode ser usada no frontend.",
    ],
    [
      "prefixo_service_role_segredo",
      "Uma chave privilegiada do Supabase não pode ser usada no frontend.",
    ],
    [
      "sb_publishable_curta",
      "VITE_SUPABASE_PUBLISHABLE_KEY possui formato inválido.",
    ],
    [
      "chave-invalida",
      "VITE_SUPABASE_PUBLISHABLE_KEY deve ser uma chave publishable ou anon válida.",
    ],
    [
      createJwt(["anon", DEVELOPMENT_REF]),
      "VITE_SUPABASE_PUBLISHABLE_KEY deve ser uma chave publishable ou anon válida.",
    ],
    [
      createJwt({ role: "authenticated", ref: DEVELOPMENT_REF }),
      "O JWT público do frontend deve possuir role anon.",
    ],
    [
      createJwt({ role: "anon", ref: PRODUCTION_REF }),
      "A chave anon não pertence ao projeto Supabase esperado.",
    ],
  ] as const)("rejeita chave pública inválida", async (key, message) => {
    const { createPublicConfig } = await loadPublicConfigModule();

    expect(() =>
      createPublicConfig(
        developmentInput({ supabasePublishableKey: key }),
      ),
    ).toThrowError(message);
  });
});
