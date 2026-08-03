import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801180000_student_payment_history.sql",
  "supabase/tests/50_student_payment_history.test.sql",
  "src/contracts/student-payments.ts",
  "src/integrations/supabase/student-payment-rpc.ts",
  "src/hooks/useStudentPayments.ts",
  "src/pages/student/StudentFinancialPortal.tsx",
  "src/pages/student/StudentPortalRouter.tsx",
  "src/routing/lazy/student-pages.ts",
  "src/App.tsx",
  "docs/refactor/FASE-B38-STUDENT-PAYMENT-HISTORY.md",
  "package.json",
];
const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B38 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const test = readFileSync(requiredFiles[1], "utf8");
  const contracts = readFileSync(requiredFiles[2], "utf8");
  const rpc = readFileSync(requiredFiles[3], "utf8");
  const hook = readFileSync(requiredFiles[4], "utf8");
  const page = readFileSync(requiredFiles[5], "utf8");
  const router = readFileSync(requiredFiles[6], "utf8");
  const lazyPages = readFileSync(requiredFiles[7], "utf8");
  const app = readFileSync(requiredFiles[8], "utf8");
  const docs = readFileSync(requiredFiles[9], "utf8");
  const packageJson = readFileSync(requiredFiles[10], "utf8");

  for (const fragment of [
    "get_my_payment_history",
    "v_user_id uuid := auth.uid()",
    "AUTH_REQUIRED",
    "payment_order.user_id = v_user_id",
    "least(coalesce(p_limit, 50), 100)",
    "security invoker",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B38 incompleta: ${fragment}`);
    }
  }
  for (const forbidden of ["payment_provider_events", "payload", "p_user_id"]) {
    if (migration.toLowerCase().includes(forbidden)) {
      failures.push(`Migration B38 expõe campo proibido: ${forbidden}`);
    }
  }
  if (!test.includes("select plan(15)")) failures.push("Plano pgTAP B38 deve conter 15 asserções.");
  if (!contracts.includes("studentPaymentHistorySchema")) failures.push("Contrato Zod B38 ausente.");
  if (!rpc.includes('functionName: "get_my_payment_history"')) failures.push("Cliente RPC B38 ausente.");
  if (rpc.includes("user_id") || rpc.includes("p_user_id")) failures.push("Cliente B38 não pode aceitar user_id.");
  if (!hook.includes("useStudentPaymentHistory")) failures.push("Hook B38 ausente.");
  for (const fragment of ["Pedidos reais", "Última cobrança", "Situação do acesso"]) {
    if (!page.includes(fragment)) failures.push(`Página financeira B38 incompleta: ${fragment}`);
  }
  if (!router.includes('section === "orders" || section === "payments"')) failures.push("Roteador B38 não intercepta seções financeiras.");
  if (!router.includes("StudentFinancialPortal")) failures.push("Roteador B38 não renderiza o portal financeiro.");
  if (!lazyPages.includes("StudentPortalRouter")) failures.push("Lazy route B38 ainda aponta para o placeholder antigo.");
  for (const route of ['path="/aluno/pedidos"', 'path="/aluno/pagamentos"']) {
    if (!app.includes(route)) failures.push(`Rota financeira B38 ausente: ${route}`);
  }
  if (!docs.includes("não existe argumento `user_id`")) failures.push("Isolamento por auth.uid não documentado.");
  if (!packageJson.includes('"check:student-payment-history"')) failures.push("Script B38 ausente no package.json.");
  if (!packageJson.includes("npm run check:student-payment-history")) failures.push("B38 não está integrado ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B38 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-student-payment-history-pagination.mjs");

console.log("Contrato B38 aprovado: pedidos e pagamentos reais do aluno estão isolados por auth.uid().");
