import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const workflowPath = ".github/workflows/baseline.yml";
const temporaryReconciliationWorkflowPath =
  ".github/workflows/b50-reconcile-gate-evidence.yml";
const reconciliationDocumentationPath =
  "docs/refactor/FASE-B50-HISTORICAL-GATE-EVIDENCE-RECONCILIATION.md";
const classificationDocumentationPath =
  "docs/refactor/FASE-B51-GATE-EVIDENCE-CLASSIFICATION.md";
const workflow = await readFile(workflowPath, "utf8");
const failures = [];

const requiredFragments = [
  "const githubApiHeaders = {",
  'accept: "application/vnd.github+json"',
  '"X-GitHub-Api-Version": "2026-03-10"',
  "const gateOutcomes = [",
  "process.env.INSTALL",
  "process.env.LINT",
  "process.env.CLI",
  "process.env.DB",
  "process.env.TYPES",
  "process.env.TYPECHECK",
  "process.env.BUILD",
  'const gateSucceeded = gateOutcomes.every((outcome) => outcome === "success");',
  'const gateFailed = gateOutcomes.some((outcome) => outcome === "failure");',
  "const gateIncomplete = gateOutcomes.some(",
  'outcome === "cancelled" || outcome === "skipped"',
  "const gateSuperseded = !gateFailed && gateIncomplete;",
  'const evidence = await github.request("POST /repos/{owner}/{repo}/issues"',
  "Supabase CLI:",
  "if (gateSucceeded) {",
  "} else if (gateSuperseded) {",
  'await github.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}"',
  "issue_number: evidence.data.number",
  'state: "closed"',
  'state_reason: "completed"',
  'state_reason: "not_planned"',
  "CLI: ${{ steps.cli.outcome }}",
  'test "$CLI" = success',
];

for (const fragment of requiredFragments) {
  if (!workflow.includes(fragment)) {
    failures.push(`${workflowPath}: fragmento obrigatório ausente: ${fragment}`);
  }
}

const headerUsages = workflow.match(/headers: githubApiHeaders/g) ?? [];
if (headerUsages.length !== 3) {
  failures.push(
    `${workflowPath}: esperado reutilizar githubApiHeaders em três requisições, encontrados ${headerUsages.length}`,
  );
}

const completedClosePattern = /if \(gateSucceeded\) \{\s*await github\.request\("PATCH \/repos\/\{owner\}\/\{repo\}\/issues\/\{issue_number\}"[\s\S]*?state: "closed"[\s\S]*?state_reason: "completed"[\s\S]*?\}\);\s*\} else if \(gateSuperseded\) \{/;
if (!completedClosePattern.test(workflow)) {
  failures.push(
    `${workflowPath}: o encerramento completed não está protegido exclusivamente pelo gateSucceeded`,
  );
}

const supersededClosePattern = /else if \(gateSuperseded\) \{\s*await github\.request\("PATCH \/repos\/\{owner\}\/\{repo\}\/issues\/\{issue_number\}"[\s\S]*?state: "closed"[\s\S]*?state_reason: "not_planned"[\s\S]*?\}\);\s*\}/;
if (!supersededClosePattern.test(workflow)) {
  failures.push(
    `${workflowPath}: execução incompleta sem failure não é encerrada como not_planned`,
  );
}

const failureMustRemainOpenPattern = /const gateSuperseded = !gateFailed && gateIncomplete;/;
if (!failureMustRemainOpenPattern.test(workflow)) {
  failures.push(
    `${workflowPath}: gateSuperseded deve excluir explicitamente qualquer execução com failure`,
  );
}

if (existsSync(temporaryReconciliationWorkflowPath)) {
  failures.push(
    `${temporaryReconciliationWorkflowPath}: workflow temporário B50 não foi removido`,
  );
}

for (const documentationPath of [
  reconciliationDocumentationPath,
  classificationDocumentationPath,
]) {
  if (!existsSync(documentationPath)) {
    failures.push(`${documentationPath}: documentação permanente ausente`);
  }
}

if (failures.length > 0) {
  console.error("Falhas nos contratos B49/B50/B51:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contratos B49/B50/B51 aprovados: verdes são completed, falhas permanecem abertas, execuções incompletas sem failure são not_planned e o workflow temporário B50 está ausente.",
);
