import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const syntheticKey =
  "sb_publishable_ci_runtime_smoke_only_not_for_deployment";
const paths = {
  source: "src/config/public-config.ts",
  tests: "src/config/public-config.test.ts",
  viteEnv: "src/vite-env.d.ts",
  workflow: ".github/workflows/baseline.yml",
  environment: "docs/environment.md",
  documentation: "docs/refactor/FASE-B119-CI-RUNTIME-SMOKE-CONFIG.md",
  parent: "scripts/check-public-config-tests.mjs",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B119 ausente: ${path}`);
}

const source = read(paths.source);
const tests = read(paths.tests);
const viteEnv = read(paths.viteEnv);
const workflow = read(paths.workflow);
const environment = read(paths.environment);
const documentation = read(paths.documentation);
const parent = read(paths.parent);

for (const fragment of [
  `"${syntheticKey}"`,
  "readonly ciRuntimeSmoke: string | undefined;",
  "function parseCiRuntimeSmoke(value: string | undefined): boolean",
  'normalizedValue !== "true"',
  'appEnvironment !== "development"',
  "key === CI_RUNTIME_SMOKE_PUBLISHABLE_KEY",
  "if (!ciRuntimeSmoke)",
  "if (ciRuntimeSmoke)",
  "ciRuntimeSmoke: import.meta.env.VITE_CI_RUNTIME_SMOKE",
]) {
  expect(source.includes(fragment), `Configuração B119 ausente: ${fragment}`);
}

for (const fragment of [
  `"${syntheticKey}"`,
  'ciRuntimeSmoke: "true"',
  'ciRuntimeSmoke: "1"',
  "aceita a configuração sintética somente no smoke de development",
  "A chave sintética do smoke somente pode ser usada com VITE_CI_RUNTIME_SMOKE=true.",
  "A configuração sintética do smoke é proibida fora do ambiente development.",
  "VITE_CI_RUNTIME_SMOKE=true exige a chave sintética canônica do smoke.",
]) {
  expect(tests.includes(fragment), `Cobertura B119 ausente: ${fragment}`);
}

expect(
  viteEnv.includes("readonly VITE_CI_RUNTIME_SMOKE?: string;"),
  "A flag B119 deve permanecer tipada no ambiente Vite.",
);
for (const fragment of [
  'VITE_CI_RUNTIME_SMOKE: "true"',
  `VITE_SUPABASE_PUBLISHABLE_KEY: ${syntheticKey}`,
  "VITE_APP_ENV: development",
  "npm run build:dev",
]) {
  expect(workflow.includes(fragment), `Workflow B119 ausente: ${fragment}`);
}
expect(
  !workflow.includes("secrets.SUPABASE_DEV_PUBLISHABLE_KEY"),
  "O build de qualidade B119 não pode depender de secret ausente.",
);
expect(
  !workflow.includes("VITE_APP_ENV: production\n          VITE_CI_RUNTIME_SMOKE"),
  "A flag sintética B119 não pode ser associada a production.",
);

for (const fragment of [
  "Smoke de runtime no CI",
  "artefato de qualidade não implantável",
  syntheticKey,
  "não é uma credencial",
  "proibida em produção",
]) {
  expect(environment.includes(fragment), `Contrato ambiental B119 ausente: ${fragment}`);
}
for (const fragment of [
  "FASE B119",
  "`VITE_CI_RUNTIME_SMOKE=true`",
  "não é um artefato de implantação",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "branch `main` não foi alterada",
  "Nenhuma chave ativa foi versionada",
]) {
  expect(documentation.includes(fragment), `Documentação B119 ausente: ${fragment}`);
}
expect(
  parent.includes('await import("./check-ci-runtime-smoke-config.mjs")'),
  "Contrato B119 deve permanecer encadeado ao gate de configuração pública.",
);

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const realPublishablePattern = /\bsb_publishable_[A-Za-z0-9_-]{20,}\b/g;
for (const path of trackedFiles) {
  const sourceText = readFileSync(path, "utf8").replaceAll(syntheticKey, "");
  const matches = sourceText.match(realPublishablePattern) ?? [];
  expect(
    matches.length === 0,
    `Possível chave publishable ativa versionada em ${path}.`,
  );
}

if (failures.length > 0) {
  console.error("Contrato B119 inválido:\n- " + [...new Set(failures)].join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B119 aprovado: o smoke usa marcador sintético restrito a development, sem chave ativa versionada nem artefato implantável falso.",
);
