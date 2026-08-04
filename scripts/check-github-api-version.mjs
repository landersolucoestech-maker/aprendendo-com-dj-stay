import { readFile } from "node:fs/promises";

const workflowPath = ".github/workflows/baseline.yml";
const workflow = await readFile(workflowPath, "utf8");
const failures = [];

const requiredFragments = [
  'github.request("POST /repos/{owner}/{repo}/issues"',
  'accept: "application/vnd.github+json"',
  '"X-GitHub-Api-Version": "2026-03-10"',
  "title: `Gate técnico — ${context.sha.slice(0,12)}`",
  "${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}",
  "Commit validado:",
  "banco + pgTAP:",
  "TypeScript:",
  "build:",
  "navegador:",
];

for (const fragment of requiredFragments) {
  if (!workflow.includes(fragment)) {
    failures.push(`${workflowPath}: fragmento obrigatório ausente: ${fragment}`);
  }
}

if (workflow.includes("context.repo.name")) {
  failures.push(`${workflowPath}: context.repo.name não existe; use context.repo.repo`);
}

if (workflow.includes("github.rest.issues.create")) {
  failures.push(`${workflowPath}: helper REST implícito voltou a ser usado`);
}

const versionHeaders = workflow.match(/X-GitHub-Api-Version/g) ?? [];
if (versionHeaders.length !== 1) {
  failures.push(
    `${workflowPath}: esperado exatamente um cabeçalho X-GitHub-Api-Version, encontrados ${versionHeaders.length}`,
  );
}

if (failures.length > 0) {
  console.error("Falhas no contrato B48/B118:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B48/B118 aprovado: evidência versionada inclui o estágio de navegador e preserva a URL canônica do run.",
);

await import("./check-gate-evidence-lifecycle.mjs");
