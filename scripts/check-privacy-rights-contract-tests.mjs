import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/privacy-rights-requests.ts",
  tests: "src/contracts/privacy-rights-requests.test.ts",
  migration: "supabase/migrations/20260802000000_privacy_rights_requests.sql",
  documentation: "docs/refactor/FASE-B67-PRIVACY-RIGHTS-CONTRACT-TESTS.md",
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
  "privacyDescriptionSchema",
  "z.string().trim().min(10).max(4000)",
  "privacyNotesSchema",
  "z.string().trim().min(1).max(4000).nullable()",
  "datetime({ offset: true })",
  "value.action === \"created\"",
  "value.action === \"cancelled\"",
  "value.action === \"status_changed\"",
  "value.from_status === value.to_status",
  "isHandled !== hasHandledAt",
  "value.handled_by !== undefined",
  "value.status === \"rejected\" && value.admin_notes === null",
  "privacyRightsRequestEventSchema",
  "privacyRightsRequestSchema",
  "privacyRightsRequestListSchema",
  "createPrivacyRightsRequestSchema",
  "adminUpdatePrivacyRightsRequestSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B67 ausente: ${fragment}`);
}

for (const fragment of [
  "privacy_rights_requests_description_check",
  "length(btrim(description)) between 10 and 4000",
  "privacy_rights_requests_admin_notes_check",
  "privacy_rights_requests_handling_pair_check",
  "privacy_rights_request_events_action_check",
  "privacy_rights_request_events_notes_check",
  "ADMIN_NOTES_REQUIRED",
  "PRIVACY_REQUEST_TRANSITION_INVALID",
  "PRIVACY_REQUEST_ALREADY_FINAL",
]) {
  expect(migration.includes(fragment), `Regra persistida B67 ausente: ${fragment}`);
}

for (const fragment of [
  "CREATED_EVENT",
  "STUDENT_REQUEST",
  "ADMIN_COMPLETED_REQUEST",
  "aceita retorno de mutação e fornece eventos vazios",
  "rejeita evento de criação com transição inválida",
  "rejeita cancelamento fora de submitted para cancelled",
  "rejeita mudança sem origem, destino ou alteração real",
  'notes: "a".repeat(4001)',
  'created_at: "2026-08-02T06:45:00"',
  "rejeita status final sem horário de tratamento",
  "rejeita status não final com horário de tratamento",
  "rejeita responsável e horário divergentes",
  "rejeita solicitação rejeitada sem justificativa",
  'description: "a".repeat(4001)',
  "internal_payload",
  "total: 0.5",
  "Identidade não confirmada.",
  'status: "submitted"',
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B67 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B67") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B67 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:privacy-rights-contract-tests"] ===
    "node scripts/check-privacy-rights-contract-tests.mjs",
  "package.json deve expor check:privacy-rights-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:privacy-rights-contract-tests",
  ),
  "Contrato B67 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B67:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B67 aprovado: solicitações, eventos, listas e mutações de privacidade são estritos, coerentes e cobertos por testes unitários.",
);
