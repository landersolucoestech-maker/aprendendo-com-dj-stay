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
    content.includes("supabase/setup-cli") &&
    content.includes("supabase test db") &&
    content.includes("npm run typecheck");

  if (!isQualityWorkflow) continue;
  qualityWorkflowFound = true;
  console.log(`Workflow técnico identificado: ${path}`);

  if (/version:\s*["']?latest["']?/i.test(content)) {
    failures.push(`${path}: Supabase CLI usa version: latest`);
  }

  for (const obsoleteAction of [
    "actions/checkout@v4",
    "actions/setup-node@v4",
    "actions/upload-artifact@v4",
  ]) {
    if (content.includes(obsoleteAction)) {
      failures.push(`${path}: referência obsoleta ${obsoleteAction}`);
    }
  }
}

if (!qualityWorkflowFound) {
  failures.push("workflow técnico com Supabase, pgTAP e typecheck não identificado");
}

if (failures.length > 0) {
  console.error("Falhas no contrato B46:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B46 aprovado: workflow técnico sem versão flutuante e sem actions oficiais obsoletas.",
);
