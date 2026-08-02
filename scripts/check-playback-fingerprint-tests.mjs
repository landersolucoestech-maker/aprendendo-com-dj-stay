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
    'resolves.toBe("000f10ff")',
    "EXPECTED_SOURCE",
    "const digestSources: string[] = []",
    "if (!(data instanceof Uint8Array))",
    "A fonte do fingerprint deve ser codificada como Uint8Array.",
    "digestSources.push(new TextDecoder().decode(bytes))",
    "expect(environment.digestSources).toEqual([EXPECTED_SOURCE])",
    'toHaveBeenCalledWith(SESSION_NONCE_KEY, GENERATED_NONCE)',
    'readError: new Error("sessionStorage bloqueado")',
    'writeError: new Error("quota indisponível")',
  ]) {
    if (!test.includes(fragment)) {
      failures.push(`${testPath}: cobertura obrigatória ausente: ${fragment}`);
    }
  }

  if (test.includes("ReturnType<typeof vi.fn>")) {
    failures.push(
      `${testPath}: widening genérico de vi.fn não pode ser usado para ler argumentos do digest`,
    );
  }

  if (test.includes("new Uint8Array(data.buffer")) {
    failures.push(
      `${testPath}: BufferSource não pode ser reconstruído a partir de ArrayBufferLike`,
    );
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
  "Contrato B57 aprovado: fingerprint preserva SHA-256, tolera falhas de sessionStorage e estreita BufferSource para Uint8Array sem widening.",
);
