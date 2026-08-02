import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/student-communication-preferences.ts",
  tests: "src/contracts/student-communication-preferences.test.ts",
  migration:
    "supabase/migrations/20260801230000_student_communication_preferences.sql",
  documentation:
    "docs/refactor/FASE-B66-STUDENT-COMMUNICATION-PREFERENCE-TESTS.md",
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
  "consentVersionSchema",
  "z.string().trim().min(1).max(100).nullable()",
  "datetime({ offset: true })",
  "requiresOptionalConsent",
  "in_app_transactional: z.literal(true)",
  "hasConsentVersion !== hasConsentedAt",
  "consentRequired && (!hasConsentVersion || !hasConsentedAt)",
  "!consentRequired && (hasConsentVersion || hasConsentedAt)",
  "!consentRequired && value.consent_version !== null",
  "studentCommunicationPreferencesSchema",
  "updateStudentCommunicationPreferencesSchema",
  ".strict()",
]) {
  expect(
    contracts.includes(fragment),
    `Contrato de preferências ausente: ${fragment}`,
  );
}

for (const fragment of [
  "student_communication_preferences_consent_pair_check",
  "student_communication_preferences_consent_version_check",
  "CONSENT_VERSION_REQUIRED",
  "case when v_consent_required then v_consent_version else null end",
  "case when v_consent_required then statement_timestamp() else null end",
]) {
  expect(migration.includes(fragment), `Regra persistida B66 ausente: ${fragment}`);
}

for (const fragment of [
  "BASE_PREFERENCES",
  "BASE_UPDATE",
  "CONSENT_VERSION",
  "in_app_transactional: false",
  "rejeita versão sem horário de consentimento",
  "rejeita horário sem versão de consentimento",
  "rejeita marketing sem consentimento",
  "rejeita analytics sem consentimento",
  "rejeita consentimento residual",
  'consent_version: "a".repeat(101)',
  'updated_at: "2026-08-02T06:45:00"',
  "email_product_updates: true",
  "in_app_transactional: true",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B66 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B66") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B66 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:student-communication-preference-tests"] ===
    "node scripts/check-student-communication-preference-tests.mjs",
  "package.json deve expor check:student-communication-preference-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:student-communication-preference-tests",
  ),
  "Contrato B66 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B66:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B66 aprovado: preferências são estritas, consentimento opcional é coerente e a suíte cobre combinações e limites persistidos.",
);
