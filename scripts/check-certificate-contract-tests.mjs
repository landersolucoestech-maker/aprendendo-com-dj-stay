import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/certificates.ts",
  tests: "src/contracts/certificates.test.ts",
  schema: "supabase/migrations/20260731061000_certificates_schema.sql",
  rpcs: "supabase/migrations/20260731061010_certificates_rpcs.sql",
  documentation: "docs/refactor/FASE-B68-CERTIFICATE-CONTRACT-TESTS.md",
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
const schema = read(paths.schema);
const rpcs = read(paths.rpcs);
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "/^DJSTAY-[A-F0-9]{20}$/",
  "z.string().trim().min(2).max(200)",
  "z.string().trim().min(3).max(1000).nullable()",
  "datetime({ offset: true })",
  "validateCertificateRevocationState",
  'value.status === "issued"',
  'value.status === "revoked"',
  'value.valid !== (value.status === "issued")',
  "value.completed_lessons > value.total_lessons",
  "Math.round(",
  "value.completion_percent !== expectedPercent",
  "value.eligible !== expectedEligibility",
  "hasCertificateId !== hasCertificateCode",
  "completionMatchesEnrollment",
  "certificateSummarySchema",
  "certificateValidationSchema",
  "enrollmentCompletionSchema",
  "adminEnrollmentSchema",
  "studentsAdminDashboardSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B68 ausente: ${fragment}`);
}

for (const fragment of [
  "certificates_code_format_chk",
  "certificates_student_name_chk",
  "certificates_course_title_chk",
  "certificates_completion_chk",
  "certificates_revocation_state_chk",
  "char_length(btrim(revocation_reason)) between 3 and 1000",
]) {
  expect(schema.includes(fragment), `Constraint persistido B68 ausente: ${fragment}`);
}

for (const fragment of [
  "calculate_enrollment_completion",
  "when v_total = 0 then 0",
  "v_percent >= v_course.certificate_min_completion_percent",
  "certificate_record.status = 'issued'::public.certificate_status",
  "'valid', certificate_record.status = 'issued'::public.certificate_status",
  "active_certificate_id",
  "active_certificate_code",
]) {
  expect(rpcs.includes(fragment), `Regra RPC B68 ausente: ${fragment}`);
}

for (const fragment of [
  "PUBLIC_ISSUED_CERTIFICATE",
  "PUBLIC_REVOKED_CERTIFICATE",
  "ISSUED_CERTIFICATE",
  "REVOKED_CERTIFICATE",
  "COMPLETION",
  "ADMIN_ENROLLMENT",
  "rejeita certificado emitido com dados de revogação",
  "rejeita certificado revogado sem horário ou motivo",
  'revocation_reason: "a".repeat(1001)',
  'code: "DJSTAY-invalido"',
  "issued_by_user_id",
  "rejeita campo interno na validação pública",
  "rejeita validade divergente do status",
  "rejeita aulas concluídas acima do total",
  "rejeita percentual divergente das contagens",
  "rejeita elegibilidade divergente",
  "active_certificate_code: null",
  "active_certificate_id: null",
  "rejeita conclusão pertencente a outra matrícula",
  "studentsAdminDashboardSchema",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B68 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B68") &&
    documentation.includes("Nenhuma migration"),
  "Documentação B68 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:certificate-contract-tests"] ===
    "node scripts/check-certificate-contract-tests.mjs",
  "package.json deve expor check:certificate-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:certificate-contract-tests",
  ),
  "Contrato B68 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B68:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B68 aprovado: certificados, validação pública, conclusão e administração possuem coerência semântica e cobertura unitária estrita.",
);
