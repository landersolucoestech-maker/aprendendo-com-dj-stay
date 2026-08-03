import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260802000000_privacy_rights_requests.sql",
  contract: "src/contracts/privacy-rights-requests.ts",
  hook: "src/hooks/usePrivacyRightsRequests.ts",
  studentPage: "src/pages/student/StudentPrivacyRights.tsx",
  adminPage: "src/pages/admin/PrivacyRightsAdmin.tsx",
  parent: "scripts/check-privacy-rights-requests.mjs",
  documentation: "docs/refactor/FASE-B100-PRIVACY-RIGHTS-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B100 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const contract = read(paths.contract);
  const hook = read(paths.hook);
  const studentPage = read(paths.studentPage);
  const adminPage = read(paths.adminPage);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();

  requireFragments(migration, "Banco B100", [
    "private.get_my_privacy_rights_requests",
    "private.admin_get_privacy_rights_requests",
    "'total'",
    "limit v_limit offset v_offset",
    "where request.user_id = v_user_id",
    "admin_required",
  ]);
  if ((migration.match(/limit v_limit offset v_offset/g) ?? []).length < 2) {
    failures.push("Banco B100 precisa aplicar limit/offset nas consultas do aluno e do proprietário.");
  }
  requireFragments(contract, "Contrato B100", [
    "privacyRightsRequestListSchema",
    "total: z.number().int().nonnegative()",
  ]);
  requireFragments(hook, "Hook B100", [
    "interface AdminPrivacyRightsFilters",
    "student: (limit: number, offset: number)",
    "admin: (filters: AdminPrivacyRightsFilters)",
    "useMyPrivacyRightsRequests = (limit = 10, offset = 0)",
    "p_limit: limit, p_offset: offset",
    "limit: input.limit ?? 25",
    "offset: input.offset ?? 0",
    "p_limit: filters.limit",
    "p_offset: filters.offset",
  ]);
  if (hook.includes("p_limit: 100, p_offset: 0") || hook.includes("p_limit: 200")) {
    failures.push("Hook B100 não pode permanecer preso ao primeiro lote de privacidade.");
  }
  requireFragments(studentPage, "Portal do aluno B100", [
    "const pageSize = 10;",
    "const [page, setPage] = useState(0);",
    "useMyPrivacyRightsRequests(pageSize, page * pageSize)",
    "const total = requestsQuery.data?.total ?? 0;",
    'aria-label="Paginação das solicitações de privacidade"',
    "Página {page + 1} de {totalPages}",
    "requestsQuery.isFetching",
    "page + 1 >= totalPages",
  ]);
  if (!studentPage.includes("setPage(0);")) {
    failures.push("Portal do aluno B100 precisa voltar à primeira página após criar uma solicitação.");
  }
  requireFragments(adminPage, "Administração B100", [
    "const pageSize = 25;",
    "const [page, setPage] = useState(0);",
    "useAdminPrivacyRightsRequests({",
    "limit: pageSize",
    "offset: page * pageSize",
    "const total = requestsQuery.data?.total ?? 0;",
    'aria-label="Paginação administrativa das solicitações de privacidade"',
    "Página {page + 1} de {totalPages}",
    "requestsQuery.isFetching",
    "page + 1 >= totalPages",
  ]);
  if ((adminPage.match(/setPage\(0\);/g) ?? []).length < 2) {
    failures.push("Administração B100 precisa voltar à primeira página ao alterar status ou tipo.");
  }
  if (!parent.includes('await import("./check-privacy-rights-pagination.mjs")')) {
    failures.push("B100 não está encadeada no gate bloqueante B44.");
  }
  requireFragments(documentation, "Documentação B100", [
    "paginação no servidor",
    "10 solicitações",
    "25 solicitações",
    "limit",
    "offset",
    "auth.uid()",
    "administrador_proprietario",
    "não executa exclusão automática",
    "branch `dev`",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B100 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B100 aprovado: aluno e proprietário acessam todo o histórico de privacidade por paginação real no servidor.",
);
