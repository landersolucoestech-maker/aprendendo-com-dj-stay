import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260802234500_checkout_return_status.sql",
  databaseTest: "supabase/tests/59_checkout_return_status.test.sql",
  contract: "src/contracts/checkout-return.ts",
  contractTest: "src/contracts/checkout-return.test.ts",
  state: "src/lib/checkout-return.ts",
  stateTest: "src/lib/checkout-return.test.ts",
  hook: "src/hooks/useCheckoutReturn.ts",
  page: "src/pages/PaymentSuccess.tsx",
  app: "src/App.tsx",
  b10: "scripts/check-course-access-contract.mjs",
  parent: "scripts/check-public-course-catalog.mjs",
  child: "scripts/check-checkout-expiration.mjs",
  documentation: "docs/refactor/FASE-B90-EXACT-CHECKOUT-RETURN.md",
  status: "docs/STATUS.md",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const requireFragments = (source, label, fragments) => {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) failures.push(`${label}: conteúdo obrigatório ausente: ${fragment}`);
  }
};
for (const path of Object.values(paths)) {
  if (!existsSync(path)) failures.push(`Arquivo B90 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const contract = read(paths.contract);
  const contractTest = read(paths.contractTest);
  const state = read(paths.state);
  const stateTest = read(paths.stateTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const app = read(paths.app);
  const b10 = read(paths.b10);
  const parent = read(paths.parent);
  const documentation = read(paths.documentation).toLowerCase();
  const status = read(paths.status);

  requireFragments(migration, "Migration B90", [
    "private.get_my_checkout_return",
    "public.get_my_checkout_return",
    "security definer",
    "security invoker",
    "checkout_intent.user_id = v_user_id",
    "payment_order.checkout_intent_id = v_intent.id",
    "payment_attempt.order_id = v_order.id",
    "payment_entitlement.order_id = v_order.id",
    "return jsonb_build_object('found', false)",
    "grant execute on function public.get_my_checkout_return(uuid)",
  ]);
  for (const forbidden of ["provider_checkout_url", "provider_checkout_id", "provider_event_payload", "payload_snapshot"]) {
    if (migration.includes(`'${forbidden}'`)) failures.push(`Read model B90 expõe campo privado: ${forbidden}`);
  }

  requireFragments(databaseTest, "pgTAP B90", [
    "select plan(34)",
    "another user checkout is indistinguishable from not found",
    "unrelated active enrollment is never used as fallback",
    "shared return identifies a digital product",
    "return does not expose provider event payload",
  ]);
  requireFragments(contract, "Contrato B90", [
    "checkoutIntentIdSchema",
    "checkoutReturnSchema",
    "checkoutReturnEntitlementSchema",
    "Destino do entitlement diverge do tipo de compra",
    "Pedido pago exige horário de confirmação",
    ".strict()",
  ]);
  requireFragments(contractTest, "Teste de contrato B90", [
    'describe("checkoutReturnSchema"',
    "accepts an exact paid course return",
    "rejects raw provider fields",
  ]);
  requireFragments(state, "Classificação B90", [
    "classifyCheckoutReturn",
    "shouldPollCheckoutReturn",
    'state === "pending" || state === "finalizing_access"',
    'return "access_revoked"',
    'return "refunded"',
  ]);
  requireFragments(stateTest, "Teste de estado B90", [
    'describe("checkout return state"',
    "polls while payment is pending",
    "reports success only for active controlling entitlement",
    "reports revoked access instead of success",
  ]);
  requireFragments(hook, "Hook B90/B91", [
    '"reconcile_my_checkout_return"',
    '"retorno financeiro reconciliado do checkout"',
    "shouldPollCheckoutReturn(current) ? 3_000 : false",
  ]);
  requireFragments(page, "Página B90", [
    'searchParams.get("checkout_intent")',
    "useCheckoutReturn",
    "classifyCheckoutReturn",
    "shouldPollCheckoutReturn",
    "Esta página consulta automaticamente",
    "Compra confirmada",
    "Pagamento reembolsado",
    "Acesso revogado",
    "checkout.entitlement.controls_access",
    "checkout.subject_id",
  ]);
  for (const forbidden of ["useCourseAccess", "getActiveEnrollments", "activeEnrollments[0]", "Pagamento Realizado!", "Acesso vitalício"]) {
    if (page.includes(forbidden)) failures.push(`Inferência antiga ainda presente no retorno: ${forbidden}`);
  }

  requireFragments(app, "Rota B90", [
    'path="/pagamento-sucesso"',
    "<MarketplaceRoute>",
    "<PaymentSuccess />",
  ]);
  requireFragments(b10, "Contrato B10 após B90", [
    'paymentRoute.includes("<MarketplaceRoute>")',
    'paymentSuccess.includes("useCheckoutReturn")',
    '!paymentSuccess.includes("activeEnrollments[0]")',
  ]);
  if (!parent.includes('await import("./check-exact-checkout-return.mjs")')) {
    failures.push("B90 não está encadeada no gate bloqueante do catálogo público.");
  }
  requireFragments(documentation, "Documentação B90", [
    "checkout_intent",
    "matrícula não relacionada",
    "produto digital",
    "polling",
    "branch `dev`",
  ]);
  requireFragments(status, "STATUS B90", [
    "Retorno financeiro exato",
    "`checkout_intent` pertencente à conta autenticada",
    "sem fallback por matrícula ou acesso não relacionado",
    "reembolso",
    "chargeback",
    "revogação",
  ]);
}

if (failures.length > 0) {
  console.error("Contrato B90 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato B90 aprovado: o retorno financeiro usa somente o checkout_intent pertencente à conta autenticada.");
await import("./check-checkout-expiration.mjs");
