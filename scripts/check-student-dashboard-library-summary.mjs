import { existsSync, readFileSync } from "node:fs";

const paths = {
  contract: "src/contracts/student-library-summary.ts",
  contractTest: "src/contracts/student-library-summary.test.ts",
  hook: "src/hooks/useStudentLibrarySummary.ts",
  page: "src/pages/student/StudentDashboardPage.tsx",
  router: "src/pages/student/StudentPortalRouter.tsx",
  legacyHook: "src/hooks/useStudentLibrary.ts",
  documentation:
    "docs/refactor/FASE-B110-STUDENT-DASHBOARD-LIBRARY-SUMMARY.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B110 ausente: ${path}`);
}

if (failures.length === 0) {
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const router = read(paths.router);
  const documentation = read(paths.documentation);

  requireFragments(contract, "Contrato B110", [
    "studentLibrarySummarySchema",
    "z.number().int().nonnegative()",
    ".strict()",
  ]);
  requireFragments(contractTest, "Teste unitário B110", [
    "aceita total persistido não negativo",
    "rejeita total negativo ou fracionário",
    "rejeita campos extras",
  ]);
  requireFragments(hook, "Hook B110", [
    'queryKey: ["student-library-summary", user?.id ?? null]',
    '.from("assets")',
    '.select("id", { count: "exact", head: true })',
    '.eq("state", "published")',
    '.is("deleted_at", null)',
    '.in("purpose", [...STUDENT_MATERIAL_PURPOSES])',
    "studentLibrarySummarySchema",
    "{ total: count ?? 0 }",
  ]);
  if (hook.includes('.eq("owner_user_id"')) {
    failures.push(
      "Hook B110 não pode ocultar grants filtrando apenas pelo proprietário do asset.",
    );
  }
  if (hook.includes('.select("*"') || hook.includes("data,")) {
    failures.push("Hook B110 não pode transferir linhas da biblioteca para contar assets.");
  }

  requireFragments(page, "Página B110", [
    "useStudentLibrarySummary()",
    "librarySummaryQuery.data?.total ?? 0",
    'label="Materiais liberados"',
    "value={String(libraryTotal)}",
    "Total exato de arquivos privados acessíveis",
    "activeEnrollments.slice(0, 3)",
    "useRecentActivities(5)",
  ]);
  if (page.includes("useStudentLibrary()") || page.includes("library.length")) {
    failures.push(
      "Dashboard B110 não pode usar a coleção completa ou o tamanho da resposta como total.",
    );
  }

  requireFragments(router, "Roteador B110", [
    'import StudentDashboardPage from "@/pages/student/StudentDashboardPage";',
    'if (section === "dashboard")',
    "return <StudentDashboardPage />;",
  ]);
  requireFragments(documentation, "Documentação B110", [
    "count: \"exact\"",
    "head: true",
    "library.length",
    "RLS",
    "branch `dev`",
    "Nenhuma migration",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B110 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-student-progress-summary.mjs");

console.log(
  "Contrato B110 aprovado: o dashboard do aluno conta materiais com total exato sem transferir a biblioteca.",
);
