import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260804070000_student_progress_summary.sql",
  databaseTest: "supabase/tests/69_student_progress_summary.test.sql",
  contract: "src/contracts/student-progress-summary.ts",
  contractTest: "src/contracts/student-progress-summary.test.ts",
  hook: "src/hooks/useStudentProgressSummary.ts",
  page: "src/pages/student/StudentDashboardPage.tsx",
  documentation: "docs/refactor/FASE-B111-STUDENT-PROGRESS-SUMMARY.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B111 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const documentation = read(paths.documentation);

  requireFragments(migration, "Migration B111", [
    "create or replace function public.get_student_progress_summary()",
    "security invoker",
    "set search_path = ''",
    "authentication_required",
    "progress_record.user_id = v_user_id",
    "count(*)::integer",
    "count(*) filter (where progress_record.completada)::integer",
    "round(avg(progress_record.progresso_percentual))",
    "revoke all on function public.get_student_progress_summary()",
    "grant execute on function public.get_student_progress_summary()",
  ]);
  requireFragments(databaseTest, "pgTAP B111", [
    "select plan(13)",
    "student progress summary is security invoker",
    "anonymous role cannot execute student progress summary",
    "unauthenticated request is rejected",
    "summary counts only current student started lessons",
    "summary rounds current student average progress",
    "second student sees only own average progress",
    "student without progress receives coherent zero summary",
  ]);
  requireFragments(contract, "Contrato B111", [
    "studentProgressSummarySchema",
    "started_lessons: z.number().int().nonnegative()",
    "completed_lessons: z.number().int().nonnegative()",
    "average_progress_percent: z.number().int().min(0).max(100)",
    "Aulas concluídas não podem exceder aulas iniciadas.",
    "Aluno sem aulas iniciadas deve possuir média zero.",
  ]);
  requireFragments(contractTest, "Teste unitário B111", [
    "aceita resumo acadêmico coerente",
    "rejeita conclusões acima das aulas iniciadas",
    "rejeita média fora do intervalo ou incoerente com resumo vazio",
    "rejeita campos extras",
  ]);
  requireFragments(hook, "Hook B111", [
    'queryKey: ["student-progress-summary"]',
    '"get_student_progress_summary"',
    "studentProgressSummarySchema",
    "resumo acadêmico do aluno",
  ]);
  requireFragments(page, "Dashboard B111", [
    "useStudentProgressSummary()",
    "progressSummary.average_progress_percent",
    "progressSummary.started_lessons",
    "progressSummary.completed_lessons",
    "Conclusões agregadas no banco",
  ]);
  if (page.includes("useUserProgress()") || page.includes("progressRows")) {
    failures.push(
      "Dashboard B111 não pode transferir linhas de progresso para calcular agregados.",
    );
  }
  requireFragments(documentation, "Documentação B111", [
    "13 asserções",
    "SECURITY INVOKER",
    "auth.uid()",
    "branch `dev`",
    "Supabase remoto",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B111 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-student-course-access.mjs");

console.log(
  "Contrato B111 aprovado: o dashboard usa agregados persistidos sem carregar todas as linhas de progresso.",
);
