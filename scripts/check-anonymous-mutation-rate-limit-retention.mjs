import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration:
    "supabase/migrations/20260805030014_anonymous_mutation_rate_limit_retention.sql",
  tests: "supabase/tests/anonymous_mutation_rate_limit_retention.test.sql",
  documentation:
    "docs/refactor/FASE-B144-ANONYMOUS-MUTATION-RATE-LIMIT-RETENTION.md",
  refactorIndex: "docs/refactor/README.md",
  operationalStatus: "docs/STATUS.md",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const migration = read(paths.migration);
const tests = read(paths.tests);
const documentation = read(paths.documentation);
const refactorIndex = read(paths.refactorIndex);
const operationalStatus = read(paths.operationalStatus);

for (const fragment of [
  "create function private.prune_anonymous_mutation_rate_limits",
  "p_delete_limit integer default 5000",
  "returns bigint",
  "security definer",
  "set search_path = ''",
  "session_user <> 'postgres'",
  "SERVICE_ROLE_REQUIRED",
  "p_delete_limit not between 1 and 10000",
  "ANONYMOUS_RATE_LIMIT_PRUNE_LIMIT_INVALID",
  "target.expires_at <= statement_timestamp()",
  "limit p_delete_limit",
  "for update skip locked",
  "get diagnostics v_deleted = row_count",
  "revoke all on function private.prune_anonymous_mutation_rate_limits(integer)",
  "from public, anon, authenticated, service_role",
  "prune-anonymous-mutation-rate-limits",
  "37 * * * *",
  "select private.prune_anonymous_mutation_rate_limits(5000);",
]) {
  expect(migration.includes(fragment), `Migration B144 ausente: ${fragment}`);
}

for (const fragment of [
  "select plan(22)",
  "retention function is SECURITY DEFINER",
  "retention function fixes an empty search_path",
  "requires the postgres session executor",
  "for update skip locked",
  "PUBLIC cannot execute",
  "service_role cannot execute",
  "exactly one retention cron job exists",
  "retention cron runs hourly at minute 37",
  "retention cron executes as postgres",
  "first retention batch deletes only its configured maximum",
  "active counters survive",
  "ANONYMOUS_RATE_LIMIT_PRUNE_LIMIT_INVALID",
  "select * from finish()",
  "rollback",
]) {
  expect(tests.includes(fragment), `Prova pgTAP B144 ausente: ${fragment}`);
}

for (const fragment of [
  "FASE B144",
  "20260805030014",
  "prune-anonymous-mutation-rate-limits",
  "trinta e sete minutos",
  "cinco mil registros",
  "FOR UPDATE SKIP LOCKED",
  "executado como `postgres`",
  "advisor de segurança",
  "Supabase remoto `dev`",
  "produção permaneceu intacta",
]) {
  expect(documentation.includes(fragment), `Documentação B144 ausente: ${fragment}`);
}

for (const fragment of [
  "retenção autônoma dos contadores anônimos expirados",
  "lote limitado",
  "`pg_cron`",
]) {
  expect(refactorIndex.includes(fragment), `Índice B144 ausente: ${fragment}`);
}

for (const fragment of [
  "| Retenção das quotas anônimas |",
  "20260805030014_anonymous_mutation_rate_limit_retention",
  "prune-anonymous-mutation-rate-limits",
  "37 * * * *",
  "A branch `main` e o projeto Supabase de produção não foram promovidos",
]) {
  expect(operationalStatus.includes(fragment), `STATUS B144 ausente: ${fragment}`);
}

if (failures.length > 0) {
  console.error("Falhas no contrato B144:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B144 aprovado: contadores anônimos expirados possuem retenção autônoma, limitada, concorrente e restrita ao executor postgres.",
);
