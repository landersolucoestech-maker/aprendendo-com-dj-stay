import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260801220000_student_favorites.sql",
  baseDatabaseTest: "supabase/tests/53_student_favorites.test.sql",
  paginationDatabaseTest: "supabase/tests/71_student_favorites_pagination.test.sql",
  contract: "src/contracts/student-favorites.ts",
  contractTest: "src/contracts/student-favorites.test.ts",
  hook: "src/hooks/useStudentFavorites.ts",
  page: "src/pages/student/StudentFavorites.tsx",
  parent: "scripts/check-student-favorites.mjs",
  documentation: "docs/refactor/FASE-B106-STUDENT-FAVORITES-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B106 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const baseDatabaseTest = read(paths.baseDatabaseTest);
  const paginationDatabaseTest = read(paths.paginationDatabaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation);

  requireFragments(migration, "Migration B41/B106", [
    "get_my_student_favorites",
    "p_limit integer default 30",
    "p_offset integer default 0",
    "'total'",
    "'favorites'",
    "limit v_limit offset v_offset",
    "favorite.user_id = v_user_id",
    "course.status = 'published'",
    "product.status = 'published'",
  ]);
  requireFragments(baseDatabaseTest, "pgTAP base B41", [
    "select plan(24)",
    "favorites list is bounded",
    "favorites list filters auth user",
    "anonymous cannot execute favorite RPCs",
  ]);
  requireFragments(paginationDatabaseTest, "pgTAP B106", [
    "select plan(19)",
    "favorite total excludes unavailable items",
    "favorite pagination returns one item",
    "favorite offset returns second available item",
    "adjacent favorite pages do not overlap",
    "favorite total remains independent from offset",
    "student sees only own favorite total",
    "removing a favorite outside the first page succeeds",
    "select * from finish()",
  ]);

  requireFragments(contract, "Contrato B106", [
    "A página não pode conter mais favoritos que o total.",
    ".superRefine((value, context) =>",
  ]);
  requireFragments(contractTest, "Teste unitário B106", [
    "aceita uma página menor que o total persistido",
    "rejeita página maior que o total persistido",
  ]);

  requireFragments(hook, "Hook B106", [
    "normalizeFavoriteLimit",
    "Math.min(100, Math.max(1, Math.trunc(value)))",
    "normalizeFavoriteOffset",
    "Math.max(0, Math.trunc(value))",
    "favoriteKeys.list(normalizedLimit, normalizedOffset)",
    "p_limit: normalizedLimit",
    "p_offset: normalizedOffset",
  ]);

  requireFragments(page, "Página B106", [
    "const pageSize = 20;",
    "const [page, setPage] = useState(0);",
    "useStudentFavorites(pageSize, page * pageSize)",
    "page * pageSize >= data.total",
    "setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1))",
    'aria-label="Paginação de favoritos"',
    "Página {page + 1} de {totalPages}",
    "setPage((current) => Math.max(0, current - 1))",
    "setPage((current) => current + 1)",
    "favoritesQuery.isFetching",
  ]);
  if (page.includes("const favoritesQuery = useStudentFavorites();")) {
    failures.push("Página B106 não pode permanecer presa ao primeiro lote padrão.");
  }
  if (page.includes("favorites.slice(")) {
    failures.push("Página B106 não pode simular paginação recortando a lista no cliente.");
  }
  if (page.includes("favorites.length} favorito")) {
    failures.push("Página B106 não pode usar o tamanho da página como total persistido.");
  }

  if (!parent.includes('await import("./check-student-favorites-pagination.mjs")')) {
    failures.push("B106 não está encadeada no gate bloqueante B41.");
  }
  requireFragments(documentation, "Documentação B106", [
    "20 registros por página",
    "19 asserções",
    "p_limit",
    "p_offset",
    "total",
    "auth.uid()",
    "branch `dev`",
    "Nenhuma migration",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B106 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B106 aprovado: o aluno acessa todos os favoritos por paginação real no servidor.",
);
