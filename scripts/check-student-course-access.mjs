import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration:
    "supabase/migrations/20260804073000_student_course_access_pagination.sql",
  databaseTest:
    "supabase/tests/70_student_course_access_pagination.test.sql",
  contract: "src/contracts/student-course-access.ts",
  contractTest: "src/contracts/student-course-access.test.ts",
  hook: "src/hooks/useStudentCourseAccess.ts",
  page: "src/pages/student/StudentCoursesPage.tsx",
  router: "src/pages/student/StudentPortalRouter.tsx",
  database: "src/integrations/supabase/database.ts",
  client: "src/integrations/supabase/client.ts",
  documentation:
    "docs/refactor/FASE-B112-STUDENT-COURSE-ACCESS-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B112 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const router = read(paths.router);
  const database = read(paths.database);
  const client = read(paths.client);
  const documentation = read(paths.documentation);

  requireFragments(migration, "Migration B112", [
    "create or replace function public.get_student_course_access(",
    "security invoker",
    "set search_path = ''",
    "authentication_required",
    "enrollment_record.user_id = v_user_id",
    "current_timestamp",
    "limit v_limit offset v_offset",
    "order by enrollment_record.created_at desc, enrollment_record.id desc",
    "revoke all on function public.get_student_course_access(integer, integer, integer)",
    "grant execute on function public.get_student_course_access(integer, integer, integer)",
  ]);
  requireFragments(databaseTest, "pgTAP B112", [
    "select plan(17)",
    "student course access is security invoker",
    "anonymous role cannot execute course access",
    "unauthenticated request is rejected",
    "total includes complete enrollment history for current student",
    "active total uses status course publication and server clock",
    "offset returns deterministic next enrollment",
    "zero limit and negative offset are clamped",
    "read model exposes only totals active sample and page",
  ]);
  requireFragments(contract, "Contrato B112", [
    "studentCourseAccessPageItemSchema",
    "access_active: z.boolean()",
    "studentCourseAccessSchema",
    "active_total: z.number().int().nonnegative()",
    "active_enrollments: z.array(enrollmentWithCourseSchema)",
    "enrollments: z.array(studentCourseAccessPageItemSchema)",
    "Matrículas ativas não podem exceder o total de matrículas.",
    "A amostra ativa não pode exceder o total ativo.",
    "A página não pode exceder o total de matrículas.",
  ]);
  requireFragments(contractTest, "Teste unitário B112", [
    "aceita acesso vazio coerente",
    "aceita páginas menores que os totais persistidos",
    "rejeita total ativo acima do total geral",
    "rejeita totais negativos e campos extras",
  ]);
  requireFragments(hook, "Hook B112", [
    'queryKey: [',
    '"student-course-access"',
    'supabase.rpc("get_student_course_access"',
    "p_offset: normalizedPage * normalizedPageSize",
    "studentCourseAccessSchema",
    "placeholderData: (previousData) => previousData",
  ]);
  requireFragments(page, "Página B112", [
    "useStudentCourseAccess(page, pageSize, 3)",
    "access_active: active",
    "Acesso ativo",
    "Sem acesso atual",
    'aria-label="Paginação das matrículas"',
    "setPage((current) => Math.max(0, current - 1))",
    "setPage((current) => current + 1)",
  ]);
  if (page.includes("new Date(") || page.includes("Date.now()")) {
    failures.push(
      "Página B112 não pode recalcular no navegador o estado de acesso definido pelo servidor.",
    );
  }
  requireFragments(router, "Roteador B112", [
    'import StudentCoursesPage from "@/pages/student/StudentCoursesPage"',
    'if (section === "courses")',
    "return <StudentCoursesPage />",
  ]);
  requireFragments(database, "Tipagem B112", [
    "get_student_progress_summary",
    "get_student_course_access",
    "p_active_limit?: number",
    "p_limit?: number",
    "p_offset?: number",
    "Returns: Json",
    'Omit<GeneratedDatabase, "public">',
  ]);
  requireFragments(client, "Cliente Supabase B112", [
    'import type { Database } from "./database"',
    "createClient<Database>",
  ]);
  requireFragments(documentation, "Documentação B112", [
    "17 asserções",
    "SECURITY INVOKER",
    "auth.uid()",
    "branch `dev`",
    "Supabase remoto",
    "main",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B112 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B112 aprovado: o portal pagina o histórico de matrículas e usa o estado de acesso calculado no servidor.",
);
