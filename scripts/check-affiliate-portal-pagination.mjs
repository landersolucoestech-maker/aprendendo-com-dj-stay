import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803060000_affiliate_portal_pagination.sql",
  databaseTest: "supabase/tests/69_affiliate_portal_pagination.test.sql",
  contract: "src/contracts/affiliate-portal-pagination.ts",
  contractTest: "src/contracts/affiliate-portal-pagination.test.ts",
  hook: "src/hooks/useAffiliatePortalPagination.ts",
  controls: "src/components/affiliate/AffiliatePaginationControls.tsx",
  page: "src/pages/affiliate/AffiliatePortal.tsx",
  documentation: "docs/refactor/FASE-B103-AFFILIATE-PORTAL-PAGINATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B103 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration).toLowerCase();
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const hook = read(paths.hook);
  const controls = read(paths.controls);
  const page = read(paths.page);
  const documentation = read(paths.documentation).toLowerCase();
  const parent = read(paths.parent);

  requireFragments(migration, "Migration B103", [
    "drop function if exists public.get_affiliate_portal()",
    "drop function if exists private.get_affiliate_portal()",
    "private.get_affiliate_portal(",
    "public.get_affiliate_portal(",
    "p_offer_limit integer default 25",
    "p_link_limit integer default 25",
    "p_commission_limit integer default 25",
    "p_payout_limit integer default 25",
    "p_event_limit integer default 25",
    "greatest(1, least(coalesce(p_event_limit, 25), 100))",
    "greatest(0, coalesce(p_event_offset, 0))",
    "security definer",
    "security invoker",
    "affiliate_role_required",
    "'totals'",
    "'events'",
    "limit v_offer_limit offset v_offer_offset",
    "limit v_link_limit offset v_link_offset",
    "limit v_commission_limit offset v_commission_offset",
    "limit v_payout_limit offset v_payout_offset",
    "limit v_event_limit offset v_event_offset",
  ]);

  requireFragments(databaseTest, "pgTAP B103", [
    "select plan(25)",
    "legacy private zero-argument affiliate portal is removed",
    "legacy public zero-argument affiliate portal is removed",
    "student cannot inspect affiliate portal",
    "default arguments preserve legacy zero-argument invocation",
    "link total is independent from link page size",
    "event total is independent from event page size",
    "adjacent link pages do not overlap",
    "event offset returns next event",
    "zero limits are clamped independently to one",
    "negative offsets are clamped independently to zero",
    "each portal collection applies its own limit and offset",
  ]);

  requireFragments(contract, "Contrato B103", [
    "affiliatePortalTotalsSchema",
    "paginatedAffiliatePortalSchema",
    "events: z.number().int().nonnegative()",
    "A página não pode conter mais registros que o total persistido.",
  ]);
  requireFragments(contractTest, "Teste unitário B103", [
    'describe("paginatedAffiliatePortalSchema"',
    "aceita páginas vazias com totais coerentes",
    "aceita totais maiores que as páginas carregadas",
    "rejeita página maior que o total persistido",
    "rejeita payload sem totais persistidos",
    "rejeita totais negativos e campos extras",
  ]);

  requireFragments(hook, "Hook B103", [
    "interface AffiliatePortalPaginationInput",
    "paginatedAffiliatePortalSchema",
    "offerLimit: normalizeLimit(input.offerLimit)",
    "eventOffset: normalizeOffset(input.eventOffset)",
    'queryKey: ["affiliate", "portal", filters]',
    "p_offer_limit: filters.offerLimit",
    "p_link_offset: filters.linkOffset",
    "p_commission_limit: filters.commissionLimit",
    "p_payout_offset: filters.payoutOffset",
    "p_event_limit: filters.eventLimit",
    "p_event_offset: filters.eventOffset",
  ]);

  requireFragments(controls, "Controles B103", [
    "interface AffiliatePaginationControlsProps",
    "aria-live=\"polite\"",
    "Anterior",
    "Próxima",
    "isFetching",
    "onPageChange",
  ]);

  requireFragments(page, "Página B103", [
    "const pageSize = 10;",
    "const [offerPage, setOfferPage] = useState(0);",
    "const [linkPage, setLinkPage] = useState(0);",
    "const [commissionPage, setCommissionPage] = useState(0);",
    "const [payoutPage, setPayoutPage] = useState(0);",
    "const [eventPage, setEventPage] = useState(0);",
    "useAffiliatePortalPagination({",
    "offerOffset: offerPage * pageSize",
    "eventOffset: eventPage * pageSize",
    "portal.totals.offers",
    "portal.totals.links",
    "portal.totals.commissions",
    "portal.totals.payouts",
    "portal.totals.events",
    'label="ofertas"',
    'label="links"',
    'label="comissões"',
    'label="repasses"',
    'label="atividades"',
    "Atividades recentes",
    "eventTypeLabel[event.event_type]",
    "portalQuery.isFetching",
    "setOfferPage(0);",
    "setLinkPage(0);",
    "setEventPage(0);",
  ]);
  if (page.includes("useAffiliatePortal();")) {
    failures.push("Página B103 ainda usa o read model ilimitado do portal.");
  }
  if (page.includes("JSON.stringify(event.details)")) {
    failures.push("Página B103 não pode renderizar detalhes técnicos brutos dos eventos.");
  }

  requireFragments(documentation, "Documentação B103", [
    "paginação independente",
    "10 registros",
    "atividades recentes",
    "security definer",
    "security invoker",
    "25 asserções",
    "branch `dev`",
  ]);

  if (!parent.includes('await import("./check-affiliate-portal-pagination.mjs")')) {
    failures.push("B103 não está encadeada no gate bloqueante B20.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B103 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

await import("./check-affiliate-portal-canonical-hook.mjs");
console.log(
  "Contrato B103 aprovado: ofertas, links, comissões, repasses e eventos possuem páginas independentes e totais persistidos.",
);
