import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260801180000_student_payment_history.sql",
  baseDatabaseTest: "supabase/tests/50_student_payment_history.test.sql",
  paginationDatabaseTest: "supabase/tests/72_student_payment_history_pagination.test.sql",
  contract: "src/contracts/student-payments.ts",
  contractTest: "src/contracts/student-payments-pagination.test.ts",
  hook: "src/hooks/useStudentPayments.ts",
  page: "src/pages/student/StudentFinancialPortal.tsx",
  parent: "scripts/check-student-payment-history.mjs",
  documentation: "docs/refactor/FASE-B107-STUDENT-PAYMENT-HISTORY-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B107 ausente: ${path}`);
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

  requireFragments(migration, "Migration B38/B107", [
    "get_my_payment_history",
    "p_limit integer default 50",
    "p_offset integer default 0",
    "'summary'",
    "'total'",
    "'orders'",
    "limit v_limit offset v_offset",
    "payment_order.user_id = v_user_id",
    "order by payment_order.created_at desc, payment_order.id desc",
  ]);
  requireFragments(baseDatabaseTest, "pgTAP base B38", [
    "select plan(15)",
    "student history scopes orders to auth uid",
    "student history limit is bounded",
    "student history does not expose provider payload",
  ]);
  requireFragments(paginationDatabaseTest, "pgTAP B107", [
    "select plan(20)",
    "payment history total remains complete",
    "payment summary total remains complete",
    "payment summary reports pending orders",
    "payment summary reports paid orders",
    "payment summary reports refunded orders",
    "payment offset returns second order",
    "adjacent payment pages do not overlap",
    "payment total remains independent from offset",
    "student sees only own payment total",
    "select * from finish()",
  ]);

  requireFragments(contract, "Contrato B107", [
    "O total do resumo deve corresponder ao total paginado.",
    "A página não pode conter mais pedidos que o total.",
    ".superRefine((value, context) =>",
  ]);
  requireFragments(contractTest, "Teste unitário B107", [
    "aceita página menor que o total persistido",
    "rejeita total do resumo divergente",
    "rejeita página maior que o total persistido",
  ]);

  requireFragments(hook, "Hook B107", [
    "normalizePaymentHistoryPage",
    "Math.max(0, Math.trunc(value))",
    "normalizePaymentHistoryPageSize",
    "Math.min(100, Math.max(1, Math.trunc(value)))",
    'queryKey: ["student-payment-history", normalizedPage, normalizedPageSize]',
    "p_limit: normalizedPageSize",
    "p_offset: normalizedPage * normalizedPageSize",
  ]);

  requireFragments(page, "Página B107", [
    "const pageSize = 20;",
    "const [page, setPage] = useState(0);",
    "useStudentPaymentHistory(page, pageSize)",
    "page * pageSize >= historyQuery.data.total",
    "setPage(Math.max(0, Math.ceil(historyQuery.data.total / pageSize) - 1))",
    "summary?.total_orders",
    "summary?.pending_orders",
    "summary?.paid_orders",
    "summary?.refunded_orders",
    "Página {page + 1} de {totalPages}",
    "setPage((current) => Math.max(0, current - 1))",
    "setPage((current) => current + 1)",
    "historyQuery.isFetching",
  ]);
  if (page.includes("const historyQuery = useStudentPaymentHistory();")) {
    failures.push("Página B107 não pode permanecer presa ao primeiro lote padrão.");
  }
  if (page.includes("orders.slice(")) {
    failures.push("Página B107 não pode simular paginação recortando pedidos no cliente.");
  }
  if (page.includes("orders.length} pedido")) {
    failures.push("Página B107 não pode usar o tamanho da página como total financeiro.");
  }

  if (!parent.includes('await import("./check-student-payment-history-pagination.mjs")')) {
    failures.push("B107 não está encadeada no gate bloqueante B38.");
  }
  requireFragments(documentation, "Documentação B107", [
    "20 registros por página",
    "20 asserções",
    "p_limit",
    "p_offset",
    "summary.total_orders",
    "auth.uid()",
    "branch `dev`",
    "Nenhuma migration",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B107 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B107 aprovado: o aluno acessa todo o histórico financeiro por paginação real no servidor.",
);
