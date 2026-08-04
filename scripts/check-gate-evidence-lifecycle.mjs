import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const workflowPath = ".github/workflows/baseline.yml";
const temporaryReconciliationWorkflowPath =
  ".github/workflows/b50-reconcile-gate-evidence.yml";
const reconciliationDocumentationPath =
  "docs/refactor/FASE-B50-HISTORICAL-GATE-EVIDENCE-RECONCILIATION.md";
const classificationDocumentationPath =
  "docs/refactor/FASE-B51-GATE-EVIDENCE-CLASSIFICATION.md";
const supersededCleanupDocumentationPath =
  "docs/refactor/FASE-B117-SUPERSEDED-GATE-EVIDENCE-CLEANUP.md";
const workflow = await readFile(workflowPath, "utf8");
const failures = [];

const requiredFragments = [
  "const githubApiHeaders = {",
  'accept: "application/vnd.github+json"',
  '"X-GitHub-Api-Version": "2026-03-10"',
  "const gateOutcomes = [",
  "process.env.INSTALL",
  "process.env.LINT",
  "process.env.UNIT",
  "process.env.CLI",
  "process.env.DB",
  "process.env.TYPES",
  "process.env.TYPECHECK",
  "process.env.BUILD",
  "process.env.BROWSER",
  'const gateSucceeded = gateOutcomes.every((outcome) => outcome === "success");',
  'const gateFailed = gateOutcomes.some((outcome) => outcome === "failure");',
  "const gateIncomplete = gateOutcomes.some(",
  'outcome === "cancelled" || outcome === "skipped"',
  "const gateSuperseded = !gateFailed && gateIncomplete;",
  'const evidence = await github.request("POST /repos/{owner}/{repo}/issues"',
  "Supabase CLI:",
  "navegador:",
  "if (gateSucceeded) {",
  "} else if (gateSuperseded) {",
  'await github.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}"',
  "issue_number: evidence.data.number",
  'state: "closed"',
  'state_reason: "completed"',
  'state_reason: "not_planned"',
  "const openGateEvidence = [];",
  "let reachedLastPage = false;",
  "for (let page = 1; page <= 100; page += 1)",
  'github.request("GET /repos/{owner}/{repo}/issues"',
  'state: "open"',
  "per_page: 100",
  "openGateEvidence.push(",
  "issue.pull_request === undefined",
  "if (!reachedLastPage)",
  "const supersededGateEvidence = openGateEvidence.filter(",
  "issue.number < evidence.data.number",
  'issue.title.startsWith("Gate técnico — ")',
  'issue.user?.login === "github-actions[bot]"',
  'issue.body?.includes("Commit validado:")',
  "for (const issue of supersededGateEvidence)",
  "issue_number: issue.number",
  "UNIT: ${{ steps.unit.outcome }}",
  "CLI: ${{ steps.cli.outcome }}",
  "BROWSER: ${{ steps.browser.outcome }}",
  'test "$UNIT" = success',
  'test "$CLI" = success',
  'test "$BROWSER" = success',
];

for (const fragment of requiredFragments) {
  if (!workflow.includes(fragment)) {
    failures.push(`${workflowPath}: fragmento obrigatório ausente: ${fragment}`);
  }
}

const headerUsages = workflow.match(/headers: githubApiHeaders/g) ?? [];
if (headerUsages.length !== 5) {
  failures.push(
    `${workflowPath}: esperado reutilizar githubApiHeaders em cinco requisições, encontrados ${headerUsages.length}`,
  );
}

const successStart = workflow.indexOf("if (gateSucceeded) {");
const supersededStart = workflow.indexOf("} else if (gateSuperseded) {");
const successBlock =
  successStart >= 0 && supersededStart > successStart
    ? workflow.slice(successStart, supersededStart)
    : "";
const supersededBlock =
  supersededStart >= 0 ? workflow.slice(supersededStart) : "";

for (const fragment of [
  "issue_number: evidence.data.number",
  'state_reason: "completed"',
  "const openGateEvidence = [];",
  'github.request("GET /repos/{owner}/{repo}/issues"',
  "issue.number < evidence.data.number",
  'issue.title.startsWith("Gate técnico — ")',
  'issue.user?.login === "github-actions[bot]"',
  'issue.body?.includes("Commit validado:")',
  "issue_number: issue.number",
  'state_reason: "not_planned"',
]) {
  if (!successBlock.includes(fragment)) {
    failures.push(
      `${workflowPath}: reconciliação B117 não está protegida pelo gateSucceeded: ${fragment}`,
    );
  }
}

for (const fragment of [
  "issue_number: evidence.data.number",
  'state_reason: "not_planned"',
]) {
  if (!supersededBlock.includes(fragment)) {
    failures.push(
      `${workflowPath}: execução incompleta não preserva a classificação not_planned: ${fragment}`,
    );
  }
}

if (!workflow.includes("const gateSuperseded = !gateFailed && gateIncomplete;")) {
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
  supersededCleanupDocumentationPath,
]) {
  if (!existsSync(documentationPath)) {
    failures.push(`${documentationPath}: documentação permanente ausente`);
  }
}

if (failures.length > 0) {
  console.error("Falhas nos contratos B49/B50/B51/B117/B118:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contratos B49/B50/B51/B117/B118 aprovados: evidências incluem navegador, verdes reconciliam falhas antigas e qualquer estágio bloqueante permanece rastreável.",
);
