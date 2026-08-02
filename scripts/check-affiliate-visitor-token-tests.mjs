import { existsSync, readFileSync } from "node:fs";

const sourcePath = "src/lib/affiliate-attribution.ts";
const testPath = "src/lib/affiliate-attribution.test.ts";
const documentationPath =
  "docs/refactor/FASE-B54-AFFILIATE-VISITOR-TOKEN-UNIT-TESTS.md";
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
    'AFFILIATE_VISITOR_TOKEN_KEY = "affiliate-visitor-token:v1"',
    "UUID_PATTERN",
    "window.localStorage.getItem",
    "crypto.randomUUID()",
    "window.localStorage.setItem",
  ]) {
    if (!source.includes(fragment)) {
      failures.push(`${sourcePath}: contrato de produção ausente: ${fragment}`);
    }
  }

  for (const fragment of [
    'from "vitest"',
    "vi.stubGlobal(\"window\"",
    "vi.stubGlobal(\"crypto\"",
    "vi.unstubAllGlobals()",
    "VALID_TOKEN.toUpperCase()",
    '"123e4567-e89b-72d3-a456-426614174000"',
    '"123e4567-e89b-42d3-c456-426614174000"',
    'readError: new Error("storage bloqueado")',
    "randomUUID).not.toHaveBeenCalled()",
    "storage.setItem).toHaveBeenCalledWith(TOKEN_KEY, GENERATED_TOKEN)",
    'writeError: new Error("quota indisponível")',
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura obrigatória ausente: ${fragment}`);
    }
  }

  if (
    packageJson.scripts?.["check:affiliate-visitor-token-tests"] !==
    "node scripts/check-affiliate-visitor-token-tests.mjs"
  ) {
    failures.push(
      "package.json: script check:affiliate-visitor-token-tests ausente ou divergente",
    );
  }

  if (
    !packageJson.scripts?.typecheck?.includes(
      "npm run check:affiliate-visitor-token-tests",
    )
  ) {
    failures.push("package.json: typecheck não executa o contrato B54");
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B54:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B54 aprovado: token de visitante afiliado possui cobertura de UUID, persistência, reutilização e falhas de storage.",
);
