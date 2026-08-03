import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803013000_platform_cron_history_retention.sql",
  databaseTest: "supabase/tests/63_platform_cron_history_retention.test.sql",
  parent: "scripts/check-checkout-cron-health.mjs",
  documentation: "docs/refactor/FASE-B94-PLATFORM-CRON-HISTORY-RETENTION.md",
  status: "docs/STATUS.md",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      failures.push(`${label}: conteúdo obrigatório ausente: ${fragment}`);
    }
  }
};

for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B94 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();
  const status = read(paths.status).toLowerCase();

  requireFragments(migration, "Migration B94", [
    "A extensão e os privilégios do pg_cron são instalados pela FASE B92.",
    "private.prune_platform_cron_run_history",
    "session_user <> 'postgres'",
    "PLATFORM_CRON_EXECUTOR_REQUIRED",
    "not between 7 and 365",
    "not between 1 and 10000",
    "run.end_time is not null",
    "expire-due-checkout-intents",
    "prune-platform-cron-run-history",
    "order by run.end_time, run.runid",
    "for update of run skip locked",
    "revoke all on function private.prune_platform_cron_run_history(integer, integer)",
    "from public, anon, authenticated, service_role",
    "'20 3 * * *'",
    "$cron$select private.prune_platform_cron_run_history(30, 5000);$cron$",
  ]);

  for (const forbidden of [
    "create extension if not exists pg_cron",
    "grant usage on schema cron",
    "grant all privileges on all tables in schema cron",
    "public.prune_platform_cron_run_history",
    "grant execute on function private.prune_platform_cron_run_history",
    "net.http_post",
    "vault.decrypted_secrets",
    "SUPABASE_SERVICE_ROLE_KEY",
    "Authorization",
  ]) {
    if (migration.includes(forbidden)) {
      failures.push(`Retenção B94 possui superfície proibida: ${forbidden}`);
    }
  }

  requireFragments(databaseTest, "pgTAP B94", [
    "select plan(36)",
    "service role cannot prune cron history",
    "platform cron retention preserves executions still running",
    "platform cron retention is restricted to named platform jobs",
    "first retention batch respects the requested limit",
    "first retention batch removes the oldest eligible platform run",
    "recent platform history is preserved",
    "old history from an unrelated cron job is preserved",
    "retention batch is idempotent after eligible history is removed",
    "retention window below seven days is rejected",
    "oversized retention batch is rejected",
  ]);

  if (!parent.includes('await import("./check-platform-cron-history-retention.mjs")')) {
    failures.push("B94 não está encadeada no gate bloqueante B93.");
  }

  requireFragments(documentation, "Documentação B94", [
    "cron.job_run_details",
    "30 dias",
    "5.000",
    "execuções em andamento",
    "jobs externos",
    "branch `dev`",
  ]);

  requireFragments(status, "STATUS B94", [
    "retenção do cron",
    "prune-platform-cron-run-history",
    "30 dias",
  ]);
  if (status.includes("definição e validação de uma política auditável de retenção para `cron.job_run_details`")) {
    failures.push("STATUS ainda declara a retenção B94 como dependência externa.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B94 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B94 aprovado: o histórico dos jobs da plataforma possui retenção diária, limitada e inacessível à Data API.",
);
