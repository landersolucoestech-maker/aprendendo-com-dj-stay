import { existsSync, readFileSync } from "node:fs";

const migrationPath =
  "supabase/migrations/20260801030000_database_advisor_hardening.sql";
const testPath = "supabase/tests/45_database_advisor_hardening.test.sql";
const contactSchemaTestPath =
  "supabase/tests/41_contact_messages_schema.test.sql";
const documentationPath =
  "docs/refactor/FASE-B30-DATABASE-ADVISOR-HARDENING.md";
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of [
  migrationPath,
  testPath,
  contactSchemaTestPath,
  documentationPath,
]) {
  expect(existsSync(path), `${path} deve existir.`);
}

if (existsSync(migrationPath)) {
  const migration = readFileSync(migrationPath, "utf8");

  for (const policy of [
    "certificates_select",
    "certificate_events_select",
    "contact_messages_direct_access_denied",
    "contact_message_events_direct_access_denied",
  ]) {
    expect(
      migration.includes(`create policy ${policy}`),
      `Migração B30 deve criar a policy ${policy}.`,
    );
  }

  expect(
    migration.includes("(select private.current_user_role())"),
    "Políticas de certificados devem cachear o papel atual por subconsulta escalar.",
  );
  expect(
    migration.includes("(select auth.uid())"),
    "Políticas de certificados devem cachear auth.uid por subconsulta escalar.",
  );
  expect(
    (migration.match(/as restrictive/g) ?? []).length === 2,
    "Domínio de contato deve possuir exatamente duas policies RESTRICTIVE.",
  );
  expect(
    (migration.match(/using \(false\)/g) ?? []).length === 2,
    "Policies de contato devem negar acesso por USING false.",
  );
  expect(
    (migration.match(/with check \(false\)/g) ?? []).length === 2,
    "Policies de contato devem negar escrita por WITH CHECK false.",
  );
  expect(
    migration.includes(
      "revoke all on public.contact_messages from public, anon, authenticated;",
    ),
    "Migração deve revogar privilégios diretos de contact_messages.",
  );
  expect(
    migration.includes(
      "revoke all on public.contact_message_events from public, anon, authenticated;",
    ),
    "Migração deve revogar privilégios diretos de contact_message_events.",
  );
  expect(
    !/drop\s+index/i.test(migration),
    "B30 não pode remover índices sem evidência de workload.",
  );
  expect(
    !/grant\s+(?:select|insert|update|delete|all).*contact_(?:messages|message_events)/i.test(
      migration,
    ),
    "B30 não pode conceder acesso direto às tabelas de contato.",
  );
}

if (existsSync(testPath)) {
  const tests = readFileSync(testPath, "utf8");
  for (const marker of [
    "SELECT[[:space:]]+private\\.current_user_role\\(\\)",
    "SELECT[[:space:]]+auth\\.uid\\(\\)",
    "permissive = 'RESTRICTIVE'",
    "qual = 'false'",
    "with_check = 'false'",
    "owner_role.rolbypassrls",
    "function_record.prosecdef and owner_role.rolbypassrls",
  ]) {
    expect(
      tests.includes(marker),
      `Teste B30 deve verificar ${marker}.`,
    );
  }
}

if (existsSync(contactSchemaTestPath)) {
  const contactTests = readFileSync(contactSchemaTestPath, "utf8");
  expect(
    contactTests.includes(
      "contact tables expose two explicit restrictive deny policies",
    ),
    "Contrato estrutural de contatos deve exigir policies restritivas explícitas.",
  );
  expect(
    contactTests.includes("client roles have no direct contact table grants"),
    "Contrato estrutural de contatos deve preservar zero grants diretos.",
  );
}

if (failures.length > 0) {
  console.error("Contrato B30 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato estático da FASE B30 aprovado: RLS otimizada, contato isolado e índices preservados.",
);
