import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const workflowsDirectory = ".github/workflows";
const entries = await readdir(workflowsDirectory, { withFileTypes: true });
const workflowPaths = entries
  .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
  .map((entry) => join(workflowsDirectory, entry.name));

if (workflowPaths.length === 0) {
  console.error("Nenhum workflow GitHub Actions foi encontrado.");
  process.exit(1);
}

const failures = [];
let qualityWorkflowFound = false;

for (const path of workflowPaths) {
  const content = await readFile(path, "utf8");
  const isQualityWorkflow =
    content.includes("SUPABASE_CLI_VERSION") &&
    content.includes('"supabase@${SUPABASE_CLI_VERSION}" test db') &&
    content.includes("npm run typecheck");

  if (!isQualityWorkflow) continue;
  qualityWorkflowFound = true;
  console.log(`Workflow técnico identificado: ${path}`);

  if (/version:\s*["']?latest["']?/i.test(content)) {
    failures.push(`${path}: versão flutuante latest detectada`);
  }

  if (!/SUPABASE_CLI_VERSION:\s*2\.111\.0/.test(content)) {
    failures.push(`${path}: Supabase CLI 2.111.0 não está fixada`);
  }

  if (content.includes("supabase/setup-cli@")) {
    failures.push(`${path}: setup-cli baseado em runtime externo ainda está presente`);
  }

  const requiredActions = [
    "actions/checkout@v6",
    "actions/setup-node@v6",
    "actions/upload-artifact@v7",
    "actions/github-script@v9",
  ];

  for (const requiredAction of requiredActions) {
    if (!content.includes(requiredAction)) {
      failures.push(`${path}: referência obrigatória ausente ${requiredAction}`);
    }
  }

  const obsoleteActions = [
    "actions/checkout@v4",
    "actions/checkout@v5",
    "actions/setup-node@v4",
    "actions/setup-node@v5",
    "actions/upload-artifact@v4",
    "actions/upload-artifact@v5",
    "actions/upload-artifact@v6",
    "actions/github-script@v7",
    "actions/github-script@v8",
  ];

  for (const obsoleteAction of obsoleteActions) {
    if (content.includes(obsoleteAction)) {
      failures.push(`${path}: referência obsoleta ${obsoleteAction}`);
    }
  }
}

if (!qualityWorkflowFound) {
  failures.push("workflow técnico com Supabase pinado, pgTAP e typecheck não identificado");
}

if (failures.length > 0) {
  console.error("Falhas no contrato B46:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B46 aprovado: workflow técnico determinístico e executado somente por actions Node 24.",
);

await import("./check-supabase-ci-cleanup.mjs");
await import("./check-supabase-ci-log-redaction.mjs");
await import("./check-browser-runtime-smoke-contract.mjs");
