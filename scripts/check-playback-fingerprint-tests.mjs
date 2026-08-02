import { existsSync, readFileSync } from "node:fs";

const sourcePath = "src/lib/playback-fingerprint.ts";
const testPath = "src/lib/playback-fingerprint.test.ts";
const documentationPath =
  "docs/refactor/FASE-B57-PLAYBACK-FINGERPRINT-RESILIENCE.md";
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
    'SESSION_NONCE_KEY = "djstay.playback.session-nonce"',
    "const readStoredSessionNonce",
    "window.sessionStorage.getItem",
    "const persistSessionNonce",
    "window.sessionStorage.setItem",
    "crypto.randomUUID()",
    'crypto.subtle.digest("SHA-256"',
    'padStart(2, "0")',
    "catch {",
  ]) {
    if (!source.includes(fragment)) {
      failures.push(`${sourcePath}: contrato de produção ausente: ${fragment}`);
    }
  }

  const catchBlocks = source.match(/catch\s*\{/g) ?? [];
  if (catchBlocks.length < 2) {
    failures.push(
      `${sourcePath}: leitura e escrita do sessionStorage devem possuir fallbacks independentes`,
    );
  }

  for (const fragment of [
    'from "vitest"',
    'vi.stubGlobal("window"',
    'vi.stubGlobal("navigator"',
    'vi.stubGlobal("crypto"',
    'vi.spyOn(Intl, "DateTimeFormat")',
    "vi.unstubAllGlobals()",
    "const nativeSubtle = globalThis.crypto.subtle",
    "subtle: nativeSubtle",
    "EXISTING_FINGERPRINT",
    "GENERATED_FINGERPRINT",
    "6b1d6240cb0479adba3b421db99f77f7bf42290705f5dd7a3a3cbdba04c5477a",
    "818c4fd0a174a7f830f1f90f90da2ab748ef4f403b12f25175c03cb5f7509da7",
    "toMatch(/^[0-9a-f]{64}$/)",
    'readError: new Error("sessionStorage bloqueado")',
    'writeError: new Error("quota indisponível")',
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura obrigatória ausente: ${fragment}`);
    }
  }

  if (
    !/toHaveBeenCalledWith\(\s*SESSION_NONCE_KEY,\s*GENERATED_NONCE,?\s*\)/m.test(
      test,
    )
  ) {
    failures.push(
      `${testPath}: cobertura obrigatória ausente: persistência do nonce gerado`,
    );
  }

  for (const prohibited of [
    "ReturnType<typeof vi.fn>",
    "subtle: { digest }",
    "const digest = vi.fn",
    "new Uint8Array(data.buffer",
  ]) {
    if (test.includes(prohibited)) {
      failures.push(`${testPath}: mock de Web Crypto incompatível reapareceu: ${prohibited}`);
    }
  }

  if (
    packageJson.scripts?.["check:playback-fingerprint-tests"] !==
    "node scripts/check-playback-fingerprint-tests.mjs"
  ) {
    failures.push(
      "package.json: script check:playback-fingerprint-tests ausente ou divergente",
    );
  }

  if (
    !packageJson.scripts?.typecheck?.includes(
      "npm run check:playback-fingerprint-tests",
    )
  ) {
    failures.push("package.json: typecheck não executa o contrato B57");
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B57:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B57 aprovado: fingerprint usa SHA-256 real, tolera falhas de sessionStorage e não depende de mock tipado de BufferSource.",
);
