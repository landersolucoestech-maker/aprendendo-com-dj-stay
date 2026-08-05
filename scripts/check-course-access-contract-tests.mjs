import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/course-access.ts",
  tests: "src/contracts/course-access.test.ts",
  boundaryTests: "src/contracts/course-access-boundaries.test.ts",
  pureFilterTests: "src/contracts/course-access-pure-filter.test.ts",
  studentAccessContract: "src/contracts/student-course-access.ts",
  studentAccessHook: "src/hooks/useStudentCourseAccess.ts",
  studentDetailContract: "src/contracts/student-course-detail-access.ts",
  studentDetailHook: "src/hooks/useStudentCourseDetailAccess.ts",
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
expect(
  !existsSync("src/hooks/useCourseAccess.ts"),
  "O hook legado useCourseAccess deve permanecer removido; os consumidores atuais usam read models do servidor.",
);

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const boundaryTests = read(paths.boundaryTests);
const pureFilterTests = read(paths.pureFilterTests);
const studentAccessContract = read(paths.studentAccessContract);
const studentAccessHook = read(paths.studentAccessHook);
const studentDetailContract = read(paths.studentDetailContract);
const studentDetailHook = read(paths.studentDetailHook);
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
  "now = Date.now()",
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
  "getActiveEnrollments",
  "vi.setSystemTime",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B76 ausente: ${fragment}`);
}
expect(
  !tests.includes("@/hooks/useCourseAccess"),
  "A suíte B76 não pode importar o hook legado nem inicializar o cliente Supabase.",
);
expect(
  tests.includes("@/contracts/course-access"),
  "A suíte B76 deve importar o filtro puro diretamente dos contratos.",
);

for (const fragment of [
  "aceita referências com 8 e 200 caracteres",
  "rejeita referências com 7 e 201 caracteres",
  '"x".repeat(200)',
  '"x".repeat(201)',
]) {
  expect(boundaryTests.includes(fragment), `Limite B76 ausente: ${fragment}`);
}

for (const fragment of [
  "getActiveEnrollments pure clock",
  "filtra usando o instante explícito sem ambiente Supabase",
  "getActiveEnrollments([ACTIVE, expired, future], NOW)",
  'from "@/contracts/course-access"',
]) {
  expect(pureFilterTests.includes(fragment), `Regressão pura B76 ausente: ${fragment}`);
}
expect(
  !pureFilterTests.includes("@/hooks/useCourseAccess") &&
    !pureFilterTests.includes("@/integrations/supabase") &&
    !pureFilterTests.includes("@/config/public-config"),
  "A regressão pura B76 não pode depender de hook, Supabase ou configuração pública.",
);

for (const fragment of [
  "studentCourseAccessPageItemSchema",
  "enrollmentWithCourseSchema",
  "access_active: z.boolean()",
  "active_total: z.number().int().nonnegative()",
  "active_enrollments: z.array(enrollmentWithCourseSchema)",
  "A amostra ativa não pode exceder o total ativo.",
  ".strict()",
]) {
  expect(
    studentAccessContract.includes(fragment),
    `Read model paginado B76 ausente: ${fragment}`,
  );
}

for (const fragment of [
  "studentCourseAccessSchema",
  "parseDataContract",
  'queryKey: [',
  '"student-course-access"',
  'supabase.rpc("get_student_course_access"',
  "p_limit: normalizedPageSize",
  "p_offset: normalizedPage * normalizedPageSize",
  "p_active_limit: normalizedActiveLimit",
  "placeholderData: (previousData) => previousData",
]) {
  expect(
    studentAccessHook.includes(fragment),
    `Consumidor paginado B76 ausente: ${fragment}`,
  );
}
expect(
  !studentAccessHook.includes('.from("enrollments")') &&
    !studentAccessHook.includes('eq("user_id"'),
  "O consumidor paginado B76 não pode restaurar consulta direta de matrículas no navegador.",
);

for (const fragment of [
  "studentCourseDetailAccessSchema",
  "StudentCourseDetailAccess",
  "parseDataContract",
  '"student-course-detail-access"',
  '"get_student_course_detail_access"',
  "p_course_id: normalizedCourseId",
  "enabled: user !== null && courseId !== undefined",
]) {
  expect(
    `${studentDetailContract}\n${studentDetailHook}`.includes(fragment),
    `Acesso direcionado B76 ausente: ${fragment}`,
  );
}

expect(
  documentation.includes("Fase B76") &&
    documentation.includes("useStudentCourseAccess") &&
    documentation.includes("useStudentCourseDetailAccess") &&
    documentation.includes("hook legado `useCourseAccess`") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B76 deve registrar consumidores atuais, remoção do legado, escopo e exclusões.",
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
  "Contrato B76 aprovado: matrícula, origem, pagamento e janela possuem validação pura; listagem paginada e detalhe usam read models do servidor sem restaurar o hook legado.",
);
