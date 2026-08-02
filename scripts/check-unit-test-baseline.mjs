import { existsSync, readFileSync } from "node:fs";

const packagePath = "package.json";
const lockfilePath = "package-lock.json";
const workflowPath = ".github/workflows/baseline.yml";
const temporaryInstallerPath = ".github/workflows/b52-install-vitest.yml";
const configPath = "vitest.config.ts";
const testPath = "src/lib/date-time.test.ts";
const nodeTsconfigPath = "tsconfig.node.json";
const documentationPath =
  "docs/refactor/FASE-B52-FRONTEND-UNIT-TEST-BASELINE.md";
const failures = [];

for (const path of [
  packagePath,
  lockfilePath,
  workflowPath,
  configPath,
  testPath,
  nodeTsconfigPath,
  documentationPath,
]) {
  if (!existsSync(path)) failures.push(`Arquivo obrigatório ausente: ${path}`);
}

if (existsSync(temporaryInstallerPath)) {
  failures.push(`${temporaryInstallerPath}: instalador temporário não foi removido`);
}

if (failures.length === 0) {
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
  const workflow = readFileSync(workflowPath, "utf8");
  const config = readFileSync(configPath, "utf8");
  const test = readFileSync(testPath, "utf8");
  const nodeTsconfig = JSON.parse(readFileSync(nodeTsconfigPath, "utf8"));

  if (packageJson.devDependencies?.vitest !== "4.1.10") {
    failures.push("package.json: vitest deve permanecer fixado em 4.1.10");
  }
  if (lockfile.packages?.["node_modules/vitest"]?.version !== "4.1.10") {
    failures.push("package-lock.json: resolução de vitest divergente de 4.1.10");
  }

  const scripts = packageJson.scripts ?? {};
  if (scripts.test !== "npm run test:unit") {
    failures.push("package.json: script test deve delegar para test:unit");
  }
  if (scripts["test:unit"] !== "vitest run --config vitest.config.ts") {
    failures.push("package.json: script test:unit deve executar Vitest sem watch");
  }
  if (scripts["check:unit-tests"] !== "node scripts/check-unit-test-baseline.mjs") {
    failures.push("package.json: contrato check:unit-tests ausente ou divergente");
  }
  if (!scripts.check?.includes("npm run test:unit")) {
    failures.push("package.json: gate local check não executa testes unitários");
  }
  if (!scripts.typecheck?.includes("npm run check:unit-tests")) {
    failures.push("package.json: typecheck não executa o contrato B52");
  }

  for (const fragment of [
    'environment: "node"',
    'include: ["src/**/*.test.ts"]',
    "passWithNoTests: false",
    "clearMocks: true",
    "mockReset: true",
    "restoreMocks: true",
  ]) {
    if (!config.includes(fragment)) {
      failures.push(`${configPath}: fragmento obrigatório ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    'from "vitest"',
    'APP_TIME_ZONE).toBe("America/Sao_Paulo")',
    "toUtcIsoString",
    "formatAppRelativeTime",
    "29 * 86_400",
    "30 * 86_400",
    "365 * 86_400",
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura contratual ausente: ${fragment}`);
    }
  }

  if (!nodeTsconfig.include?.includes("vitest.config.ts")) {
    failures.push(`${nodeTsconfigPath}: vitest.config.ts não participa do TypeScript`);
  }

  for (const fragment of [
    "- name: Testes unitários",
    "id: unit",
    "run: npm run test:unit",
    "UNIT: ${{ steps.unit.outcome }}",
    "process.env.UNIT",
    "testes unitários:",
    'test "$UNIT" = success',
  ]) {
    if (!workflow.includes(fragment)) {
      failures.push(`${workflowPath}: integração B52 ausente: ${fragment}`);
    }
  }

  const unitOutcomeUsages = workflow.match(/UNIT: \$\{\{ steps\.unit\.outcome \}\}/g) ?? [];
  if (unitOutcomeUsages.length !== 2) {
    failures.push(
      `${workflowPath}: esperado UNIT em evidência e gate final, encontrados ${unitOutcomeUsages.length}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B52:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B52 aprovado: Vitest fixado, testes unitários presentes e execução bloqueante integrada ao gate.",
);
