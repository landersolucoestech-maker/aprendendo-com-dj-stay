import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801170000_payment_admin_dashboard.sql",
  "supabase/tests/49_payment_admin_dashboard.test.sql",
  "src/contracts/payment-admin.ts",
  "src/integrations/supabase/payment-admin-rpc.ts",
  "src/hooks/usePaymentAdmin.ts",
  "src/pages/admin/PaymentsAdmin.tsx",
  "src/routing/lazy/admin-pages.ts",
  "src/App.tsx",
  "docs/refactor/FASE-B37-PAYMENT-ADMIN-DASHBOARD.md",
  "package.json",
];
const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B37 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const test = readFileSync(requiredFiles[1], "utf8");
  const contracts = readFileSync(requiredFiles[2], "utf8");
  const rpc = readFileSync(requiredFiles[3], "utf8");
  const hook = readFileSync(requiredFiles[4], "utf8");
  const page = readFileSync(requiredFiles[5], "utf8");
  const lazyPages = readFileSync(requiredFiles[6], "utf8");
  const app = readFileSync(requiredFiles[7], "utf8");
  const docs = readFileSync(requiredFiles[8], "utf8");
  const packageJson = readFileSync(requiredFiles[9], "utf8");

  for (const fragment of [
    "get_payment_admin_dashboard",
    "ADMIN_REQUIRED",
    "security definer",
    "security invoker",
    "least(coalesce(p_limit, 50), 200)",
    "greatest(coalesce(p_offset, 0), 0)",
    "left join auth.users",
    "left join lateral",
    "payment_confirmed_at is not null",
    "order by payment_order.created_at desc, payment_order.id desc",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B37 incompleta: ${fragment}`);
    }
  }

  if (!test.includes("select plan(16)")) failures.push("Plano pgTAP B37 deve conter 16 asserções.");
  if (!contracts.includes("paymentAdminDashboardSchema")) failures.push("Contrato Zod B37 ausente.");
  if (!rpc.includes('functionName: "get_payment_admin_dashboard"')) failures.push("Cliente RPC B37 ausente.");
  if (!hook.includes("usePaymentAdminDashboard")) failures.push("Hook B37 ausente.");
  for (const fragment of [
    "Pedidos e pagamentos",
    "Visão operacional somente leitura",
    "confirmed_amount_cents",
    "latest_attempt",
    "entitlement",
  ]) {
    if (!page.includes(fragment)) failures.push(`Página administrativa B37 incompleta: ${fragment}`);
  }
  if (!lazyPages.includes("PaymentsAdmin")) failures.push("Lazy page B37 ausente.");
  if (!app.includes('path="/admin/pagamentos"')) failures.push("Rota protegida B37 ausente.");
  if (!docs.includes("não permite marcar pedidos como pagos")) failures.push("Regra de somente leitura B37 não documentada.");
  if (!packageJson.includes('"check:payment-admin-dashboard"')) failures.push("Script B37 ausente no package.json.");
  if (!packageJson.includes("npm run check:payment-admin-dashboard")) failures.push("B37 não está integrado ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B37 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B37 aprovado: painel administrativo financeiro somente leitura está integrado.");
