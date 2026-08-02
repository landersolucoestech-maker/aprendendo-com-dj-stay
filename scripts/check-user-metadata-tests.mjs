import { existsSync, readFileSync } from "node:fs";

const sourcePath = "src/auth/user-metadata.ts";
const contractPath = "src/contracts/profile.ts";
const testPath = "src/auth/user-metadata.test.ts";
const documentationPath =
  "docs/refactor/FASE-B53-USER-METADATA-UNIT-TESTS.md";
const packagePath = "package.json";
const failures = [];

for (const path of [
  sourcePath,
  contractPath,
  testPath,
  documentationPath,
  packagePath,
]) {
  if (!existsSync(path)) failures.push(`Arquivo obrigatório ausente: ${path}`);
}

if (failures.length === 0) {
  const source = readFileSync(sourcePath, "utf8");
  const contract = readFileSync(contractPath, "utf8");
  const test = readFileSync(testPath, "utf8");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

  for (const fragment of [
    'authUserMetadataSchema } from "@/contracts/profile"',
    "authUserMetadataSchema,",
    'fullName: metadata.full_name || metadata.name || user.email?.split("@")[0] || "Aluno"',
  ]) {
    if (!source.includes(fragment)) {
      failures.push(`${sourcePath}: consumidor canônico ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    "profileOptionalNameSchema = z.string().trim().max(120)",
    "profileBioSchema = z.string().trim().max(1000)",
    'new URL(value).protocol === "https:"',
    "authUserMetadataSchema",
    ".passthrough()",
  ]) {
    if (!contract.includes(fragment)) {
      failures.push(`${contractPath}: contrato canônico ausente: ${fragment}`);
    }
  }

  if (
    source.includes('from "zod"') ||
    source.includes("const optionalText") ||
    source.includes("const optionalHttpsUrl") ||
    source.includes("userMetadataSchema")
  ) {
    failures.push(
      `${sourcePath}: validadores duplicados não podem ser restaurados após a consolidação B79`,
    );
  }

  for (const fragment of [
    'from "vitest"',
    "DataContractError",
    'fullName: "Nome Principal"',
    '"http://example.com"',
    '"javascript:alert(1)"',
    '"ftp://example.com/arquivo"',
    '"x".repeat(121)',
    '"y".repeat(1001)',
    'contractError.context).toBe("metadados do usuário autenticado")',
    'expect.arrayContaining(["full_name", "bio"])',
    'user_metadata: null as unknown as User["user_metadata"]',
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura obrigatória ausente: ${fragment}`);
    }
  }

  if (
    packageJson.scripts?.["check:user-metadata-tests"] !==
    "node scripts/check-user-metadata-tests.mjs"
  ) {
    failures.push("package.json: script check:user-metadata-tests ausente ou divergente");
  }

  if (
    !packageJson.scripts?.typecheck?.includes("npm run check:user-metadata-tests")
  ) {
    failures.push("package.json: typecheck não executa o contrato B53");
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B53:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B53/B79 aprovado: metadados controlados pelo usuário reutilizam o contrato canônico com cobertura de fallbacks, limites e URLs HTTPS.",
);
