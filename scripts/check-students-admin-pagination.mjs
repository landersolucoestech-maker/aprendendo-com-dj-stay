import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803050000_students_admin_pagination.sql",
  databaseTest: "supabase/tests/67_students_admin_pagination.test.sql",
  legacyTest: "supabase/tests/40_certificates_lifecycle.test.sql",
  contract: "src/contracts/students-admin-pagination.ts",
  contractTest: "src/contracts/students-admin-pagination.test.ts",
  hook: "src/hooks/useCertificates.ts",
  page: "src/pages/admin/StudentsAdmin.tsx",
  overview: "src/lib/admin-overview.ts",
  overviewTest: "src/lib/admin-overview.test.ts",
  dashboard: "src/pages/admin/AdminDashboard.tsx",
  parent: "scripts/check-students-certificates-contract.mjs",
  documentation: "docs/refactor/FASE-B101-STUDENTS-ADMIN-PAGINATION.md",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      failures.push(`${label}: conteúdo obrigatório ausente: ${fragment}`);
    }
  }
};

for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B101 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const legacyTest = read(paths.legacyTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const overview = read(paths.overview);
  const overviewTest = read(paths.overviewTest);
  const dashboard = read(paths.dashboard);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();

  requireFragments(migration, "Migration B101", [
    "drop function if exists public.get_students_admin_dashboard(text, integer, integer)",
    "private.get_students_admin_dashboard",
    "public.get_students_admin_dashboard",
    "p_student_limit integer default 25",
    "p_enrollment_limit integer default 25",
    "p_certificate_limit integer default 25",
    "security definer",
    "security invoker",
    "admin_required",
    "'totals'",
    "'valid_certificates'",
    "limit v_student_limit offset v_student_offset",
    "limit v_enrollment_limit offset v_enrollment_offset",
    "limit v_certificate_limit offset v_certificate_offset",
    "order by user_record.created_at desc, user_record.id desc",
    "order by enrollment_record.created_at desc, enrollment_record.id desc",
    "order by certificate_record.issued_at desc, certificate_record.id desc",
  ]);
  if ((migration.match(/user_record\.email ilike/g) ?? []).length < 6) {
    failures.push("Migration B101 precisa aplicar o filtro de e-mail aos totais e páginas das três coleções.");
  }
  if ((migration.match(/raw_user_meta_data ->> 'full_name'/g) ?? []).length < 6) {
    failures.push("Migration B101 precisa aplicar o filtro de nome aos totais e páginas das três coleções.");
  }

  requireFragments(databaseTest, "pgTAP B101", [
    "select plan(34)",
    "legacy partially paginated dashboard signature is removed",
    "student cannot inspect academic administration",
    "academic dashboard reports complete student total",
    "student offset returns next student",
    "enrollment offset returns next enrollment",
    "certificate offset returns next certificate",
    "search filters all three academic collections",
    "course catalogue remains available independently from student search",
    "all academic pages use deterministic ordering",
    "totals remain independent from all page offsets",
  ]);
  if (legacyTest.includes("get_students_admin_dashboard(null,100,0)->")) {
    failures.push("Teste B21 ainda usa a assinatura acadêmica parcialmente paginada.");
  }
  requireFragments(legacyTest, "Compatibilidade B21/B101", [
    "get_students_admin_dashboard(null,100,0,100,0,100,0)->'students'",
    "get_students_admin_dashboard(null,100,0,100,0,100,0)->'enrollments'",
  ]);

  requireFragments(contract, "Contrato B101", [
    "studentsAdminTotalsSchema",
    "paginatedStudentsAdminDashboardSchema",
    "valid_certificates: z.number().int().nonnegative()",
    "Certificados válidos não podem exceder o total de certificados.",
    "A página não pode conter mais registros que o total filtrado.",
  ]);
  requireFragments(contractTest, "Teste unitário B101", [
    'describe("paginatedStudentsAdminDashboardSchema"',
    "aceita totais maiores que as páginas carregadas",
    "rejeita certificados válidos acima do total",
    "rejeita página maior que o total filtrado",
    "rejeita total negativo e campos extras",
  ]);

  requireFragments(hook, "Hook B101", [
    "interface StudentsAdminFilters",
    "paginatedStudentsAdminDashboardSchema",
    "studentLimit: input.studentLimit ?? 25",
    "enrollmentLimit: input.enrollmentLimit ?? 25",
    "certificateLimit: input.certificateLimit ?? 25",
    "p_student_limit: filters.studentLimit",
    "p_student_offset: filters.studentOffset",
    "p_enrollment_limit: filters.enrollmentLimit",
    "p_enrollment_offset: filters.enrollmentOffset",
    "p_certificate_limit: filters.certificateLimit",
    "p_certificate_offset: filters.certificateOffset",
    "certificateKeys.admin(filters)",
  ]);
  if (hook.includes("p_limit: 100") || hook.includes("useStudentsAdminDashboard = (search")) {
    failures.push("Hook B101 não pode manter a consulta acadêmica parcialmente paginada.");
  }

  requireFragments(page, "Página B101", [
    "const pageSize = 25;",
    "const [studentPage, setStudentPage] = useState(0);",
    "const [enrollmentPage, setEnrollmentPage] = useState(0);",
    "const [certificatePage, setCertificatePage] = useState(0);",
    "studentOffset: studentPage * pageSize",
    "enrollmentOffset: enrollmentPage * pageSize",
    "certificateOffset: certificatePage * pageSize",
    "data.totals.students",
    "data.totals.enrollments",
    "data.totals.valid_certificates",
    'label="alunos"',
    'label="matrículas"',
    'label="certificados"',
    "dashboardQuery.isFetching",
    "resetPages();",
  ]);
  if (page.includes("data.students.length}</p>") || page.includes("data.enrollments.length}</p>")) {
    failures.push("Página B101 não pode usar tamanho da página como total acadêmico.");
  }

  requireFragments(overview, "Overview B101", [
    "input.students.totals.students",
    "input.students.totals.enrollments",
    "input.students.totals.certificates",
    "input.students.totals.valid_certificates",
  ]);
  for (const forbidden of [
    "input.students.students.length",
    "input.students.enrollments.length",
    "averageCompletionPercent",
    "activeEnrollments",
    "suspendedEnrollments",
  ]) {
    if (overview.includes(forbidden)) {
      failures.push(`Overview B101 ainda deriva métrica global de página parcial: ${forbidden}`);
    }
  }
  requireFragments(overviewTest, "Teste do overview B101", [
    "uses persisted academic totals instead of page lengths",
    "students: 350",
    "enrollments: 420",
    "certificates: 180",
    "valid_certificates: 165",
  ]);

  requireFragments(dashboard, "Dashboard B101", [
    "useStudentsAdminDashboard({",
    "studentLimit: 1",
    "enrollmentLimit: 1",
    "certificateLimit: 1",
    "overview.academic.totalStudents",
    "overview.academic.totalEnrollments",
    "overview.academic.totalCertificates",
    "overview.academic.validCertificates",
  ]);
  for (const forbidden of [
    "overview.academic.activeEnrollments",
    "overview.academic.suspendedEnrollments",
    "overview.academic.averageCompletionPercent",
  ]) {
    if (dashboard.includes(forbidden)) {
      failures.push(`Dashboard B101 ainda apresenta métrica derivada de página parcial: ${forbidden}`);
    }
  }

  if (!parent.includes('await import("./check-students-admin-pagination.mjs")')) {
    failures.push("B101 não está encadeada no gate bloqueante B21.");
  }
  requireFragments(documentation, "Documentação B101", [
    "paginação no servidor",
    "totais filtrados",
    "25 registros",
    "filtro compartilhado",
    "ordenação determinística",
    "34 asserções",
    "administrador_proprietario",
    "branch `dev`",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B101 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B101 aprovado: alunos, matrículas e certificados possuem páginas independentes e totais persistidos.",
);
