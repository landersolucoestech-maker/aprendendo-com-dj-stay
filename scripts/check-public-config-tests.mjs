import { existsSync, readFileSync } from "node:fs";

const sourcePath = "src/config/public-config.ts";
const testPath = "src/config/public-config.test.ts";
const documentationPath =
  "docs/refactor/FASE-B56-PUBLIC-SUPABASE-CONFIG-UNIT-TESTS.md";
const packagePath = "package.json";
const failures = [];

for (const path of [sourcePath, testPath, documentationPath, packagePath]) {
  if (!existsSync(path)) failures.push(`Arquivo obrigatório ausente: ${path}`);
}

if (failures.length === 0) {
  const source = readFileSync(sourcePath, "utf8");
  const test = readFileSync(testPath, "utf8");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

  for (const fragment of [
    'development: "jmtyurketfclaneqxohu"',
    'production: "tduvfrxagujryfnqpdmc"',
    'parsedUrl.protocol !== "https:"',
    'parsedUrl.pathname !== "/"',
    'key.startsWith("sb_secret_")',
    'key.includes("service_role")',
    'key.startsWith("sb_publishable_")',
    'jwtPayload.role !== "anon"',
    'jwtPayload.ref !== expectedProjectRef',
    "CI_RUNTIME_SMOKE_PUBLISHABLE_KEY",
    "parseCiRuntimeSmoke",
    'appEnvironment !== "development"',
    "ciRuntimeSmoke: import.meta.env.VITE_CI_RUNTIME_SMOKE",
    "return Object.freeze({",
  ]) {
    if (!source.includes(fragment)) {
      failures.push(`${sourcePath}: contrato de produção ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    'from "vitest"',
    'vi.stubEnv("VITE_APP_ENV", "development")',
    'vi.stubEnv("VITE_CI_RUNTIME_SMOKE", "")',
    'vi.stubEnv("DEV", true)',
    "vi.unstubAllEnvs()",
    "Object.isFrozen(publicConfig)",
    "Object.isFrozen(config)",
    'role: "authenticated"',
    'role: "anon"',
    "ref: DEVELOPMENT_REF",
    "ref: PRODUCTION_REF",
    'appEnvironment: "staging"',
    'ciRuntimeSmoke: "1"',
    'isDevelopmentBuild: false',
    'isProductionBuild: false',
    '"url-invalida"',
    "usuario:senha@",
    ".supabase.co:8443",
    ".supabase.co/rest",
    ".supabase.co?query=1",
    ".supabase.co#hash",
    '"https://example.com"',
    'sb_secret_${"x".repeat(24)}',
    '"prefixo_service_role_segredo"',
    '"sb_publishable_curta"',
    "aceita a configuração sintética somente no smoke de development",
    "A configuração sintética do smoke é proibida fora do ambiente development.",
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura obrigatória ausente: ${fragment}`);
    }
  }

  if (
    packageJson.scripts?.["check:public-config-tests"] !==
    "node scripts/check-public-config-tests.mjs"
  ) {
    failures.push("package.json: script check:public-config-tests ausente ou divergente");
  }

  if (
    !packageJson.scripts?.typecheck?.includes("npm run check:public-config-tests")
  ) {
    failures.push("package.json: typecheck não executa o contrato B56");
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B56/B119:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

await import("./check-ci-runtime-smoke-config.mjs");

console.log(
  "Contrato B56/B119 aprovado: configuração pública real e smoke sintético possuem cobertura isolada por ambiente, flag e formato.",
);
