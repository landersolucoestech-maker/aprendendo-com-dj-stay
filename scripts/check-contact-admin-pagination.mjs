import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803043000_contact_admin_pagination.sql",
  databaseTest: "supabase/tests/66_contact_admin_pagination.test.sql",
  contract: "src/contracts/contact-messages.ts",
  contractTest: "src/contracts/contact-messages.test.ts",
  hook: "src/hooks/useContactMessages.ts",
  page: "src/pages/admin/ContactsAdmin.tsx",
  parent: "scripts/check-contact-contract-tests.mjs",
  documentation: "docs/refactor/FASE-B99-CONTACT-ADMIN-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B99 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();

  requireFragments(migration, "Migration B99", [
    "private.get_contact_messages_admin",
    "security definer",
    "admin_required",
    "'total'",
    "limit v_limit offset v_offset",
    "order by submitted_at desc, id desc",
  ]);
  requireFragments(databaseTest, "pgTAP B99", [
    "select plan(22)",
    "student cannot inspect paginated contact inbox",
    "contact inbox reports complete filtered total",
    "second contact page respects offset",
    "status filter changes total before pagination",
    "search filter changes total before pagination",
    "summary remains independent from page size",
  ]);
  requireFragments(contract, "Contrato B99", [
    "contactAdminDashboardSchema",
    "total: z.number().int().nonnegative()",
  ]);
  requireFragments(contractTest, "Teste unitário B99", [
    "aceita dashboard estrito com total filtrado",
    "rejeita contagem negativa, total ausente e campos extras",
    "total: 2",
  ]);
  requireFragments(hook, "Hook B99", [
    "interface ContactAdminFilters",
    "limit: input.limit ?? 25",
    "offset: input.offset ?? 0",
    "p_limit: filters.limit",
    "p_offset: filters.offset",
    "contactKeys.admin(filters)",
  ]);
  if (hook.includes("p_limit: 100") || hook.includes("p_offset: 0,")) {
    failures.push("Hook B99 não pode fixar a primeira página da caixa de contatos.");
  }
  requireFragments(page, "Página B99", [
    "const pageSize = 25;",
    "const [page, setPage] = useState(0);",
    "limit: pageSize",
    "offset: page * pageSize",
    "const total = data?.total ?? 0;",
    'aria-label="Paginação das solicitações de contato"',
    "Página {page + 1} de {totalPages}",
    "dashboardQuery.isFetching",
    "page + 1 >= totalPages",
  ]);
  if ((page.match(/setPage\(0\);/g) ?? []).length < 2) {
    failures.push("Página B99 precisa voltar à primeira página ao alterar busca ou status.");
  }
  if (!parent.includes('await import("./check-contact-admin-pagination.mjs")')) {
    failures.push("B99 não está encadeada no gate bloqueante B73.");
  }
  requireFragments(documentation, "Documentação B99", [
    "total filtrado",
    "paginação no servidor",
    "25 solicitações",
    "ordenação determinística",
    "administrador_proprietario",
    "branch `dev`",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B99 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B99 aprovado: a caixa administrativa de contatos possui total filtrado e paginação real no servidor.",
);
