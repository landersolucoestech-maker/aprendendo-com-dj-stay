import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const requiredFiles = [
  "supabase/migrations/20260731060600_affiliate_program_schema.sql",
  "supabase/migrations/20260731060700_affiliate_private_helpers.sql",
  "supabase/migrations/20260731060701_affiliate_profile_request_rpc.sql",
  "supabase/migrations/20260731060702_affiliate_profile_admin_rpc.sql",
  "supabase/migrations/20260731060703_affiliate_terms_admin_rpc.sql",
  "supabase/migrations/20260731060710_affiliate_link_rpcs.sql",
  "supabase/migrations/20260731060711_affiliate_click_rpc.sql",
  "supabase/migrations/20260731060720_affiliate_checkout_rpc.sql",
  "supabase/migrations/20260731060721_affiliate_order_sync.sql",
  "supabase/migrations/20260731060800_affiliate_commission_lifecycle.sql",
  "supabase/migrations/20260731060810_affiliate_payout_rpcs.sql",
  "supabase/migrations/20260731060900_affiliate_portal_rpc.sql",
  "supabase/migrations/20260731060910_affiliate_admin_portal_rpc.sql",
  "supabase/migrations/20260731060920_fix_affiliate_path_validation.sql",
  "supabase/migrations/20260731060921_fix_affiliate_checkout_execution.sql",
  "supabase/migrations/20260731060930_affiliate_public_invoker_wrappers.sql",
  "supabase/migrations/20260731060931_affiliate_admin_invoker_wrappers.sql",
  "supabase/migrations/20260731060932_affiliate_portal_invoker_wrappers.sql",
  "supabase/migrations/20260731060940_affiliate_foreign_key_indexes.sql",
  "supabase/migrations/20260731061020_private_schema_usage_for_invoker_wrappers.sql",
  "supabase/tests/35_affiliate_schema.test.sql",
  "supabase/tests/36_affiliate_attribution.test.sql",
  "supabase/tests/37_affiliate_commissions_payouts.test.sql",
  "src/contracts/affiliate.ts",
  "src/hooks/useAffiliateProgram.ts",
  "src/lib/affiliate-attribution.ts",
  "src/pages/AffiliateRedirect.tsx",
  "src/pages/affiliate/AffiliatePortal.tsx",
  "src/pages/admin/AffiliatesAdmin.tsx",
  "src/hooks/useHostedCheckout.ts",
  "src/App.tsx",
  "src/routing/RoleLandingRedirect.tsx",
];

const contents = new Map(
  await Promise.all(requiredFiles.map(async (file) => [file, await read(file)])),
);

const fail = (message) => {
  console.error(`FASE B20 bloqueada: ${message}`);
  process.exitCode = 1;
};

const requireText = (file, fragments) => {
  const content = contents.get(file) ?? "";
  for (const fragment of fragments) {
    if (!content.includes(fragment)) fail(`${file} não contém ${fragment}`);
  }
};

requireText("supabase/migrations/20260731060600_affiliate_program_schema.sql", [
  "create table public.affiliate_profiles",
  "create table public.affiliate_links",
  "create table public.affiliate_clicks",
  "create table public.affiliate_attributions",
  "create table public.affiliate_commissions",
  "create table public.affiliate_payouts",
  "force row level security",
  "affiliate_links_one_active_subject_uidx",
  "affiliate_attributions_active_visitor_subject_uidx",
]);
requireText("supabase/migrations/20260731060711_affiliate_click_rpc.sql", [
  "extensions.digest(p_visitor_token::text, 'sha256')",
  "extensions.digest(p_user_agent, 'sha256')",
  "Substituída por atribuição last-click mais recente.",
  "grant execute on function public.record_affiliate_click",
]);
requireText("supabase/migrations/20260731060720_affiliate_checkout_rpc.sql", [
  "Autoindicação não permitida.",
  "affiliate_attribution_id = v_attribution.id",
  "'commission_bps', v_attribution.commission_bps",
]);
requireText("supabase/migrations/20260731060721_affiliate_order_sync.sql", [
  "affiliate_attribution_id",
  "new.affiliate_attribution_id",
]);
requireText("supabase/migrations/20260731060800_affiliate_commission_lifecycle.sql", [
  "commission_adjustments_apply_affiliate_commission",
  "v_attribution.commission_bps",
  "on conflict (order_id) do nothing",
  "clawback_due",
]);
requireText("supabase/migrations/20260731060810_affiliate_payout_rpcs.sql", [
  "admin_create_affiliate_payout",
  "admin_mark_affiliate_payout_paid",
  "p_external_reference",
  "admin_cancel_affiliate_payout",
  "for update of commission_record",
]);
requireText("supabase/migrations/20260731060930_affiliate_public_invoker_wrappers.sql", [
  "set schema private",
  "security invoker",
  "private.record_affiliate_click",
]);
requireText("supabase/migrations/20260731060931_affiliate_admin_invoker_wrappers.sql", [
  "set schema private",
  "security invoker",
  "private.admin_mark_affiliate_payout_paid",
]);
requireText("supabase/migrations/20260731060932_affiliate_portal_invoker_wrappers.sql", [
  "private.get_affiliate_portal",
  "private.get_affiliate_admin_dashboard",
  "language sql security invoker",
]);
requireText("supabase/migrations/20260731060940_affiliate_foreign_key_indexes.sql", [
  "affiliate_profiles_created_by_idx",
  "affiliate_subject_terms_updated_by_idx",
  "affiliate_payouts_paid_by_idx",
  "affiliate_events_actor_idx",
]);
requireText("supabase/migrations/20260731061020_private_schema_usage_for_invoker_wrappers.sql", [
  "grant usage on schema private to anon, authenticated",
]);
requireText("src/hooks/useHostedCheckout.ts", [
  '"prepare_checkout_intent_with_attribution"',
  'supabase.functions.invoke("create-asaas-checkout"',
  "getStoredAffiliateVisitorToken()",
]);
requireText("src/App.tsx", [
  'path="/r/:code"',
  'path="/afiliado"',
  'path="/admin/afiliados"',
  "<AffiliateRoute>",
  "<AdminRoute>",
]);
requireText("src/routing/RoleLandingRedirect.tsx", ['to="/afiliado"']);
requireText("src/pages/AffiliateRedirect.tsx", [
  'supabase.rpc("record_affiliate_click"',
  "ensureAffiliateVisitorToken()",
  "window.location.replace(result.destination_path)",
]);
requireText("src/pages/admin/AffiliatesAdmin.tsx", [
  "Programa de afiliados",
  "Comissões disponíveis",
  "externalReference",
  "createAffiliatePayout",
  "suspendProfile",
]);

const allMigrationText = [...contents.entries()]
  .filter(([file]) => file.startsWith("supabase/migrations/2026073106"))
  .map(([, content]) => content)
  .join("\n")
  .toLowerCase();
if (allMigrationText.includes("ip_address") || /\binet\b/.test(allMigrationText)) {
  fail("o programa de afiliados não pode persistir IP bruto");
}

const finalInvokerMigrations = [
  contents.get("supabase/migrations/20260731060930_affiliate_public_invoker_wrappers.sql") ?? "",
  contents.get("supabase/migrations/20260731060931_affiliate_admin_invoker_wrappers.sql") ?? "",
  contents.get("supabase/migrations/20260731060932_affiliate_portal_invoker_wrappers.sql") ?? "",
].join("\n").toLowerCase();
if (finalInvokerMigrations.includes("security definer")) {
  fail("os wrappers públicos finais da B20 não podem usar SECURITY DEFINER");
}

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(absolute)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(absolute);
  }
  return files;
};

const sourceFiles = await collectSourceFiles(path.join(root, "src"));
for (const sourceFile of sourceFiles) {
  const source = await readFile(sourceFile, "utf8");
  if (/\.from\(["']affiliate_/.test(source)) {
    fail(`${path.relative(root, sourceFile)} faz DML ou leitura direta do domínio de afiliados`);
  }
}

const checkoutSource = contents.get("src/hooks/useHostedCheckout.ts") ?? "";
if (
  checkoutSource.indexOf('"prepare_checkout_intent_with_attribution"') >
  checkoutSource.indexOf('supabase.functions.invoke("create-asaas-checkout"')
) {
  fail("a atribuição precisa ser anexada antes da chamada ao checkout hospedado");
}

if (process.exitCode) process.exit(process.exitCode);
await import("./check-affiliate-admin-pagination.mjs");
console.log("Contrato estático da FASE B20 aprovado.");
