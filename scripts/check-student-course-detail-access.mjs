import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration:
    "supabase/migrations/20260804080000_student_course_detail_access.sql",
  databaseTest:
    "supabase/tests/71_student_course_detail_access.test.sql",
  contract: "src/contracts/student-course-detail-access.ts",
  contractTest: "src/contracts/student-course-detail-access.test.ts",
  hook: "src/hooks/useStudentCourseDetailAccess.ts",
  coursePage: "src/pages/student/StudentCoursePage.tsx",
  profilePage: "src/pages/student/StudentProfilePage.tsx",
  router: "src/pages/student/StudentPortalRouter.tsx",
  database: "src/integrations/supabase/database.ts",
  documentation:
    "docs/refactor/FASE-B113-STUDENT-COURSE-DETAIL-AND-MONOLITH-REMOVAL.md",
};
const legacyPortal = "src/pages/student/StudentPortal.tsx";

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
  if (!existsSync(path)) failures.push(`Arquivo B113 ausente: ${path}`);
}
if (existsSync(legacyPortal)) {
  failures.push(`Monólito legado B113 ainda existe: ${legacyPortal}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const coursePage = read(paths.coursePage);
  const profilePage = read(paths.profilePage);
  const router = read(paths.router);
  const database = read(paths.database);
  const documentation = read(paths.documentation);

  requireFragments(migration, "Migration B113", [
    "create or replace function public.get_student_course_detail_access(",
    "security invoker",
    "set search_path = ''",
    "authentication_required",
    "course_id_required",
    "enrollment_record.user_id = v_user_id",
    "enrollment_record.course_id = p_course_id",
    "current_timestamp",
    "revoke all on function public.get_student_course_detail_access(uuid)",
    "grant execute on function public.get_student_course_detail_access(uuid)",
  ]);
  requireFragments(databaseTest, "pgTAP B113", [
    "select plan(17)",
    "student course detail access is security invoker",
    "anonymous role cannot execute student course detail access",
    "unauthenticated request is rejected",
    "null course identifier is rejected",
    "active published enrollment grants course detail access",
    "expired enrollment does not grant course detail access",
    "current student cannot access another student course",
    "course detail access uses database clock and authenticated user filter",
  ]);
  requireFragments(contract, "Contrato B113", [
    "studentCourseDetailAccessSchema",
    "activeStudentCourseDetailSchema.nullable()",
    'value.status !== "active"',
    'value.courses.status !== "published"',
    "O detalhe do curso exige matrícula ativa.",
    "O detalhe do curso exige curso publicado.",
  ]);
  requireFragments(contractTest, "Teste unitário B113", [
    "aceita ausência de acesso ao curso",
    "aceita matrícula ativa de curso publicado",
    "rejeita matrícula sem estado ativo",
    "rejeita curso sem estado publicado",
    "rejeita campos extras no read model",
  ]);
  requireFragments(hook, "Hook B113", [
    '"student-course-detail-access"',
    "parseDataContract(",
    "uuidSchema",
    '"get_student_course_detail_access"',
    "p_course_id: normalizedCourseId",
    "studentCourseDetailAccessSchema",
    "enabled: user !== null && courseId !== undefined",
  ]);
  if (hook.includes('.from("enrollments")') || hook.includes("useCourseAccess")) {
    failures.push(
      "Hook B113 não pode consultar a coleção de matrículas para validar um único curso.",
    );
  }
  requireFragments(coursePage, "Página de curso B113", [
    "useStudentCourseDetailAccess(courseId)",
    "StudentPortalPageFrame",
    "activeEnrollment.courses.title",
    "useModules(",
    "useProgressCalculation(",
    "calculateOverallCourseProgress(modules)",
    "Não existe matrícula ativa para este curso na conta autenticada.",
  ]);
  for (const forbidden of [
    "useCourseAccess",
    "getActiveEnrollments",
    "Date.now()",
    "new Date(",
  ]) {
    if (coursePage.includes(forbidden)) {
      failures.push(`Página de curso B113 contém lógica proibida: ${forbidden}`);
    }
  }
  requireFragments(profilePage, "Página de perfil B113", [
    "StudentPortalPageFrame",
    "useUserProfile()",
    "getUserMetadataProfile(user)",
    'title="Perfil"',
    'to="/aluno/perfil/editar"',
  ]);
  requireFragments(router, "Roteador B113", [
    'import StudentCoursePage from "@/pages/student/StudentCoursePage"',
    'import StudentProfilePage from "@/pages/student/StudentProfilePage"',
    'case "dashboard":',
    'case "courses":',
    'case "course":',
    'case "library":',
    'case "orders":',
    'case "payments":',
    'case "profile":',
    'case "history":',
    "return <StudentCoursePage />",
    "return <StudentProfilePage />",
    "const exhaustiveSection: never = section",
  ]);
  if (router.includes('from "@/pages/student/StudentPortal"')) {
    failures.push("Roteador B113 não pode depender do monólito removido.");
  }
  requireFragments(database, "Tipagem B113", [
    "get_student_course_detail_access",
    "p_course_id: string",
    "Returns: Json",
  ]);
  requireFragments(documentation, "Documentação B113", [
    "17 asserções",
    "cinco testes unitários",
    "SECURITY INVOKER",
    "Date.now()",
    "StudentPortal.tsx",
    "branch `dev`",
    "Supabase remoto",
    "main",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B113 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B113 aprovado: o detalhe do curso usa acesso direcionado no servidor e o monólito do portal foi removido.",
);
