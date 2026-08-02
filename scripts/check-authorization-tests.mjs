import { existsSync, readFileSync } from "node:fs";

const sourcePath = "src/contracts/authorization.ts";
const testPath = "src/contracts/authorization.test.ts";
const documentationPath = "docs/refactor/FASE-B58-AUTHORIZATION-TESTS.md";
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
    "appRoleSchema",
    "userRoleRowSchema",
    '"aluno"',
    '"afiliado"',
    '"administrador_proprietario"',
    "z.string().uuid()",
    "datetime({ offset: true })",
    ".strict()",
  ]) {
    if (!source.includes(fragment)) {
      failures.push(`${sourcePath}: contrato de produção ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    'from "vitest"',
    "appRoleSchema",
    "userRoleRowSchema",
    '"aluno"',
    '"afiliado"',
    '"administrador_proprietario"',
    '"instrutor"',
    '"ALUNO"',
    '"not-a-uuid"',
    '"2026-08-02T05:00:00"',
    "extra_field",
    "safeParse",
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura obrigatória ausente: ${fragment}`);
    }
  }

  if (
    packageJson.scripts?.["check:authorization-tests"] !==
    "node scripts/check-authorization-tests.mjs"
  ) {
    failures.push(
      "package.json: script check:authorization-tests ausente ou divergente",
    );
  }

  if (
    !packageJson.scripts?.typecheck?.includes("npm run check:authorization-tests")
  ) {
    failures.push("package.json: typecheck não executa o contrato B58");
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B58:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B58 aprovado: schemas de autorização possuem cobertura de papéis, UUID, timestamps com offset e estrita rejeição de campos extras.",
);
