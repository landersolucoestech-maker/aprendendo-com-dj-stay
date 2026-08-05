import { existsSync, readFileSync } from "node:fs";

const paths = {
  rateLimitMigration:
    "supabase/migrations/20260805022138_anonymous_mutation_rate_limiting.sql",
  rlsMigration:
    "supabase/migrations/20260805022356_anonymous_mutation_rate_limit_rls_policies.sql",
  databaseTests: "supabase/tests/anonymous_mutation_rate_limiting.test.sql",
  errorMessages: "src/lib/error-message.ts",
  errorMessageTests: "src/lib/error-message.test.ts",
  documentation:
    "docs/refactor/FASE-B143-ANONYMOUS-MUTATION-RATE-LIMITING.md",
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

const migration = read(paths.rateLimitMigration);
const rlsMigration = read(paths.rlsMigration);
const tests = read(paths.databaseTests);
const errorMessages = read(paths.errorMessages);
const errorMessageTests = read(paths.errorMessageTests);
const documentation = read(paths.documentation);
const refactorIndex = read(paths.refactorIndex);
const operationalStatus = read(paths.operationalStatus);

for (const fragment of [
  "private.anonymous_mutation_rate_limit_secret",
  "private.anonymous_mutation_rate_limits",
  "extensions.gen_random_bytes(32)",
  "extensions.hmac",
  "current_setting('request.method', true)",
  "current_setting('request.headers', true)",
  "x-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
  "pg_catalog.date_bin",
  "pg_catalog.pg_advisory_xact_lock",
  "limit 100",
  "RATE_LIMITED",
  "RATE_LIMIT_CONTEXT_REQUIRED",
  "RATE_LIMIT_CONTEXT_INVALID",
  "'contact_submission'",
  "5,",
  "interval '15 minutes'",
  "'affiliate_click'",
  "120,",
  "interval '10 minutes'",
  "contact_messages_anonymous_rate_limit",
  "affiliate_clicks_anonymous_rate_limit",
  "auth.jwt() ->> 'role'",
  "service_role",
  "revoke all on table",
  "revoke all on function",
]) {
  expect(migration.includes(fragment), `Migration B143 ausente: ${fragment}`);
}

for (const fragment of [
  "anonymous_mutation_rate_limit_secret_deny_unprivileged",
  "anonymous_mutation_rate_limits_deny_unprivileged",
  "to anon, authenticated",
  "using (false)",
  "with check (false)",
]) {
  expect(rlsMigration.includes(fragment), `Política B143 ausente: ${fragment}`);
}

for (const fragment of [
  "select plan(20)",
  "set local role anon",
  "for v_index in 1..5 loop",
  "RATE_LIMITED",
  "RATE_LIMIT_CONTEXT_REQUIRED",
  "origem diferente mantém sua própria janela",
  "service_role",
  "32-byte HMAC",
  "raw IP addresses are never persisted",
  "select * from finish()",
  "rollback",
]) {
  expect(tests.includes(fragment), `Prova pgTAP B143 ausente: ${fragment}`);
}

for (const fragment of [
  "PUBLIC_DATABASE_ERROR_MESSAGES",
  '"RATE_LIMITED"',
  '"RATE_LIMIT_CONTEXT_REQUIRED"',
  '"RATE_LIMIT_CONTEXT_INVALID"',
  "Muitas tentativas em pouco tempo",
  "Não foi possível validar a origem da solicitação",
  '"message" in error',
]) {
  expect(errorMessages.includes(fragment), `Mapeamento público B143 ausente: ${fragment}`);
}

for (const fragment of [
  "mapeia erro público de quota sem expor o token técnico",
  "não expõe mensagem de objeto estruturado desconhecido",
  "expect(message).not.toContain(\"RATE_LIMIT\")",
]) {
  expect(errorMessageTests.includes(fragment), `Teste frontend B143 ausente: ${fragment}`);
}

for (const fragment of [
  "FASE B143",
  "20260805022138",
  "20260805022356",
  "cinco submissões em quinze minutos",
  "cento e vinte cliques em dez minutos",
  "HMAC-SHA256",
  "nenhum endereço IP bruto",
  "advisor de segurança",
  "Supabase remoto `dev`",
  "produção permaneceu intacta",
]) {
  expect(documentation.includes(fragment), `Documentação B143 ausente: ${fragment}`);
}

for (const fragment of [
  "limitação das mutações anônimas de contato e afiliado",
  "origem pseudonimizada",
  "mensagens públicas sanitizadas",
]) {
  expect(refactorIndex.includes(fragment), `Índice B143 ausente: ${fragment}`);
}

for (const fragment of [
  "| Mutações anônimas |",
  "20260805022138_anonymous_mutation_rate_limiting",
  "20260805022356_anonymous_mutation_rate_limit_rls_policies",
  "HMAC-SHA256",
  "A branch `main` e o projeto Supabase de produção não foram promovidos",
]) {
  expect(operationalStatus.includes(fragment), `STATUS B143 ausente: ${fragment}`);
}

if (failures.length > 0) {
  console.error("Falhas no contrato B143:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B143 aprovado: mutações anônimas possuem quota por origem pseudonimizada, estado privado, falha fechada e mensagens públicas sanitizadas.",
);
