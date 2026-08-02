import { existsSync, readFileSync } from "node:fs";

const workflowPath = ".github/workflows/baseline.yml";
const documentationPath = "docs/refactor/FASE-B59-SUPABASE-CI-CLEANUP.md";
const ciContractPath = "scripts/check-ci-determinism.mjs";
const failures = [];

for (const path of [workflowPath, documentationPath, ciContractPath]) {
  if (!existsSync(path)) failures.push(`Arquivo obrigatório ausente: ${path}`);
}

if (failures.length === 0) {
  const workflow = readFileSync(workflowPath, "utf8");
  const ciContract = readFileSync(ciContractPath, "utf8");
  const cleanupCommand =
    'npx --yes "supabase@${SUPABASE_CLI_VERSION}" stop --no-backup || true';
  const startCommand =
    'npx --yes "supabase@${SUPABASE_CLI_VERSION}" start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor';
  const resetCommand =
    'npx --yes "supabase@${SUPABASE_CLI_VERSION}" db reset --local --no-seed';
  const testCommand =
    'npx --yes "supabase@${SUPABASE_CLI_VERSION}" test db';

  const cleanupOccurrences = workflow.split(cleanupCommand).length - 1;
  if (cleanupOccurrences < 2) {
    failures.push(
      `${workflowPath}: limpeza local deve ocorrer antes da inicialização e após a geração de tipos`,
    );
  }

  const preCleanupIndex = workflow.indexOf(cleanupCommand);
  const startIndex = workflow.indexOf(startCommand);
  if (preCleanupIndex < 0 || startIndex < 0 || preCleanupIndex > startIndex) {
    failures.push(
      `${workflowPath}: supabase stop --no-backup deve preceder supabase start`,
    );
  }

  const typesIndex = workflow.indexOf("- name: Gerar e sincronizar tipos");
  const finalCleanupIndex = workflow.indexOf("- name: Limpar Supabase local");
  const typecheckIndex = workflow.indexOf("- name: Typecheck");
  if (
    typesIndex < 0 ||
    finalCleanupIndex < 0 ||
    typecheckIndex < 0 ||
    !(typesIndex < finalCleanupIndex && finalCleanupIndex < typecheckIndex)
  ) {
    failures.push(
      `${workflowPath}: limpeza final deve ocorrer depois dos tipos e antes do Typecheck`,
    );
  }

  for (const fragment of [
    "- name: Limpar Supabase local",
    "if: always() && steps.cli.outcome == 'success'",
    "continue-on-error: true",
    cleanupCommand,
    startCommand,
    resetCommand,
    testCommand,
  ]) {
    if (!workflow.includes(fragment)) {
      failures.push(`${workflowPath}: fragmento obrigatório ausente: ${fragment}`);
    }
  }

  for (const command of [startCommand, resetCommand, testCommand]) {
    const line = workflow
      .split("\n")
      .find((candidate) => candidate.includes(command));
    if (!line || line.includes("|| true")) {
      failures.push(`${workflowPath}: comando bloqueante foi mascarado: ${command}`);
    }
  }

  for (const prohibited of [
    "supabase stop --all",
    "--linked",
    "docker rm",
    "docker system prune",
    "docker volume prune",
  ]) {
    if (workflow.includes(prohibited)) {
      failures.push(`${workflowPath}: limpeza destrutiva ou remota proibida: ${prohibited}`);
    }
  }

  if (
    !ciContract.includes('await import("./check-supabase-ci-cleanup.mjs");')
  ) {
    failures.push(`${ciContractPath}: contrato B59 não está encadeado ao B46`);
  }
}

if (failures.length > 0) {
  console.error("Falhas no contrato B59:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B59 aprovado: o CI limpa a stack Supabase local antes e depois dos testes sem mascarar start, reset ou pgTAP.",
);
