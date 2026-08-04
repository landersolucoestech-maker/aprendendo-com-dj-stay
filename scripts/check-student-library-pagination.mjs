import { existsSync, readFileSync } from "node:fs";

const paths = {
  contract: "src/contracts/student-library-page.ts",
  contractTest: "src/contracts/student-library-page.test.ts",
  hook: "src/hooks/useStudentLibraryPage.ts",
  page: "src/pages/student/StudentLibraryPage.tsx",
  router: "src/pages/student/StudentPortalRouter.tsx",
  privateAssets: "src/lib/private-assets.ts",
  parent: "scripts/check-storage-contract-tests.mjs",
  documentation: "docs/refactor/FASE-B109-STUDENT-LIBRARY-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B109 ausente: ${path}`);
}

if (failures.length === 0) {
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const router = read(paths.router);
  const privateAssets = read(paths.privateAssets);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation);

  requireFragments(contract, "Contrato B109", [
    "assetRowsSchema",
    "studentLibraryPageSchema",
    "A página não pode conter mais materiais que o total.",
    ".superRefine((value, context) =>",
  ]);
  requireFragments(contractTest, "Teste unitário B109", [
    "aceita biblioteca vazia coerente",
    "aceita página menor que o total persistido",
    "rejeita página maior que o total persistido",
    "rejeita total negativo ou fracionário",
    "rejeita campos extras",
  ]);

  requireFragments(hook, "Hook B109", [
    "normalizeLibraryPage",
    "Math.max(0, Math.trunc(value))",
    "normalizeLibraryPageSize",
    "Math.min(100, Math.max(1, Math.trunc(value)))",
    'queryKey: ["student-library-page", normalizedPage, normalizedPageSize]',
    "supabase.auth.getUser()",
    '.from("assets")',
    '.select("*", { count: "exact" })',
    '.eq("state", "published")',
    '.is("deleted_at", null)',
    '.order("published_at", { ascending: false, nullsFirst: false })',
    '.order("id", { ascending: false })',
    ".range(offset, offset + normalizedPageSize - 1)",
    "studentLibraryPageSchema",
    "placeholderData: (previousData) => previousData",
  ]);
  if (hook.includes('.eq("owner_user_id"')) {
    failures.push("Hook B109 não pode ocultar grants filtrando apenas pelo proprietário do asset.");
  }
  if (hook.includes(".limit(100)")) {
    failures.push("Hook B109 não pode voltar a limitar a biblioteca ao primeiro lote.");
  }

  requireFragments(page, "Página B109", [
    "const pageSize = 20;",
    "const [page, setPage] = useState(0);",
    "useStudentLibraryPage(page, pageSize)",
    "page * pageSize >= data.total",
    "setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1))",
    "downloadPrivateAsset(asset)",
    "purposeLabels[asset.purpose]",
    "1 material disponível",
    "materiais disponíveis",
    'aria-label="Paginação da biblioteca"',
    "setPage((current) => Math.max(0, current - 1))",
    "setPage((current) => current + 1)",
    "libraryQuery.isFetching",
  ]);
  if (page.includes("assets.slice(")) {
    failures.push("Página B109 não pode simular paginação recortando assets no cliente.");
  }
  if (page.includes("assets.length} material")) {
    failures.push("Página B109 não pode usar o tamanho da página como total persistido.");
  }

  requireFragments(router, "Roteador B109", [
    'import StudentLibraryPage from "@/pages/student/StudentLibraryPage";',
    'if (section === "library")',
    "return <StudentLibraryPage />;",
  ]);
  requireFragments(privateAssets, "Download privado preservado", [
    "signedAssetUrlSchema",
    'asset.state !== "published"',
    "asset.deleted_at !== null",
    'credentials: "omit"',
    'cache: "no-store"',
  ]);

  if (!parent.includes('await import("./check-student-library-pagination.mjs")')) {
    failures.push("B109 não está encadeada no gate bloqueante B75.");
  }
  requireFragments(documentation, "Documentação B109", [
    "20 registros",
    "count: \"exact\"",
    ".range()",
    "assetRowsSchema",
    "owner_user_id",
    "RLS",
    "branch `dev`",
    "Nenhuma migration",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B109 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-student-dashboard-library-summary.mjs");

console.log(
  "Contrato B109 aprovado: o aluno acessa toda a biblioteca privada por paginação real no servidor.",
);
