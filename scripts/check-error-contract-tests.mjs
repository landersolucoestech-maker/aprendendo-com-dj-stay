import { existsSync, readFileSync } from "node:fs";

const contractSourcePath = "src/contracts/contract-error.ts";
const contractTestPath = "src/contracts/contract-error.test.ts";
const messageSourcePath = "src/lib/error-message.ts";
const messageTestPath = "src/lib/error-message.test.ts";
const documentationPath =
  "docs/refactor/FASE-B55-ERROR-CONTRACT-UNIT-TESTS.md";
const packagePath = "package.json";
const failures = [];

for (const path of [
  contractSourcePath,
  contractTestPath,
  messageSourcePath,
  messageTestPath,
  documentationPath,
  packagePath,
]) {
  if (!existsSync(path)) failures.push(`Arquivo obrigatório ausente: ${path}`);
}

if (failures.length === 0) {
  const contractSource = readFileSync(contractSourcePath, "utf8");
  const contractTest = readFileSync(contractTestPath, "utf8");
  const messageSource = readFileSync(messageSourcePath, "utf8");
  const messageTest = readFileSync(messageTestPath, "utf8");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

  for (const fragment of [
    "export class DataContractError extends Error",
    "readonly context: string",
    'this.name = "DataContractError"',
    "this.issues = error.issues",
    "schema.safeParse(value)",
    "throw new DataContractError(context, result.error)",
  ]) {
    if (!contractSource.includes(fragment)) {
      failures.push(`${contractSourcePath}: contrato ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    'from "vitest"',
    'name: "  Produto  "',
    'context).toBe("produto de teste")',
    'expect.arrayContaining(["name", "quantity"])',
    "issue.code.length > 0",
  ]) {
    if (!contractTest.includes(fragment)) {
      failures.push(`${contractTestPath}: cobertura ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    "error instanceof DataContractError",
    "Os dados recebidos não puderam ser validados",
    "error instanceof Error && error.message.trim().length > 0",
    "return fallback",
  ]) {
    if (!messageSource.includes(fragment)) {
      failures.push(`${messageSourcePath}: política ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    'from "vitest"',
    "createContractError",
    "message).not.toContain(error.context)",
    'new Error("Falha específica da operação.")',
    'new Error("   ")',
    '"erro textual"',
    '"Mensagem alternativa."',
  ]) {
    if (!messageTest.includes(fragment)) {
      failures.push(`${messageTestPath}: cobertura ausente: ${fragment}`);
    }
  }

  if (
    packageJson.scripts?.["check:error-contract-tests"] !==
    "node scripts/check-error-contract-tests.mjs"
  ) {
    failures.push("package.json: script check:error-contract-tests ausente ou divergente");
  }

  if (
    !packageJson.scripts?.typecheck?.includes("npm run check:error-contract-tests")
  ) {
    failures.push("package.json: typecheck não executa o contrato B55");
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B55:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B55 aprovado: parsing Zod e mensagens de erro possuem cobertura de sucesso, falha, sanitização e fallback.",
);
