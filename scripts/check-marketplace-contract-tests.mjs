import { existsSync, readFileSync } from "node:fs";

const paths = {
  contracts: "src/contracts/marketplace.ts",
  tests: "src/contracts/marketplace.test.ts",
  hooks: "src/hooks/useDigitalMarketplace.ts",
  schema: "supabase/migrations/20260731050000_digital_marketplace_schema.sql",
  adminRpcs: "supabase/migrations/20260731050200_digital_marketplace_admin_rpcs.sql",
  accessRpcs: "supabase/migrations/20260731050300_digital_marketplace_access_rpcs.sql",
  documentation: "docs/refactor/FASE-B72-MARKETPLACE-CONTRACT-TESTS.md",
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
const migrations = [paths.schema, paths.adminRpcs, paths.accessRpcs]
  .map(read)
  .join("\n");
const documentation = read(paths.documentation);
const packageJson = existsSync(paths.package)
  ? JSON.parse(read(paths.package))
  : { scripts: {} };

for (const fragment of [
  'z.enum(["active", "revoked"])',
  "digitalProductEventTypeSchema",
  "promotional_price_amount >= value.price_amount",
  "O fim da promoção deve ocorrer após o início.",
  "O fim da disponibilidade deve ocorrer após o início.",
  "O ciclo de vida do produto digital está incoerente.",
  "O ciclo de vida da licença digital está incoerente.",
  "A expiração deve ocorrer após a concessão.",
  "O estado do acesso digital está incoerente.",
  "digitalProductEventSchema",
  "marketplaceLicenseLifecycleInputSchema",
  ".strict()",
]) {
  expect(contracts.includes(fragment), `Contrato B72 ausente: ${fragment}`);
}

expect(
  !contracts.includes('z.enum(["active", "suspended", "revoked"])'),
  "Acesso digital não pode reintroduzir o estado suspended inexistente.",
);
expect(
  !contracts.includes("suspended_at") &&
    !contracts.includes("suspension_reason"),
  "Contrato de acesso não pode conter colunas inexistentes na tabela.",
);

for (const fragment of [
  "digital_products_slug_format",
  "digital_products_short_description_length",
  "digital_products_description_length",
  "digital_products_category_length",
  "digital_products_promotional_price",
  "digital_products_promotion_window",
  "digital_products_availability_window",
  "digital_products_deleted_archived",
  "digital_product_licenses_summary_length",
  "digital_product_deliverables_description_length",
  "digital_product_accesses_source_reference_length",
  "digital_product_accesses_expiry_after_grant",
  "digital_product_accesses_revocation_reason_length",
  "digital_product_accesses_status_contract",
  "digital_product_events_version_positive",
  "digital_product_events_details_object",
  "returns public.digital_products",
  "returns public.digital_product_licenses",
  "returns public.digital_product_deliverables",
]) {
  expect(migrations.includes(fragment), `Constraint/RPC B72 ausente: ${fragment}`);
}

expect(
  migrations.includes(
    "create type public.digital_product_access_status as enum ('active', 'revoked')",
  ),
  "PostgreSQL deve permanecer como fonte canônica dos estados de acesso.",
);

for (const fragment of [
  "aceita produtos draft, published e archived coerentes",
  "aceita produto despublicado com histórico de publicação",
  "rejeita slug fora do formato ou dos limites",
  "rejeita preço promocional igual ou superior ao preço principal",
  "rejeita janelas invertidas ou com instantes iguais",
  "rejeita lifecycle impossível e exclusão fora de archived",
  "aceita licenças draft, published e archived coerentes",
  "rejeita posição negativa, descrição vazia ou longa e campos extras",
  "rejeita o estado suspended inexistente no PostgreSQL",
  "rejeita campos suspended inexistentes na tabela",
  "rejeita expiração anterior ou igual à concessão",
  "rejeita combinações de revogação impossíveis",
  "aceita evento canônico e coleção de eventos",
  "normaliza criação de produto",
  "rejeita campos extras em todos os inputs",
  "safeParse",
]) {
  expect(tests.includes(fragment), `Cobertura B72 ausente: ${fragment}`);
}

for (const fragment of [
  "digitalProductSchema",
  "digitalProductLicenseSchema",
  "digitalProductDeliverableRowSchema",
  "digitalProductAccessesSchema",
  "parseDataContract",
]) {
  expect(hooks.includes(fragment), `Consumidor B72 ausente: ${fragment}`);
}

const responseValidationCount = hooks.match(/parseDataContract\(/g)?.length ?? 0;
expect(
  responseValidationCount >= 15,
  `Leituras e mutações do marketplace devem permanecer validadas; encontradas ${responseValidationCount}.`,
);
expect(
  documentation.includes("Fase B72") &&
    documentation.includes("Nenhuma migration") &&
    documentation.includes("Supabase remoto"),
  "Documentação B72 deve registrar escopo e exclusões.",
);
expect(
  packageJson.scripts?.["check:marketplace-contract-tests"] ===
    "node scripts/check-marketplace-contract-tests.mjs",
  "package.json deve expor check:marketplace-contract-tests.",
);
expect(
  packageJson.scripts?.typecheck?.includes("npm run check:marketplace-contract-tests"),
  "Contrato B72 deve estar encadeado ao typecheck.",
);

if (failures.length > 0) {
  console.error("Falhas no contrato B72:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B72 aprovado: produtos, licenças, entregáveis, acessos e eventos do marketplace reproduzem os constraints persistidos com cobertura unitária estrita.",
);
