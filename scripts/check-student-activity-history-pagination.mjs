import { existsSync, readFileSync } from "node:fs";

const paths = {
  contract: "src/contracts/student-activity-history.ts",
  contractTest: "src/contracts/student-activity-history.test.ts",
  hook: "src/hooks/useStudentActivityHistory.ts",
  page: "src/pages/student/StudentActivityHistory.tsx",
  router: "src/pages/student/StudentPortalRouter.tsx",
  existingHook: "src/hooks/useRecentActivities.ts",
  parent: "scripts/check-recent-activities-tests.mjs",
  documentation: "docs/refactor/FASE-B108-STUDENT-ACTIVITY-HISTORY-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B108 ausente: ${path}`);
}

if (failures.length === 0) {
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const router = read(paths.router);
  const existingHook = read(paths.existingHook);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation);

  requireFragments(contract, "Contrato B108", [
    "recentProgressResponseSchema",
    "studentActivityHistoryResponseSchema",
    "A página não pode conter mais atividades que o total.",
    ".superRefine((value, context) =>",
  ]);
  requireFragments(contractTest, "Teste unitário B108", [
    "aceita histórico vazio coerente",
    "aceita página menor que o total persistido",
    "rejeita página maior que o total persistido",
    "rejeita total negativo ou fracionário",
    "rejeita campos extras",
  ]);

  requireFragments(hook, "Hook B108", [
    "normalizeActivityHistoryPage",
    "Math.max(0, Math.trunc(value))",
    "normalizeActivityHistoryPageSize",
    "Math.min(100, Math.max(1, Math.trunc(value)))",
    'queryKey: ["student-activity-history", normalizedPage, normalizedPageSize]',
    "supabase.auth.getUser()",
    '.from("progresso_aulas")',
    'count: "exact"',
    '.eq("user_id", user.id)',
    '.order("updated_at", { ascending: false })',
    '.order("id", { ascending: false })',
    ".range(offset, offset + normalizedPageSize - 1)",
    "studentActivityHistoryResponseSchema",
    "toRecentActivities(response.rows)",
    "placeholderData: (previousData) => previousData",
  ]);
  if (hook.includes(".limit(100)")) {
    failures.push("Hook B108 não pode voltar a limitar o histórico aos primeiros 100 registros.");
  }

  requireFragments(page, "Página B108", [
    "const pageSize = 20;",
    "const [page, setPage] = useState(0);",
    "useStudentActivityHistory(page, pageSize)",
    "page * pageSize >= data.total",
    "setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1))",
    "Página {page + 1} de {totalPages}",
    'aria-label="Paginação do histórico"',
    "setPage((current) => Math.max(0, current - 1))",
    "setPage((current) => current + 1)",
    "historyQuery.isFetching",
  ]);
  if (page.includes("activities.slice(")) {
    failures.push("Página B108 não pode simular paginação recortando atividades no cliente.");
  }
  if (page.includes("activities.length} atividade")) {
    failures.push("Página B108 não pode usar o tamanho da página como total persistido.");
  }

  requireFragments(router, "Roteador B108/B113", [
    'import StudentActivityHistory from "@/pages/student/StudentActivityHistory";',
    'export type StudentPortalSection =',
    '| "history";',
    "switch (section)",
    'case "history":',
    "return <StudentActivityHistory />;",
    "const exhaustiveSection: never = section;",
  ]);
  if (router.includes('if (section === "history")')) {
    failures.push(
      "Roteador B108/B113 não pode restaurar condicionais isoladas após adotar switch exaustivo.",
    );
  }
  requireFragments(existingHook, "Dashboard recente preservado", [
    "export const useRecentActivities = (limit = 10)",
    ".limit(normalizedLimit)",
  ]);

  if (!parent.includes('await import("./check-student-activity-history-pagination.mjs")')) {
    failures.push("B108 não está encadeada no gate bloqueante B80.");
  }
  requireFragments(documentation, "Documentação B108", [
    "20 registros",
    "count: \"exact\"",
    ".range(offset, offset + pageSize - 1)",
    "recentProgressResponseSchema",
    "RLS",
    "branch `dev`",
    "Nenhuma migration",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B108/B113 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B108/B113 aprovado: o histórico usa paginação real no servidor e permanece integrado ao roteador exaustivo do portal extraído.",
);
