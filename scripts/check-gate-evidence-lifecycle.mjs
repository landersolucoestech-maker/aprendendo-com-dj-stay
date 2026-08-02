import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const workflowPath = ".github/workflows/baseline.yml";
const temporaryReconciliationWorkflowPath =
  ".github/workflows/b50-reconcile-gate-evidence.yml";
const reconciliationDocumentationPath =
  "docs/refactor/FASE-B50-HISTORICAL-GATE-EVIDENCE-RECONCILIATION.md";
const workflow = await readFile(workflowPath, "utf8");
const failures = [];

const requiredFragments = [
  "const githubApiHeaders = {",
  'accept: "application/vnd.github+json"',
  '"X-GitHub-Api-Version": "2026-03-10"',
  "const gateOutcomes = [",
  "process.env.INSTALL",
  "process.env.LINT",
  "process.env.DB",
  "process.env.TYPES",
  "process.env.TYPECHECK",
  "process.env.BUILD",
  'const gateSucceeded = gateOutcomes.every((outcome) => outcome === "success");',
  'const evidence = await github.request("POST /repos/{owner}/{repo}/issues"',
  "if (gateSucceeded) {",
  'await github.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}"',
  "issue_number: evidence.data.number",
  'state: "closed"',
  'state_reason: "completed"',
];

for (const fragment of requiredFragments) {
  if (!workflow.includes(fragment)) {
    failures.push(`${workflowPath}: fragmento obrigatório ausente: ${fragment}`);
  }
}

const headerUsages = workflow.match(/headers: githubApiHeaders/g) ?? [];
if (headerUsages.length !== 2) {
  failures.push(
    `${workflowPath}: esperado reutilizar githubApiHeaders em duas requisições, encontrados ${headerUsages.length}`,
  );
}

const conditionalClosePattern = /if \(gateSucceeded\) \{\s*await github\.request\("PATCH \/repos\/\{owner\}\/\{repo\}\/issues\/\{issue_number\}"[\s\S]*?state: "closed"[\s\S]*?state_reason: "completed"[\s\S]*?\}\);\s*\}/;
if (!conditionalClosePattern.test(workflow)) {
  failures.push(
    `${workflowPath}: o encerramento da evidência verde não está protegido pelo gateSucceeded`,
  );
}

if (existsSync(temporaryReconciliationWorkflowPath)) {
  failures.push(
    `${temporaryReconciliationWorkflowPath}: workflow temporário B50 não foi removido`,
  );
}

if (!existsSync(reconciliationDocumentationPath)) {
  failures.push(
    `${reconciliationDocumentationPath}: documentação permanente da B50 ausente`,
  );
}

if (failures.length > 0) {
  console.error("Falhas nos contratos B49/B50:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contratos B49/B50 aprovados: evidências verdes são encerradas automaticamente, evidências não verdes permanecem abertas e o workflow temporário de reconciliação está ausente.",
);
