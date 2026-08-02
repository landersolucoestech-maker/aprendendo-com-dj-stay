import { readFile } from "node:fs/promises";

const migrationPath =
  "supabase/migrations/20260801233000_support_foreign_key_indexes.sql";
const testPath = "supabase/tests/55_support_foreign_key_indexes.test.sql";
const docsPath =
  "docs/refactor/FASE-B43-SUPPORT-FOREIGN-KEY-INDEXES.md";

const [migration, test, docs] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(testPath, "utf8"),
  readFile(docsPath, "utf8"),
]);

const assertions = [
  [
    migration.includes("support_ticket_messages_author_user_idx") &&
      migration.includes("(author_user_id)"),
    "índice de author_user_id ausente",
  ],
  [
    migration.includes("support_ticket_events_actor_user_idx") &&
      migration.includes("(actor_user_id)"),
    "índice de actor_user_id ausente",
  ],
  [
    migration.includes("where author_user_id is not null") &&
      migration.includes("where actor_user_id is not null"),
    "índices parciais ausentes",
  ],
  [test.includes("select plan(6)"), "plano pgTAP B43 inválido"],
  [
    docs.includes("não existe carga representativa"),
    "decisão sobre índices não usados não documentada",
  ],
];

const failures = assertions.filter(([passed]) => !passed).map(([, message]) => message);

if (failures.length > 0) {
  console.error("Falhas no contrato B43:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "Contrato B43 aprovado: chaves estrangeiras do suporte possuem índices de cobertura.",
);
