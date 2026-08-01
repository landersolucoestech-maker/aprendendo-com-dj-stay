import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "supabase/migrations/20260801050000_frontend_error_quota_retention.sql",
  "supabase/tests/47_frontend_error_quota_retention.test.sql",
  "src/contracts/frontend-errors.ts",
  "src/integrations/supabase/frontend-error-rpc.ts",
  "src/hooks/useFrontendErrors.ts",
  "src/pages/admin/FrontendErrorsAdmin.tsx",
  "docs/refactor/FASE-B35-FRONTEND-ERROR-QUOTA-RETENTION.md",
  "package.json",
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`Arquivo B35 ausente: ${file}`);
}

if (failures.length === 0) {
  const migration = readFileSync(requiredFiles[0], "utf8");
  const test = readFileSync(requiredFiles[1], "utf8");
  const contracts = readFileSync(requiredFiles[2], "utf8");
  const rpc = readFileSync(requiredFiles[3], "utf8");
  const hooks = readFileSync(requiredFiles[4], "utf8");
  const adminPage = readFileSync(requiredFiles[5], "utf8");
  const documentation = readFileSync(requiredFiles[6], "utf8");
  const packageJson = readFileSync(requiredFiles[7], "utf8");

  for (const fragment of [
    "pg_advisory_xact_lock",
    "hashtextextended",
    "v_recent_count >= 120",
    "FRONTEND_ERROR_RATE_LIMITED",
    "FRONTEND_ERROR_EVENT_ID_CONFLICT",
    "for update skip locked",
    "resolved_at < v_cutoff",
    "frontend_error_maintenance_events",
    "retention_days between 30 and 3650",
    "v_limit not between 1 and 5000",
    "ADMIN_REQUIRED",
  ]) {
    if (!migration.toLowerCase().includes(fragment.toLowerCase())) {
      failures.push(`Migration B35 incompleta: ${fragment}`);
    }
  }

  if (!test.includes("select plan(36)")) {
    failures.push("Plano pgTAP B35 deve conter exatamente 36 asserções.");
  }
  if (!contracts.includes("frontendErrorPurgeResultSchema")) {
    failures.push("Contrato Zod do expurgo B35 ausente.");
  }
  if (!rpc.includes('functionName: "purge_frontend_error_events"')) {
    failures.push("Cliente RPC não declara purge_frontend_error_events.");
  }
  if (!hooks.includes("usePurgeFrontendErrors")) {
    failures.push("Hook administrativo de retenção B35 ausente.");
  }
  for (const fragment of [
    "Expurgar incidentes encerrados",
    "window.confirm(",
    "useState<number>(90)",
    "batchLimit: 1000",
  ]) {
    if (!adminPage.includes(fragment)) {
      failures.push(`Interface administrativa B35 incompleta: ${fragment}`);
    }
  }
  for (const fragment of [
    "120 incidentes distintos por usuário por hora",
    "30 dias",
    "90 dias",
    "resolved",
    "ignored",
    "SKIP LOCKED",
  ]) {
    if (!documentation.includes(fragment)) {
      failures.push(`Documentação B35 incompleta: ${fragment}`);
    }
  }
  if (!packageJson.includes('"check:frontend-error-quota-retention"')) {
    failures.push("Script B35 não registrado no package.json.");
  }
  if (!packageJson.includes("npm run check:frontend-error-quota-retention")) {
    failures.push("B35 não está integrado ao typecheck.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B35 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B35 aprovado: quota transacional e retenção auditável estão integradas.");
