import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260801200000_support_ticketing.sql",
  contracts: "src/contracts/support.ts",
  rpc: "src/integrations/supabase/support-rpc.ts",
  hook: "src/hooks/useSupportTickets.ts",
  studentPage: "src/pages/student/StudentSupport.tsx",
  adminPage: "src/pages/admin/SupportAdmin.tsx",
  parent: "scripts/check-support-ticketing.mjs",
  documentation: "docs/refactor/FASE-B98-SUPPORT-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B98 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const contracts = read(paths.contracts);
  const rpc = read(paths.rpc);
  const hook = read(paths.hook);
  const studentPage = read(paths.studentPage);
  const adminPage = read(paths.adminPage);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();

  if ((migration.match(/limit v_limit offset v_offset/g) ?? []).length < 2) {
    failures.push("RPCs B39 precisam aplicar limit/offset no PostgreSQL para aluno e administração.");
  }
  requireFragments(contracts, "Contrato de suporte B98", [
    "mySupportTicketsSchema",
    "supportAdminDashboardSchema",
    "total: z.coerce.number().int().nonnegative()",
  ]);
  requireFragments(rpc, "Cliente RPC B98", [
    "p_limit: input.limit ?? 25",
    "p_offset: input.offset ?? 0",
    "p_limit: input.limit ?? 50",
  ]);
  requireFragments(hook, "Hook B98", [
    "mine: (limit: number, offset: number)",
    "limit: filters.limit ?? 50",
    "offset: filters.offset ?? 0",
  ]);
  requireFragments(studentPage, "Portal do aluno B98", [
    "const pageSize = 10;",
    "const [page, setPage] = useState(0);",
    "useMySupportTickets(pageSize, page * pageSize)",
    'aria-label="Paginação dos tickets de suporte"',
    "Página {page + 1} de {totalPages}",
    "page + 1 >= totalPages",
    "ticketsQuery.isFetching",
  ]);
  requireFragments(adminPage, "Admin B98", [
    "const pageSize = 25;",
    "const [page, setPage] = useState(0);",
    "limit: pageSize",
    "offset: page * pageSize",
    'aria-label="Paginação dos tickets administrativos"',
    "Página {page + 1} de {totalPages}",
    "dashboardQuery.isFetching",
  ]);
  if ((adminPage.match(/setPage\(0\);/g) ?? []).length < 3) {
    failures.push("Admin B98 precisa voltar à primeira página ao alterar qualquer filtro.");
  }
  if (!studentPage.includes("setPage(0);")) {
    failures.push("Portal do aluno B98 precisa voltar à primeira página após criar ticket.");
  }
  if (!parent.includes('await import("./check-support-pagination.mjs")')) {
    failures.push("B98 não está encadeada no gate bloqueante B39.");
  }
  requireFragments(documentation, "Documentação B98", [
    "paginação no servidor",
    "limit",
    "offset",
    "10 tickets",
    "25 tickets",
    "branch `dev`",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B98 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B98 aprovado: aluno e proprietário acessam todo o histórico de suporte por paginação real no servidor.",
);
