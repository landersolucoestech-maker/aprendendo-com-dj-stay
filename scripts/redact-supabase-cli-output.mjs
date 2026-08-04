import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REDACTED_LOCAL_CREDENTIAL = "[REDACTED_LOCAL_CREDENTIAL]";

const supabaseKeyPattern = /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/g;
const jwtPattern = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const postgresPasswordPattern =
  /(postgres(?:ql)?:\/\/[^:\s/]+:)([^@\s/]+)(@)/gi;
const ansiSequence = String.raw`\u001B\[[0-?]*[ -/]*[@-~]`;
const labeledCredentialPattern = new RegExp(
  `((?:Service Role Key|Anon Key|Secret Key|Access Key|Publishable|Secret)(?:(?:${ansiSequence})|[\\s│|:=])*)([^\\s│|]{12,})`,
  "gi",
);

export function redactSupabaseCliLine(line) {
  return line
    .replace(supabaseKeyPattern, REDACTED_LOCAL_CREDENTIAL)
    .replace(jwtPattern, REDACTED_LOCAL_CREDENTIAL)
    .replace(
      postgresPasswordPattern,
      `$1${REDACTED_LOCAL_CREDENTIAL}$3`,
    )
    .replace(
      labeledCredentialPattern,
      `$1${REDACTED_LOCAL_CREDENTIAL}`,
    );
}

async function redactStream() {
  const lines = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
    terminal: false,
  });

  for await (const line of lines) {
    process.stdout.write(`${redactSupabaseCliLine(line)}\n`);
  }
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  try {
    await redactStream();
  } catch (error) {
    console.error(
      `Falha ao redigir a saída do Supabase CLI: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
