import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803023000_payment_admin_analytics.sql",
  databaseTest: "supabase/tests/64_payment_admin_analytics.test.sql",
  contract: "src/contracts/payment-analytics.ts",
  contractTest: "src/contracts/payment-analytics.test.ts",
  generatedTypes: "src/integrations/supabase/types.ts",
  rpc: "src/integrations/supabase/payment-analytics-rpc.ts",
  hook: "src/hooks/usePaymentAnalytics.ts",
  component: "src/components/admin/PaymentAnalyticsCard.tsx",
  page: "src/pages/admin/PaymentsAdmin.tsx",
  parent: "scripts/check-payment-admin-dashboard.mjs",
  documentation: "docs/refactor/FASE-B96-PAYMENT-ADMIN-ANALYTICS.md",
  status: "docs/STATUS.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B96 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const generatedTypes = read(paths.generatedTypes);
  const rpc = read(paths.rpc);
  const hook = read(paths.hook);
  const component = read(paths.component);
  const page = read(paths.page);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();
  const status = read(paths.status).toLowerCase();

  requireFragments(migration, "Migration B96", [
    "private.get_payment_admin_analytics",
    "public.get_payment_admin_analytics",
    "security definer",
    "security invoker",
    "ADMIN_REQUIRED",
    "PAYMENT_ANALYTICS_PERIOD_INVALID",
    "PAYMENT_ANALYTICS_PERIOD_TOO_LARGE",
    "interval '366 days'",
    "least(greatest(coalesce(p_top_limit, 10), 1), 20)",
    "payment_order.payment_confirmed_at >= v_start_at",
    "payment_order.payment_confirmed_at < v_end_at",
    "America/Sao_Paulo",
    "net_after_reversals_cents",
    "average_ticket_cents",
    "unique_customers",
    "status_breakdown",
    "subject_breakdown",
    "top_offers",
    "daily",
  ]);
  for (const forbidden of [
    "provider_payment_id",
    "provider_checkout_id",
    "customer_email",
    "net.http_post",
    "service_role_key",
  ]) {
    if (migration.toLowerCase().includes(forbidden)) {
      failures.push(`Analytics B96 expõe ou depende de campo proibido: ${forbidden}`);
    }
  }

  requireFragments(databaseTest, "pgTAP B96", [
    "select plan(37)",
    "student cannot inspect payment analytics",
    "analytics calculates gross confirmed revenue",
    "analytics calculates revenue retained after completed reversals",
    "analytics calculates the average confirmed ticket",
    "top offer uses the latest persisted title snapshot",
    "daily series includes zero-value days without fabrication",
    "analytics rejects a period longer than 366 days",
  ]);
  requireFragments(contract, "Contrato B96", [
    "paymentAdminAnalyticsSchema",
    "validateNetBreakdown",
    "Receita líquida diverge das reversões persistidas.",
    "Ticket médio diverge dos pedidos confirmados.",
    ".length(10)",
    ".length(2)",
    ".max(20)",
    ".max(367)",
  ]);
  requireFragments(contractTest, "Teste unitário B96", [
    'describe("paymentAdminAnalyticsSchema"',
    "accepts a coherent persisted financial snapshot",
    "rejects net revenue that diverges from completed reversals",
    "rejects provider or customer identifiers",
  ]);
  requireFragments(generatedTypes, "Tipos gerados B96", [
    "get_payment_admin_analytics:",
    "p_start_at?: string",
    "p_end_at?: string",
    "p_top_limit?: number",
  ]);
  requireFragments(rpc, "Cliente RPC B96", [
    'functionName: "get_payment_admin_analytics"',
    "p_start_at?: string | null",
    "p_end_at?: string | null",
  ]);
  requireFragments(hook, "Hook B96", [
    "usePaymentAdminAnalytics",
    '"get_payment_admin_analytics"',
    '"analytics financeiro administrativo"',
  ]);
  requireFragments(component, "Componente B96", [
    "RANGE_OPTIONS = [7, 30, 90, 365]",
    "Desempenho financeiro",
    "Receita bruta",
    "Após reversões",
    "Ticket médio",
    "Clientes únicos",
    "Ofertas mais vendidas",
    "Últimos dias do período",
    "não tarifas do provider, impostos ou comissões",
  ]);
  for (const ambiguousClaim of [
    "Lucro líquido",
    "Receita líquida fiscal",
    "Receita líquida contábil",
  ]) {
    if (component.includes(ambiguousClaim)) {
      failures.push(`Componente B96 contém alegação financeira ambígua: ${ambiguousClaim}`);
    }
  }
  requireFragments(page, "Página financeira B96", [
    "PaymentAnalyticsCard",
    'aria-label="Analytics financeiro por período"',
    'aria-label="Resumo financeiro vitalício"',
    "usePaymentAdminDashboard",
    "setSearch(event.target.value)",
    "setStatus(",
    "setSubjectType(",
    "setPage((current) => Math.max(0, current - 1))",
    "setPage((current) => current + 1)",
    'placeholder="Buscar por pedido, título ou e-mail"',
    'aria-label="Filtrar por status do pedido"',
    'aria-label="Filtrar por tipo do item"',
  ]);
  if (!parent.includes('await import("./check-payment-admin-analytics.mjs")')) {
    failures.push("B96 não está encadeada no gate bloqueante B37.");
  }
  requireFragments(documentation, "Documentação B96", [
    "366 dias",
    "america/sao_paulo",
    "ticket médio",
    "reembolsos concluídos",
    "chargebacks perdidos",
    "tarifas",
    "branch `dev`",
  ]);
  requireFragments(status, "STATUS B96", [
    "analytics financeiro",
    "receita confirmada",
    "reversões",
    "ticket médio",
    "clientes únicos",
    "receita por tipo",
    "ranking",
    "série diária",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B96 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B96 aprovado: o proprietário possui analytics financeiro real, filtrável, completo e semanticamente delimitado.",
);
