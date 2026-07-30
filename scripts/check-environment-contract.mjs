import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DEVELOPMENT_PROJECT_REF = "jmtyurketfclaneqxohu";
const PRODUCTION_PROJECT_REF = "tduvfrxagujryfnqpdmc";
const LEGACY_PROJECT_REF = ["uons", "gcnd", "zzucl", "cixo", "aei"].join("");

function fail(message) {
  console.error(`[environment-contract] ${message}`);
  process.exitCode = 1;
}

function read(path) {
  return readFileSync(path, "utf8");
}

const runtimePaths = [
  "src",
  "supabase",
  "scripts",
  ".github",
  "vite.config.ts",
  "index.html",
  "package.json",
];

for (const runtimePath of runtimePaths) {
  let matches = "";

  try {
    matches = execFileSync(
      "git",
      ["grep", "-n", "--fixed-strings", LEGACY_PROJECT_REF, "--", runtimePath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch (error) {
    if (error?.status !== 1) {
      throw error;
    }
  }

  if (matches.trim()) {
    fail(`Referência legada encontrada em runtime:\n${matches.trim()}`);
  }
}

const trackedEnvironmentFiles = execFileSync(
  "git",
  ["ls-files", ".env", ".env.*"],
  { encoding: "utf8" },
).trim();

if (trackedEnvironmentFiles) {
  fail(`Arquivos de ambiente versionados:\n${trackedEnvironmentFiles}`);
}

const clientSource = read("src/integrations/supabase/client.ts");

for (const forbiddenClientPattern of [
  /https:\/\/[a-z0-9]+\.supabase\.co/,
  /eyJ[A-Za-z0-9_-]{20,}\./,
  /sb_publishable_[A-Za-z0-9_-]{20,}/,
  /sb_secret_[A-Za-z0-9_-]{20,}/,
]) {
  if (forbiddenClientPattern.test(clientSource)) {
    fail("O cliente Supabase contém URL ou chave hardcoded.");
  }
}

if (!clientSource.includes('from "@/config/public-config"')) {
  fail("O cliente Supabase não utiliza a origem tipada de configuração pública.");
}

const publicConfigSource = read("src/config/public-config.ts");

if (!publicConfigSource.includes(DEVELOPMENT_PROJECT_REF)) {
  fail("O project ref de desenvolvimento não está definido no contrato público.");
}

if (!publicConfigSource.includes(PRODUCTION_PROJECT_REF)) {
  fail("O project ref de produção não está definido no contrato público.");
}

const supabaseConfig = read("supabase/config.toml");
const projectRefMatches = [...supabaseConfig.matchAll(/^project_id\s*=\s*"([a-z0-9]+)"\s*$/gm)];

if (
  projectRefMatches.length !== 1 ||
  projectRefMatches[0]?.[1] !== DEVELOPMENT_PROJECT_REF ||
  supabaseConfig.includes(PRODUCTION_PROJECT_REF)
) {
  fail("supabase/config.toml deve apontar exclusivamente para o projeto dev.");
}

if (!process.exitCode) {
  console.log("Contrato público de ambientes verificado sem exposição de credenciais.");
}
