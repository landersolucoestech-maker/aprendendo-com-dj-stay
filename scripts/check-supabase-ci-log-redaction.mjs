import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const paths = {
  redactor: "scripts/redact-supabase-cli-output.mjs",
  workflow: ".github/workflows/baseline.yml",
  parent: "scripts/check-ci-determinism.mjs",
  documentation: "docs/refactor/FASE-B121-SUPABASE-CI-LOG-REDACTION.md",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `Arquivo B121 ausente: ${path}`);
}

const redactor = read(paths.redactor);
const workflow = read(paths.workflow);
const parent = read(paths.parent);
const documentation = read(paths.documentation);

for (const fragment of [
  "REDACTED_LOCAL_CREDENTIAL",
  "supabaseKeyPattern",
  "jwtPattern",
  "postgresPasswordPattern",
  "labeledCredentialPattern",
  "export function redactSupabaseCliLine(line)",
  "createInterface",
  "crlfDelay: Infinity",
  "process.stdout.write",
  "process.exitCode = 1",
]) {
  expect(redactor.includes(fragment), `Redator B121 perdeu a garantia: ${fragment}`);
}

const publishableKey = ["sb", "publishable", "p".repeat(28)].join("_");
const secretKey = ["sb", "secret", "s".repeat(28)].join("_");
const jwt = [
  "eyJhbGciOiJIUzI1NiJ9",
  "eyJyb2xlIjoiYW5vbiJ9",
  "signature123456",
].join(".");
const databasePassword = "local-password-123456";
const storageAccessKey = "LOCALACCESSKEY123456789";
const storageSecretKey = "localsecretkey12345678901234567890";
const operationalError = "toomanyrequests: Rate exceeded";
const migrationMessage = "Applying migration 202608040001_example.sql...";
const input = [
  `Publishable │ ${publishableKey}`,
  `Secret │ ${secretKey}`,
  `Anon Key │ ${jwt}`,
  `DB URL │ postgresql://postgres:${databasePassword}@127.0.0.1:54322/postgres`,
  `S3 Access Key │ ${storageAccessKey}`,
  `S3 Secret Key │ ${storageSecretKey}`,
  operationalError,
  migrationMessage,
].join("\n");

if (existsSync(paths.redactor)) {
  const result = spawnSync(process.execPath, [paths.redactor], {
    cwd: process.cwd(),
    input,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  expect(result.error === undefined, `Redator B121 não executou: ${result.error?.message}`);
  expect(result.status === 0, `Redator B121 encerrou com status ${String(result.status)}.`);
  expect(
    result.stderr === "",
    `Redator B121 escreveu erro inesperado: ${result.stderr.trim()}`,
  );

  for (const sensitiveValue of [
    publishableKey,
    secretKey,
    jwt,
    databasePassword,
    storageAccessKey,
    storageSecretKey,
  ]) {
    expect(
      !result.stdout.includes(sensitiveValue),
      "Redator B121 preservou um valor fictício com formato de credencial.",
    );
  }

  expect(
    result.stdout.includes("[REDACTED_LOCAL_CREDENTIAL]"),
    "Redator B121 não registrou o marcador de redação.",
  );
  expect(
    result.stdout.includes(operationalError),
    "Redator B121 ocultou um erro operacional do Docker.",
  );
  expect(
    result.stdout.includes(migrationMessage),
    "Redator B121 ocultou o progresso de migrations.",
  );
  expect(
    result.stdout.includes("postgresql://postgres:[REDACTED_LOCAL_CREDENTIAL]@127.0.0.1:54322/postgres"),
    "Redator B121 deve preservar a estrutura da URL e remover somente a senha.",
  );
}

for (const fragment of [
  "set -o pipefail",
  'start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor 2>&1 | node scripts/redact-supabase-cli-output.mjs',
  'db reset --local --no-seed',
  'test db',
]) {
  expect(workflow.includes(fragment), `Workflow B121 perdeu a garantia: ${fragment}`);
}
expect(
  !/supabase@\$\{SUPABASE_CLI_VERSION\}[^\n]*start[^\n]*\|[^\n]*\|\|\s*true/.test(
    workflow,
  ),
  "O supabase start redigido não pode ignorar falhas com || true.",
);
expect(
  parent.includes('await import("./check-supabase-ci-log-redaction.mjs")'),
  "Contrato B121 deve permanecer encadeado ao gate de determinismo do CI.",
);

for (const fragment of [
  "FASE B121",
  "valores locais no formato de credencial",
  "set -o pipefail",
  "Mensagens de progresso",
  "Nenhuma migration",
  "Supabase remoto não foi modificado",
  "Nenhuma credencial real foi versionada",
]) {
  expect(documentation.includes(fragment), `Documentação B121 ausente: ${fragment}`);
}

if (failures.length > 0) {
  console.error(
    "Contrato B121 inválido:\n- " + [...new Set(failures)].join("\n- "),
  );
  process.exit(1);
}

console.log(
  "Contrato B121 aprovado: valores locais com formato de credencial são redigidos sem ocultar falhas, progresso ou o exit code do Supabase CLI.",
);
