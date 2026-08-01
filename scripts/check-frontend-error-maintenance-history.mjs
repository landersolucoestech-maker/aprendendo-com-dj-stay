import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801060000_frontend_error_maintenance_history.sql",
  "supabase/tests/48_frontend_error_maintenance_history.test.sql",
  "src/contracts/frontend-errors.ts",
  "src/integrations/supabase/frontend-error-rpc.ts",
  "src/hooks/useFrontendErrors.ts",
  "src/components/admin/FrontendErrorMaintenanceHistory.tsx",
  "src/pages/admin/FrontendErrorsAdminWithHistory.tsx",
  "src/routing/lazy/admin-pages.ts",
  "docs/refactor/FASE-B36-FRONTEND-ERROR-MAINTENANCE-HISTORY.md",
  "package.json",
];
const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B36 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const test = readFileSync(requiredFiles[1], "utf8");
  const contracts = readFileSync(requiredFiles[2], "utf8");
  const rpc = readFileSync(requiredFiles[3], "utf8");
  const hooks = readFileSync(requiredFiles[4], "utf8");
  const component = readFileSync(requiredFiles[5], "utf8");
  const wrapper = readFileSync(requiredFiles[6], "utf8");
  const lazyPages = readFileSync(requiredFiles[7], "utf8");
  const documentation = readFileSync(requiredFiles[8], "utf8");
  const packageJson = readFileSync(requiredFiles[9], "utf8");

  for (const fragment of [
    "get_frontend_error_maintenance_history",
    "ADMIN_REQUIRED",
    "least(coalesce(p_limit, 50), 200)",
    "greatest(coalesce(p_offset, 0), 0)",
    "order by created_at desc, id desc",
    "security invoker",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B36 incompleta: ${fragment}`);
    }
  }

  if (!test.includes("select plan(14)")) failures.push("Plano pgTAP B36 deve conter 14 asserções.");
  if (!contracts.includes("frontendErrorMaintenanceHistorySchema")) failures.push("Schema Zod B36 ausente.");
  if (!rpc.includes('functionName: "get_frontend_error_maintenance_history"')) failures.push("RPC B36 ausente no cliente.");
  if (!hooks.includes("useFrontendErrorMaintenanceHistory")) failures.push("Hook B36 ausente.");
  if (!component.includes("Histórico de manutenção")) failures.push("Componente B36 ausente.");
  if (!wrapper.includes("FrontendErrorMaintenanceHistory")) failures.push("Histórico B36 não está renderizado na composição administrativa.");
  if (!lazyPages.includes('import("@/pages/admin/FrontendErrorsAdminWithHistory")')) failures.push("Rota administrativa não usa a composição B36.");
  if (!documentation.includes("SECURITY INVOKER")) failures.push("Documentação B36 incompleta.");
  if (!packageJson.includes('"check:frontend-error-maintenance-history"')) failures.push("Script B36 ausente no package.json.");
  if (!packageJson.includes("npm run check:frontend-error-maintenance-history")) failures.push("B36 não está integrado ao typecheck.");
}

if (failures.length > 0) {
  console.error("Contrato B36 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B36 aprovado: histórico administrativo paginado está integrado sem grants diretos.");
