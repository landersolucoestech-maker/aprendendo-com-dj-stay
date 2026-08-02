import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803003000_checkout_expiration_cron.sql",
  databaseTest: "supabase/tests/61_checkout_expiration_cron.test.sql",
  parent: "scripts/check-checkout-expiration.mjs",
  documentation: "docs/refactor/FASE-B92-CHECKOUT-EXPIRATION-CRON.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B92 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();
  const status = read(paths.status);

  requireFragments(migration, "Migration B92", [
    "create extension if not exists pg_cron with schema pg_catalog",
    "revoke all on schema cron from public, anon, authenticated, service_role",
    "grant usage on schema cron to postgres",
    "private.assert_checkout_expiration_executor",
    "session_user = 'postgres'",
    "private.assert_checkout_service_role()",
    "private.expire_due_checkout_intents",
    "cron.unschedule",
    "cron.schedule",
    "'expire-due-checkout-intents'",
    "'*/5 * * * *'",
    "$cron$select private.expire_due_checkout_intents(100);$cron$",
  ]);

  for (const forbidden of [
    "net.http_post",
    "vault.decrypted_secrets",
    "CRON_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    "Authorization",
  ]) {
    if (migration.includes(forbidden)) {
      failures.push(`Agendamento B92 possui dependência externa proibida: ${forbidden}`);
    }
  }

  requireFragments(databaseTest, "pgTAP B92", [
    "select plan(27)",
    "pg_cron extension is enabled",
    "service role cannot manage cron jobs",
    "exactly one named checkout expiration job exists",
    "checkout expiration runs every five minutes",
    "checkout expiration job runs as postgres",
    "checkout expiration job calls only the private bounded batch",
    "postgres can execute the same bounded batch used by cron",
    "cron batch is idempotent after reconciliation",
  ]);

  if (!parent.includes('await import("./check-checkout-expiration-cron.mjs")')) {
    failures.push("B92 não está encadeada no gate bloqueante B91.");
  }

  requireFragments(documentation, "Documentação B92", [
    "pg_cron",
    "a cada cinco minutos",
    "username = 'postgres'",
    "sem requisição http",
    "cron.job_run_details",
    "branch `dev`",
  ]);
  if (!status.includes("Cron de expiração")) {
    failures.push("STATUS não registra a B92.");
  }
  if (status.includes("agendamento do batch de expiração por um executor confiável")) {
    failures.push("STATUS ainda declara o agendamento B92 como pendência externa.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B92 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B92 aprovado: a expiração de checkout possui job PostgreSQL único, limitado e inacessível à Data API.",
);
