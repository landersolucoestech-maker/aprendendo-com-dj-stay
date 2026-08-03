import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/affiliate.ts",
  tests: "src/contracts/affiliate.test.ts",
  hooks: "src/hooks/useAffiliateProgram.ts",
  portalHook: "src/hooks/useAffiliatePortalPagination.ts",
  redirect: "src/pages/AffiliateRedirect.tsx",
  schema: "supabase/migrations/20260731060600_affiliate_program_schema.sql",
  profileRequest: "supabase/migrations/20260731060701_affiliate_profile_request_rpc.sql",
  profileAdmin: "supabase/migrations/20260731060702_affiliate_profile_admin_rpc.sql",
  termsAdmin: "supabase/migrations/20260731060703_affiliate_terms_admin_rpc.sql",
  linkRpcs: "supabase/migrations/20260731060710_affiliate_link_rpcs.sql",
  clickRpc: "supabase/migrations/20260731060711_affiliate_click_rpc.sql",
  payoutRpcs: "supabase/migrations/20260731060810_affiliate_payout_rpcs.sql",
  portalRpc: "supabase/migrations/20260731060900_affiliate_portal_rpc.sql",
  adminRpc: "supabase/migrations/20260731060910_affiliate_admin_portal_rpc.sql",
  documentation: "docs/refactor/FASE-B71-AFFILIATE-CONTRACT-TESTS.md",
  package: "package.json",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const contracts = read(paths.contracts);
const tests = read(paths.tests);
const hooks = read(paths.hooks);
const portalHook = read(paths.portalHook);
const redirect = read(paths.redirect);
const migrations = [
  paths.schema,
  paths.profileRequest,
  paths.profileAdmin,
  paths.termsAdmin,
  paths.linkRpcs,
  paths.clickRpc,
  paths.payoutRpcs,
  paths.portalRpc,
  paths.adminRpc,
]
  .map(read)
  .join("\n");
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  "checkoutSubjectTypeSchema",
  "affiliateEventTypeSchema",
  "/^[a-z0-9]{8,32}$/",
  "/^[a-z0-9]{12,32}$/",
  "O caminho deve permanecer interno e seguro.",
  "validateProfileState",
  "affiliateSubjectTermsRowSchema",
  "affiliateLinkRowSchema",
  "Estado do link de afiliado incoerente.",
  "Comissão excede a base.",
  "affiliatePayoutRowSchema",
  "Estado do payout incoerente.",
  'z.discriminatedUnion("accepted"',
  "AFFILIATE_LINK_NOT_AVAILABLE",
  "AFFILIATE_SUBJECT_NOT_AVAILABLE",
  "affiliateProfileStatusInputSchema",
  "affiliateCreatePayoutInputSchema",
  "affiliateMarkPayoutPaidInputSchema",
  "affiliateCancelPayoutInputSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B71 ausente: ${fragment}`);
}

for (const fragment of [
  "affiliate_profiles_code_format",
  "affiliate_profiles_status_contract",
  "affiliate_links_code_format",
  "affiliate_links_destination_path",
  "affiliate_links_status_contract",
  "affiliate_commissions_amount_positive",
  "affiliate_commissions_status_contract",
  "affiliate_payouts_amount_positive",
  "affiliate_payouts_reference_length",
  "affiliate_payouts_notes_length",
  "affiliate_payouts_status_contract",
  "affiliate_payouts_cancellation_reason_length",
  "affiliate_events_details_object",
  "returns public.affiliate_profiles",
  "returns public.affiliate_subject_terms",
  "returns public.affiliate_links",
  "returns public.affiliate_payouts",
  "AFFILIATE_LINK_NOT_AVAILABLE",
  "AFFILIATE_SUBJECT_NOT_AVAILABLE",
  "get_affiliate_portal",
  "get_affiliate_admin_dashboard",
]) {
  expect(migrations.includes(fragment), `Contrato PostgreSQL/RPC B71 ausente: ${fragment}`);
}

for (const fragment of [
  "aceita estados pending, active e suspended coerentes",
  "rejeita código fora do formato persistido",
  "rejeita campos extras",
  "rejeita conjunto parcial ou link inativo exposto como oferta",
  "rejeita path externo, protocolo relativo, barra invertida e estado incoerente",
  "rejeita valor zero, comissão maior que base e timestamps impossíveis",
  "aceita linhas completas draft, paid e cancelled",
  "aceita somente os dois motivos canônicos de rejeição",
  "aceita atribuição completa e rejeita respostas híbridas",
  "rejeita campos extras em qualquer nível",
  "rejeita payout administrativo duplicado ou incoerente",
  "normaliza nome opcional e aplica limites",
  "discrimina ativação e suspensão de perfil",
  "valida referência de pagamento e motivo de cancelamento",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B71 ausente: ${fragment}`);
}

for (const fragment of [
  "affiliateDisplayNameInputSchema.parse",
  "affiliateCreateLinkInputSchema.parse",
  "affiliateProfileStatusInputSchema.parse",
  "affiliateTermsInputSchema.parse",
  "affiliateCreatePayoutInputSchema.parse",
  "affiliateMarkPayoutPaidInputSchema.parse",
  "affiliateCancelPayoutInputSchema.parse",
  "affiliateProfileSchema",
  "affiliateLinkRowSchema",
  "affiliateSubjectTermsRowSchema",
  "affiliatePayoutRowSchema",
  "parseDataContract",
]) {
  expect(hooks.includes(fragment), `Consumidor B71 ausente: ${fragment}`);
}

for (const fragment of [
  "paginatedAffiliatePortalSchema",
  'supabase.rpc("get_affiliate_portal"',
  "parseDataContract",
]) {
  expect(portalHook.includes(fragment), `Consumidor paginado B71/B104 ausente: ${fragment}`);
}

const affiliateResponseConsumers = `${hooks}\n${portalHook}`;
const responseValidationCount =
  affiliateResponseConsumers.match(/parseDataContract\(/g)?.length ?? 0;
expect(
  responseValidationCount >= 10,
  `Todas as 10 respostas RPC dos hooks de afiliados devem ser validadas; encontradas ${responseValidationCount}.`,
);
expect(
  !affiliateResponseConsumers.includes("if (error) throw error;\n      return data;"),
  "Hooks B71/B104 não podem devolver data bruto após RPC.",
);
expect(
  redirect.includes("affiliateClickResultSchema") &&
    redirect.includes("parseDataContract") &&
    redirect.includes("window.location.replace(result.destination_path)"),
  "Redirecionamento afiliado deve consumir a união discriminada validada.",
);
expect(
  documentation.includes("Fase B71") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B71 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:affiliate-contract-tests"] ===
    "node scripts/check-affiliate-contract-tests.mjs",
  "package.json deve expor check:affiliate-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:affiliate-contract-tests"),
  "Contrato B71 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B71:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B71 aprovado: portal, administração, clique e mutações de afiliados possuem validação estrita alinhada ao PostgreSQL e às RPCs.",
);
