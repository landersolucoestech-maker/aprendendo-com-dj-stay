import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/course-access.ts",
  tests: "src/contracts/course-access.test.ts",
  hook: "src/hooks/useCourseAccess.ts",
  schema: "supabase/migrations/20260730200000_course_access_schema.sql",
  rpcs: "supabase/migrations/20260730200100_course_access_rpcs.sql",
  documentation: "docs/refactor/FASE-B76-COURSE-ACCESS-CONTRACT-TESTS.md",
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
const hook = read(paths.hook);
const database = `${read(paths.schema)}\n${read(paths.rpcs)}`;
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "enrollmentEventTypeSchema",
  "validateEnrollmentContract",
  "A expiração deve ocorrer após o início do acesso.",
  "Matrícula de compra exige referência de origem.",
  "Compra ativa exige confirmação de pagamento.",
  "Matrícula manual não pode permanecer pendente.",
  "enrollmentRowSchema",
  "Matrícula manual exige concedente e não pode carregar dados de compra.",
  "Matrícula de compra não possui concedente manual.",
  "O lifecycle da matrícula está incoerente.",
  "enrollmentEventSchema",
  "getActiveEnrollments",
  'enrollment.status === "active"',
  'enrollment.courses.status === "published"',
  "startsAt <= now",
  "expiresAt === null || expiresAt > now",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B76 ausente: ${fragment}`);
}

for (const fragment of [
  "courses_title_length",
  "courses_slug_format",
  "enrollments_time_window",
  "enrollments_reference_length",
  "enrollments_reason_length",
  "enrollments_purchase_contract",
  "enrollments_active_purchase_confirmed",
  "enrollments_manual_is_not_pending",
  "enrollment_event_type",
  "grant_course_enrollment",
  "confirm_course_purchase",
  "renew_course_enrollment",
  "suspend_course_enrollment",
  "revoke_course_enrollment",
  "INVALID_ACCESS_WINDOW",
  "INVALID_PAYMENT_REFERENCE",
  "REVOKED_ENROLLMENT_CANNOT_RENEW",
  "REVOKED_ENROLLMENT_CANNOT_SUSPEND",
]) {
  expect(database.includes(fragment), `Constraint/RPC B76 ausente: ${fragment}`);
}

for (const fragment of [
  "aceita curso resumido estrito",
  "rejeita slug inválido, título longo, UUID e campos extras",
  "aceita compra ativa confirmada e coleção",
  "aceita compra pendente com referência e sem confirmação",
  "aceita matrícula manual ativa sem dados de compra",
  "rejeita compra sem referência",
  "rejeita compra ativa sem confirmação de pagamento",
  "rejeita matrícula manual pendente",
  "rejeita expiração anterior ou igual ao início",
  "rejeita referência e motivo fora dos limites",
  "aceita matrícula manual ativa completa e coleção",
  "rejeita matrícula manual sem concedente ou com dados de compra",
  "aceita suspensão e revogação coerentes",
  "rejeita estados finais sem timestamp ou motivo",
  "aceita evento canônico e coleção",
  "retorna apenas matrícula ativa, publicada e dentro da janela",
  "considera o início inclusivo e a expiração exclusiva",
  "vi.setSystemTime",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B76 ausente: ${fragment}`);
}

for (const fragment of [
  "enrollmentsWithCourseSchema",
  "parseDataContract",
  'from("enrollments")',
  'eq("user_id", user.id)',
  'export { getActiveEnrollments } from "@/contracts/course-access";',
]) {
  expect(hook.includes(fragment), `Consumidor B76 ausente: ${fragment}`);
}

expect(
  documentation.includes("Fase B76") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B76 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:course-access-contract-tests"] ===
    "node scripts/check-course-access-contract-tests.mjs",
  "package.json deve expor check:course-access-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes(
    "npm run check:course-access-contract-tests",
  ),
  "Contrato B76 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B76:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B76 aprovado: matrícula, origem, pagamento, janela e acesso ativo possuem validação estrita alinhada ao PostgreSQL e ao consumidor real.",
);
