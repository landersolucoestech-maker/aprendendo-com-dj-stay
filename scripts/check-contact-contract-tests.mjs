import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/contact-messages.ts",
  tests: "src/contracts/contact-messages.test.ts",
  hooks: "src/hooks/useContactMessages.ts",
  schema: "supabase/migrations/20260731061030_contact_messages_schema.sql",
  rpcs: "supabase/migrations/20260731061040_contact_messages_rpcs.sql",
  documentation: "docs/refactor/FASE-B73-CONTACT-CONTRACT-TESTS.md",
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
const hooks = read(paths.hooks);
const migration = `${read(paths.schema)}\n${read(paths.rpcs)}`;
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "contactMessageEventTypeSchema",
  "contactNameSchema",
  "contactEmailSchema",
  "contactSubjectSchema",
  "contactBodySchema",
  "resolutionNoteSchema",
  "validateHandledState",
  "O estado de tratamento da solicitação está incoerente.",
  "contactStatusUpdateInputSchema",
  'z.discriminatedUnion("status"',
  "contactMessageEventSchema",
  "A transição do evento de contato está incoerente.",
  "contactMessageEventsSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B73 ausente: ${fragment}`);
}

for (const fragment of [
  "contact_messages_reference_format_chk",
  "contact_messages_name_chk",
  "contact_messages_email_chk",
  "contact_messages_subject_chk",
  "contact_messages_body_chk",
  "contact_messages_resolution_state_chk",
  "contact_message_event_type",
  "submit_contact_message",
  "get_contact_messages_admin",
  "update_contact_message_status",
  "CONTACT_IDEMPOTENCY_CONFLICT",
  "CONTACT_RESOLUTION_NOTE_REQUIRED",
  "char_length(v_note) not between 3 and 2000",
  "'submitted'::public.contact_message_event_type",
  "'resolved'::public.contact_message_event_type",
  "'marked_spam'::public.contact_message_event_type",
]) {
  expect(migration.includes(fragment), `Constraint/RPC B73 ausente: ${fragment}`);
}

for (const fragment of [
  "normaliza nome, e-mail, assunto e mensagem",
  "aceita submissão persistida e replay idempotente",
  "aceita replay com status administrativo atual",
  "aceita estados new, in_progress, resolved e spam coerentes",
  "rejeita estado aberto com dados de tratamento",
  "rejeita estado final sem operador, timestamp ou nota",
  "aceita dashboard estrito",
  "aceita estados abertos sem nota",
  "aceita estados finais com nota normalizada",
  "rejeita nota ausente no estado final ou residual no estado aberto",
  "aceita resposta aberta e final coerentes",
  "aceita submissão e coleção de eventos",
  "aceita mudança, resolução e spam canônicos",
  "rejeita transições incompatíveis ou sem mudança",
  "rejeita details não objeto, tipo livre e campos extras",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B73 ausente: ${fragment}`);
}

for (const fragment of [
  "contactSubmissionInputSchema",
  "contactSubmissionResultSchema",
  "contactAdminDashboardSchema",
  "contactStatusUpdateInputSchema",
  "contactStatusUpdateResultSchema",
  "alteração do status do contato",
  "p_contact_message_id: value.contactMessageId",
  "p_status: value.status",
  "p_note: value.note",
  "parseDataContract",
]) {
  expect(hooks.includes(fragment), `Consumidor B73 ausente: ${fragment}`);
}

const responseValidationCount = hooks.match(/parseDataContract\(/g)?.length ?? 0;
expect(
  responseValidationCount >= 5,
  `Inputs e respostas de contatos devem permanecer validados; encontrados ${responseValidationCount}.`,
);
expect(
  documentation.includes("Fase B73") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B73 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:contact-contract-tests"] ===
    "node scripts/check-contact-contract-tests.mjs",
  "package.json deve expor check:contact-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:contact-contract-tests"),
  "Contrato B73 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B73:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B73 aprovado: submissão, dashboard, tratamento e eventos de contato possuem validação estrita alinhada ao PostgreSQL e às RPCs.",
);
await import("./check-contact-admin-pagination.mjs");
