import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const app = read("src/App.tsx");
const hooks = read("src/hooks/useDigitalMarketplace.ts");
const contracts = read("src/contracts/marketplace.ts");
const catalog = read("src/pages/marketplace/DigitalMarketplace.tsx");
const owned = read("src/pages/student/MyDigitalProducts.tsx");
const admin = read("src/pages/admin/DigitalProductsAdmin.tsx");
const privateAssets = read("src/lib/private-assets.ts");
const schemaMigration = read("supabase/migrations/20260731050000_digital_marketplace_schema.sql");
const accessMigration = read("supabase/migrations/20260731050100_digital_marketplace_access.sql");
const accessRpcs = read("supabase/migrations/20260731050300_digital_marketplace_access_rpcs.sql");

for (const route of ["/marketplace", "/meus-produtos", "/aluno/produtos", "/admin/produtos"]) {
  expect(app.includes(`path=\"${route}\"`), `Rota ${route} deve existir.`);
}
expect(app.includes('allowedRoles={["aluno", "afiliado", "administrador_proprietario"]}'), "Marketplace deve exigir usuário autenticado com papel permitido.");
expect(app.includes('<AdminRoute>\n                  <DigitalProductsAdmin />'), "CMS de produtos deve exigir administrador proprietário.");

for (const table of [
  "digital_products",
  "digital_product_licenses",
  "digital_product_deliverables",
  "digital_product_accesses",
]) {
  expect(hooks.includes(`.from(\"${table}\")`), `Hook deve consultar ${table}.`);
}
for (const rpc of [
  "create_digital_product",
  "create_digital_product_license",
  "publish_digital_product_license",
  "attach_digital_product_deliverable",
  "publish_digital_product",
]) {
  expect(hooks.includes(`rpc(\"${rpc}\"`), `CMS deve usar RPC ${rpc}.`);
}
expect(hooks.includes("parseDataContract"), "Respostas do marketplace devem ser validadas.");
expect(contracts.includes("license_snapshot"), "Contrato de acesso deve incluir snapshot da licença.");
expect(contracts.includes("affiliate_eligible"), "Produto deve expor elegibilidade de afiliados.");
expect(owned.includes("downloadPrivateAsset"), "Downloads devem usar helper privado assinado.");
expect(privateAssets.includes("createSignedUrl"), "Download privado deve usar URL assinada de curta duração.");
expect(accessMigration.includes("has_active_digital_product_access"), "RLS deve verificar acesso ativo ao produto.");
expect(schemaMigration.includes("force row level security"), "Tabelas do marketplace devem forçar RLS.");
expect(accessRpcs.includes("DIGITAL_PRODUCT_PURCHASE_SOURCE_RESERVED"), "Concessão administrativa não pode simular compra.");
expect(accessRpcs.includes("license_snapshot"), "Concessão deve persistir termos licenciados.");
expect(
  catalog.includes("O redirecionamento de retorno não confirma a compra nem libera arquivos") ||
    catalog.includes("Nenhum acesso é liberado por redirecionamento ou simulação"),
  "Catálogo deve informar que redirect não confirma compra nem libera acesso.",
);
expect(!catalog.includes("confirm_course_purchase"), "Catálogo não pode confirmar compra.");
expect(!catalog.includes("grant_digital_product_access"), "Catálogo não pode conceder acesso.");
expect(!owned.includes("getPublicUrl("), "Produtos adquiridos não podem usar URL pública.");
expect(!admin.includes('"purchase"'), "CMS administrativo não pode fabricar origem de compra.");
expect(!admin.includes("Math.random("), "CMS não pode fabricar identificadores ou métricas.");
expect(!hooks.includes("mockProducts") && !hooks.includes("mockAccess"), "Marketplace não pode usar dados simulados.");
expect(!hooks.includes("Promise.all("), "Fluxos de leitura do marketplace devem permanecer sequenciais.");

for (const path of [
  "supabase/migrations/20260731050000_digital_marketplace_schema.sql",
  "supabase/migrations/20260731050100_digital_marketplace_access.sql",
  "supabase/migrations/20260731050150_allow_default_license_switch.sql",
  "supabase/migrations/20260731050200_digital_marketplace_admin_rpcs.sql",
  "supabase/migrations/20260731050300_digital_marketplace_access_rpcs.sql",
  "supabase/tests/26_digital_marketplace_schema.test.sql",
  "supabase/tests/27_digital_marketplace_authoring.test.sql",
  "supabase/tests/28_digital_marketplace_access.test.sql",
]) {
  expect(existsSync(path), `${path} deve existir.`);
}

if (failures.length) {
  console.error("Contrato B16 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B16 aprovado.");
