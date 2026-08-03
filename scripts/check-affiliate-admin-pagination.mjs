import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803053000_affiliate_admin_pagination.sql",
  databaseTest: "supabase/tests/68_affiliate_admin_pagination.test.sql",
  contract: "src/contracts/affiliate-admin-pagination.ts",
  contractTest: "src/contracts/affiliate-admin-pagination.test.ts",
  hook: "src/hooks/useAffiliateProgram.ts",
  page: "src/pages/admin/AffiliatesAdmin.tsx",
  documentation: "docs/refactor/FASE-B102-AFFILIATE-ADMIN-PAGINATION.md",
  parent: "scripts/check-affiliate-portal-contract.mjs",
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
  if (!existsSync(path)) failures.push(`Arquivo B102 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const documentation = read(paths.documentation).toLowerCase();
  const parent = read(paths.parent);

  requireFragments(migration, "Migration B102", [
    "drop function if exists public.get_affiliate_admin_dashboard()",
    "drop function if exists private.get_affiliate_admin_dashboard()",
    "private.get_affiliate_admin_dashboard(",
    "public.get_affiliate_admin_dashboard(",
    "p_profile_limit integer default 25",
    "p_offer_limit integer default 25",
    "p_commission_limit integer default 25",
    "p_payout_limit integer default 25",
    "greatest(1, least(coalesce(p_profile_limit, 25), 100))",
    "greatest(0, coalesce(p_profile_offset, 0))",
    "security definer",
    "security invoker",
    "admin_role_required",
    "'totals'",
    "'available_commissions'",
    "limit v_profile_limit offset v_profile_offset",
    "limit v_offer_limit offset v_offer_offset",
    "limit v_commission_limit offset v_commission_offset",
    "limit v_payout_limit offset v_payout_offset",
  ]);

  requireFragments(databaseTest, "pgTAP B102", [
    "select plan(20)",
    "legacy private zero-argument dashboard is removed",
    "legacy public zero-argument dashboard is removed",
    "affiliate cannot inspect affiliate administration",
    "profile total is independent from profile page size",
    "adjacent profile pages do not overlap",
    "zero limits are clamped to one",
    "negative offsets are clamped to zero",
    "each affiliate collection applies its own limit and offset",
  ]);

  requireFragments(contract, "Contrato B102", [
    "affiliateAdminTotalsSchema",
    "paginatedAffiliateAdminDashboardSchema",
    "available_commissions: z.number().int().nonnegative()",
    "A página não pode conter mais registros que o total persistido.",
  ]);
  requireFragments(contractTest, "Teste unitário B102", [
    'describe("paginatedAffiliateAdminDashboardSchema"',
    "aceita páginas vazias com totais coerentes",
    "aceita totais maiores que as páginas carregadas",
    "rejeita página maior que o total persistido",
    "rejeita totais negativos e campos extras",
  ]);

  requireFragments(hook, "Hook B102", [
    "interface AffiliateAdminPaginationInput",
    "paginatedAffiliateAdminDashboardSchema",
    "profileLimit: normalizeLimit(input.profileLimit)",
    "commissionOffset: normalizeOffset(input.commissionOffset)",
    "p_profile_limit: filters.profileLimit",
    "p_offer_offset: filters.offerOffset",
    "p_commission_limit: filters.commissionLimit",
    "p_payout_offset: filters.payoutOffset",
    "queryKey: [...affiliateAdminKey, filters]",
  ]);
  if (hook.includes('supabase.rpc("get_affiliate_admin_dashboard")')) {
    failures.push("Hook B102 ainda chama a RPC administrativa sem paginação.");
  }

  requireFragments(page, "Página B102", [
    "const pageSize = 25;",
    "const [profilePage, setProfilePage] = useState(0);",
    "const [offerPage, setOfferPage] = useState(0);",
    "const [commissionPage, setCommissionPage] = useState(0);",
    "const [payoutPage, setPayoutPage] = useState(0);",
    "profileOffset: profilePage * pageSize",
    "commissionOffset: commissionPage * pageSize",
    "dashboard.totals.profiles",
    "dashboard.totals.offers",
    "dashboard.totals.available_commissions",
    "dashboard.totals.payouts",
    'label="perfis"',
    'label="ofertas"',
    'label="comissões"',
    'label="repasses"',
    "dashboardQuery.isFetching",
    "setCommissionPage(0);",
    "setPayoutPage(0);",
  ]);

  requireFragments(documentation, "Documentação B102", [
    "paginação independente",
    "25 registros",
    "limite",
    "security definer",
    "security invoker",
    "20 asserções",
    "branch `dev`",
  ]);

  if (!parent.includes('await import("./check-affiliate-admin-pagination.mjs")')) {
    failures.push("B102 não está encadeada no gate bloqueante B20.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B102 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B102 aprovado: perfis, ofertas, comissões e repasses possuem páginas independentes e totais persistidos.",
);
