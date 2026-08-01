import { existsSync, readFileSync } from "node:fs";

const paths = Object.freeze({
  schemaMigration:
    "supabase/migrations/20260801040000_frontend_error_observability.sql",
  indexMigration:
    "supabase/migrations/20260801040100_frontend_error_observability_indexes.sql",
  idempotencyMigration:
    "supabase/migrations/20260801040200_frontend_error_idempotency_hardening.sql",
  databaseTest: "supabase/tests/46_frontend_error_observability.test.sql",
  contracts: "src/contracts/frontend-errors.ts",
  rpcClient: "src/integrations/supabase/frontend-error-rpc.ts",
  reporting: "src/observability/frontend-error-reporting.ts",
  hooks: "src/hooks/useFrontendErrors.ts",
  adminPage: "src/pages/admin/FrontendErrorsAdmin.tsx",
  contactsPage: "src/pages/admin/ContactsAdmin.tsx",
  routeBoundary: "src/routing/RouteErrorBoundary.tsx",
  lazyAdminPages: "src/routing/lazy/admin-pages.ts",
  app: "src/App.tsx",
  main: "src/main.tsx",
});

const failures = [];
for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B31 ausente: ${path}`);
}

if (failures.length === 0) {
  const schemaMigration = readFileSync(paths.schemaMigration, "utf8");
  const indexMigration = readFileSync(paths.indexMigration, "utf8");
  const idempotencyMigration = readFileSync(
    paths.idempotencyMigration,
    "utf8",
  );
  const databaseTest = readFileSync(paths.databaseTest, "utf8");
  const contracts = readFileSync(paths.contracts, "utf8");
  const rpcClient = readFileSync(paths.rpcClient, "utf8");
  const reporting = readFileSync(paths.reporting, "utf8");
  const hooks = readFileSync(paths.hooks, "utf8");
  const adminPage = readFileSync(paths.adminPage, "utf8");
  const contactsPage = readFileSync(paths.contactsPage, "utf8");
  const routeBoundary = readFileSync(paths.routeBoundary, "utf8");
  const lazyAdminPages = readFileSync(paths.lazyAdminPages, "utf8");
  const app = readFileSync(paths.app, "utf8");
  const main = readFileSync(paths.main, "utf8");

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
    if (!schemaMigration.includes(fragment)) {
      failures.push(`Migração B31 não preserva o contrato: ${fragment}`);
    }
  }

  if (
    /grant execute on function public\.capture_frontend_error\([^;]+\)\s+to anon;/is.test(
      schemaMigration,
    )
  ) {
    failures.push("Captura B31 não pode ser executável por anon.");
  }
  if (/\b(ip_address|user_agent)\b/i.test(schemaMigration)) {
    failures.push("Migração B31 não pode persistir IP ou user-agent bruto.");
  }
  if (!indexMigration.includes("frontend_error_events_handled_by_idx")) {
    failures.push("Migração B31 deve cobrir a FK handled_by_user_id.");
  }
  for (const fragment of [
    "create or replace function private.capture_frontend_error",
    "user_id = v_user_id",
    "FRONTEND_ERROR_EVENT_ID_CONFLICT",
  ]) {
    if (!idempotencyMigration.includes(fragment)) {
      failures.push(`Hardening de idempotência B31 incompleto: ${fragment}`);
    }
  }
  if (!databaseTest.includes("select plan(36)")) {
    failures.push("Teste pgTAP B31 deve manter 36 asserções.");
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
  if (
    !hooks.includes("get_frontend_error_dashboard") ||
    !hooks.includes("update_frontend_error_status")
  ) {
    failures.push("Hooks B31 não consomem as RPCs administrativas.");
  }
  if (
    !adminPage.includes("useFrontendErrorDashboard") ||
    !adminPage.includes("useUpdateFrontendErrorStatus")
  ) {
    failures.push("Página administrativa B31 não consome os hooks reais.");
  }
  if (!contactsPage.includes('to="/admin/erros"')) {
    failures.push("Navegação administrativa deve expor a fila de erros B31.");
  }
  if (
    !routeBoundary.includes("reportFrontendError") ||
    routeBoundary.includes("console.error")
  ) {
    failures.push(
      "RouteErrorBoundary deve persistir o erro sem depender de console.error.",
    );
  }
  if (!main.includes("installGlobalFrontendErrorHandlers();")) {
    failures.push("main.tsx deve instalar os handlers globais B31.");
  }
  if (!lazyAdminPages.includes("FrontendErrorsAdmin")) {
    failures.push("Página B31 deve permanecer lazy-loaded.");
  }
  if (
    !app.includes('path="/admin/erros"') ||
    !app.includes("<FrontendErrorsAdmin />")
  ) {
    failures.push("Rota administrativa B31 deve existir e usar AdminRoute.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B31 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B31 de observabilidade do frontend validado.");
