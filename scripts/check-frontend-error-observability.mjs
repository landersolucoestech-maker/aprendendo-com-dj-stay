import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801040000_frontend_error_observability.sql",
  "supabase/migrations/20260801040100_frontend_error_observability_indexes.sql",
  "supabase/tests/46_frontend_error_observability.test.sql",
  "src/contracts/frontend-errors.ts",
  "src/integrations/supabase/frontend-error-rpc.ts",
  "src/observability/frontend-error-reporting.ts",
  "src/hooks/useFrontendErrors.ts",
  "src/pages/admin/FrontendErrorsAdmin.tsx",
  "src/routing/RouteErrorBoundary.tsx",
  "src/routing/lazy/admin-pages.ts",
  "src/App.tsx",
  "src/main.tsx",
];

const failures = [];
for (const path of requiredFiles) {
  if (!existsSync(path)) failures.push(`Arquivo B31 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const indexMigration = readFileSync(requiredFiles[1], "utf8");
  const databaseTest = readFileSync(requiredFiles[2], "utf8");
  const contracts = readFileSync(requiredFiles[3], "utf8");
  const rpcClient = readFileSync(requiredFiles[4], "utf8");
  const reporting = readFileSync(requiredFiles[5], "utf8");
  const hooks = readFileSync(requiredFiles[6], "utf8");
  const adminPage = readFileSync(requiredFiles[7], "utf8");
  const routeBoundary = readFileSync(requiredFiles[8], "utf8");
  const lazyAdminPages = readFileSync(requiredFiles[9], "utf8");
  const app = readFileSync(requiredFiles[10], "utf8");
  const main = readFileSync(requiredFiles[11], "utf8");

  for (const fragment of [
    "create table public.frontend_error_events",
    "frontend_error_events_direct_access_denied",
    "security definer",
    "AUTH_REQUIRED",
    "ADMIN_REQUIRED",
    "[EMAIL_REDACTED]",
    "[JWT_REDACTED]",
    "[TOKEN_REDACTED]",
    "capture_frontend_error",
    "get_frontend_error_dashboard",
    "update_frontend_error_status",
  ]) {
    if (!migration.includes(fragment)) {
      failures.push(`Migração B31 não preserva o contrato: ${fragment}`);
    }
  }

  if (
    migration.includes("grant execute on function public.capture_frontend_error") &&
    migration.includes("to anon")
  ) {
    failures.push("Captura B31 não pode ser executável por anon.");
  }
  if (/\b(ip_address|user_agent)\b/i.test(migration)) {
    failures.push("Migração B31 não pode persistir IP ou user-agent bruto.");
  }
  if (!indexMigration.includes("frontend_error_events_handled_by_idx")) {
    failures.push("Migração B31 deve cobrir a FK handled_by_user_id.");
  }
  if (!databaseTest.includes("select plan(35)")) {
    failures.push("Teste pgTAP B31 deve manter 35 asserções.");
  }

  for (const fragment of [
    "frontendErrorSourceSchema",
    "frontendErrorStatusSchema",
    "frontendErrorDashboardSchema",
  ]) {
    if (!contracts.includes(fragment)) {
      failures.push(`Contratos B31 incompletos: ${fragment}`);
    }
  }

  for (const rpcName of [
    "capture_frontend_error",
    "get_frontend_error_dashboard",
    "update_frontend_error_status",
  ]) {
    if (!rpcClient.includes(rpcName)) {
      failures.push(`Cliente RPC B31 não cobre ${rpcName}.`);
    }
  }

  for (const fragment of [
    "reportedFingerprints",
    "supabase.auth.getSession()",
    "capture_frontend_error",
    "installGlobalFrontendErrorHandlers",
    'source: "window_error"',
    'source: "unhandled_rejection"',
  ]) {
    if (!reporting.includes(fragment)) {
      failures.push(`Captura frontend B31 incompleta: ${fragment}`);
    }
  }

  if (reporting.includes("service_role")) {
    failures.push("Frontend B31 não pode mencionar service role.");
  }
  if (!hooks.includes("get_frontend_error_dashboard") || !hooks.includes("update_frontend_error_status")) {
    failures.push("Hooks B31 não consomem as RPCs administrativas.");
  }
  if (!adminPage.includes("useFrontendErrorDashboard") || !adminPage.includes("useUpdateFrontendErrorStatus")) {
    failures.push("Página administrativa B31 não consome os hooks reais.");
  }
  if (!routeBoundary.includes("reportFrontendError") || routeBoundary.includes("console.error")) {
    failures.push("RouteErrorBoundary deve persistir o erro sem depender de console.error.");
  }
  if (!main.includes("installGlobalFrontendErrorHandlers();")) {
    failures.push("main.tsx deve instalar os handlers globais B31.");
  }
  if (!lazyAdminPages.includes("FrontendErrorsAdmin")) {
    failures.push("Página B31 deve permanecer lazy-loaded.");
  }
  if (!app.includes('path="/admin/erros"') || !app.includes("<FrontendErrorsAdmin />")) {
    failures.push("Rota administrativa B31 deve existir e usar AdminRoute.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B31 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B31 de observabilidade do frontend validado.");
