import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803010000_checkout_expiration_cron_health.sql",
  databaseTest: "supabase/tests/62_checkout_expiration_cron_health.test.sql",
  contract: "src/contracts/checkout-cron-health.ts",
  contractTest: "src/contracts/checkout-cron-health.test.ts",
  generatedTypes: "src/integrations/supabase/types.ts",
  rpc: "src/integrations/supabase/checkout-cron-health-rpc.ts",
  hook: "src/hooks/useCheckoutCronHealth.ts",
  component: "src/components/admin/CheckoutCronHealthCard.tsx",
  page: "src/pages/admin/AdminDashboard.tsx",
  parent: "scripts/check-checkout-expiration-cron.mjs",
  documentation: "docs/refactor/FASE-B93-CHECKOUT-CRON-HEALTH.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B93 ausente: ${path}`);
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
  const status = read(paths.status);

  requireFragments(migration, "Migration B93", [
    "private.get_checkout_expiration_cron_health",
    "public.get_checkout_expiration_cron_health",
    "security definer",
    "security invoker",
    "ADMIN_REQUIRED",
    "least(greatest(coalesce(p_run_limit, 10), 1), 25)",
    "cron.job_run_details",
    "failed_runs_24h",
    "last_success_at",
    "regexp_replace",
    "grant execute on function public.get_checkout_expiration_cron_health(integer)",
  ]);
  for (const forbiddenKey of [
    "'command'",
    "'username'",
    "'database'",
    "'job_pid'",
    "'jobid'",
    "'runid'",
  ]) {
    if (migration.includes(forbiddenKey)) {
      failures.push(`Read model B93 expõe metadado interno: ${forbiddenKey}`);
    }
  }

  requireFragments(databaseTest, "pgTAP B93", [
    "select plan(34)",
    "student cannot inspect checkout cron health",
    "configured job without history is reported as never run",
    "checkout cron health payload omits internal cron metadata",
    "a recent failed execution degrades cron health",
    "inactive checkout expiration job is reported explicitly",
    "missing checkout expiration job has an explicit health state",
  ]);
  requireFragments(contract, "Contrato B93", [
    "checkoutCronHealthStatusSchema",
    "checkoutCronRunSchema",
    "checkoutCronHealthSchema",
    ".strict()",
    ".max(25)",
    "Um job ausente não pode estar ativo nem possuir agenda.",
  ]);
  requireFragments(contractTest, "Teste unitário B93", [
    'describe("checkoutCronHealthSchema"',
    "accepts a sanitized persisted health snapshot",
    "rejects internal pg_cron metadata",
    "rejects incoherent missing and inactive states",
  ]);
  requireFragments(generatedTypes, "Tipos gerados B93", [
    "get_checkout_expiration_cron_health:",
    "Args: { p_run_limit?: number }",
    "Returns: Json",
  ]);
  requireFragments(rpc, "Cliente RPC B93", [
    'functionName: "get_checkout_expiration_cron_health"',
    "p_run_limit?: number",
  ]);
  requireFragments(hook, "Hook B93", [
    "useCheckoutCronHealth",
    '"get_checkout_expiration_cron_health"',
    "checkoutCronHealthSchema",
    '"saúde do cron de expiração de checkout"',
  ]);
  requireFragments(component, "Componente B93", [
    "useCheckoutCronHealth(8)",
    "Automação de checkout",
    "Falhas em 24h",
    "Execuções recentes",
    "formatAppDateTime",
    "cronHealthQuery.refetch()",
  ]);
  for (const forbidden of ["run.command", "run.username", "run.database", "run.job_pid", "run.jobid", "run.runid"]) {
    if (component.includes(forbidden)) failures.push(`Componente B93 usa metadado interno: ${forbidden}`);
  }
  requireFragments(page, "Dashboard B93", [
    "CheckoutCronHealthCard",
    'aria-label="Saúde da automação de checkout"',
  ]);
  if (!parent.includes('await import("./check-checkout-cron-health.mjs")')) {
    failures.push("B93 não está encadeada no gate bloqueante B92.");
  }
  requireFragments(documentation, "Documentação B93", [
    "cron.job_run_details",
    "proprietário",
    "metadados internos",
    "retenção",
    "branch `dev`",
  ]);
  if (!status.includes("Saúde do cron")) {
    failures.push("STATUS não registra a observabilidade B93.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B93 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B93 aprovado: o proprietário enxerga a saúde sanitizada do cron sem acesso ao schema ou aos metadados internos.",
);
