import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/support.ts",
  tests: "src/contracts/support.test.ts",
  migration: "supabase/migrations/20260801200000_support_ticketing.sql",
  documentation: "docs/refactor/FASE-B63-SUPPORT-CONTRACT-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const migration = read(paths.migration);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "datetime({ offset: true })",
  "/^SUP-[A-F0-9]{16}$/",
  "z.string().trim().min(2).max(5000)",
  "z.string().trim().min(5).max(200)",
  "z.string().trim().min(2).max(80)",
  "supportMessageSchema",
  "supportTicketSchema",
  "supportAdminDashboardSchema",
  "supportMutationResultSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato de suporte ausente: ${fragment}`);
}

for (const fragment of [
  "support_ticket_reference_chk",
  "char_length(btrim(subject)) between 5 and 200",
  "char_length(btrim(category)) between 2 and 80",
  "char_length(btrim(body)) between 2 and 5000",
]) {
  expect(migration.includes(fragment), `Constraint de banco B63 ausente: ${fragment}`);
}

for (const fragment of [
  "REFERENCE_CODE",
  '"SUP-0123456789abcdef"',
  'subject: "abcd"',
  'category: "a"',
  'body: "a".repeat(5001)',
  'created_at: "2026-08-02T06:30:00"',
  'id: "mensagem-invalida"',
  "internal_event_count",
  "provider_payload",
  "supportAdminDashboardSchema",
  "supportMutationResultSchema",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B63 ausente: ${fragment}`);
}

expect(
  tests.includes("supportTicketStatusSchema") &&
    tests.includes("supportTicketPrioritySchema") &&
    tests.includes("supportMessageAuthorRoleSchema"),
  "Suíte B63 deve cobrir todos os enums de suporte.",
);
expect(
  documentation.includes("Fase B63") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B63 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:support-contract-tests"] ===
    "node scripts/check-support-contract-tests.mjs",
  "package.json deve expor check:support-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:support-contract-tests",
  ),
  "Contrato B63 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B63:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B63 aprovado: tickets, mensagens, dashboards e mutações de suporte possuem validação estrita alinhada ao banco e cobertura unitária.",
);
