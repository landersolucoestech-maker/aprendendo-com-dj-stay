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
  parent: "scripts/check-course-storefront.mjs",
  documentation: "docs/refactor/FASE-B90-EXACT-CHECKOUT-RETURN.md",
  status: "docs/STATUS.md",
};

const failures = [];
const read = (path) => readFileSync(path, "utf8");
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

  for (const fragment of [
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
  ]) {
    if (!migration.includes(fragment)) failures.push(`Migration B90 incompleta: ${fragment}`);
  }
  for (const forbidden of ["provider_checkout_url", "provider_checkout_id", "provider_event_payload", "payload_snapshot"] ) {
    if (migration.includes(`'${forbidden}'`)) failures.push(`Read model B90 expõe campo privado: ${forbidden}`);
  }

  for (const fragment of [
    "select plan(34)",
    "another user checkout is indistinguishable from not found",
    "unrelated active enrollment is never used as fallback",
    "shared return identifies a digital product",
    "return does not expose provider event payload",
  ]) {
    if (!databaseTest.includes(fragment)) failures.push(`pgTAP B90 incompleto: ${fragment}`);
  }

  for (const fragment of [
    "checkoutIntentIdSchema",
    "checkoutReturnSchema",
    "checkoutReturnEntitlementSchema",
    "Destino do entitlement diverge do tipo de compra",
    "Pedido pago exige horário de confirmação",
    ".strict()",
  ]) {
    if (!contract.includes(fragment)) failures.push(`Contrato B90 incompleto: ${fragment}`);
  }
  for (const fragment of [
    'describe("checkoutReturnSchema"',
    "accepts an exact paid course return",
    "rejects raw provider fields",
  ]) {
    if (!contractTest.includes(fragment)) failures.push(`Teste de contrato B90 ausente: ${fragment}`);
  }

  for (const fragment of [
    "classifyCheckoutReturn",
    "shouldPollCheckoutReturn",
    'state === "pending" || state === "finalizing_access"',
    'return "access_revoked"',
    'return "refunded"',
  ]) {
    if (!state.includes(fragment)) failures.push(`Classificação B90 incompleta: ${fragment}`);
  }
  for (const fragment of [
    'describe("checkout return state"',
    "polls while payment is pending",
    "reports success only for active controlling entitlement",
    "reports revoked access instead of success",
  ]) {
    if (!stateTest.includes(fragment)) failures.push(`Teste de estado B90 ausente: ${fragment}`);
  }

  for (const fragment of [
    'supabase.rpc("get_my_checkout_return"',
    '"retorno financeiro do checkout"',
    "shouldPollCheckoutReturn(current) ? 3_000 : false",
  ]) {
    if (!hook.includes(fragment)) failures.push(`Hook B90 incompleto: ${fragment}`);
  }

  for (const fragment of [
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
  ]) {
    if (!page.includes(fragment)) failures.push(`Página B90 incompleta: ${fragment}`);
  }
  for (const forbidden of ["useCourseAccess", "getActiveEnrollments", "activeEnrollments[0]", "Pagamento Realizado!", "Acesso vitalício"]) {
    if (page.includes(forbidden)) failures.push(`Inferência antiga ainda presente no retorno: ${forbidden}`);
  }

  if (!app.includes("<MarketplaceRoute>\n                        <PaymentSuccess />")) {
    failures.push("Rota de retorno não usa o guard compartilhado de compradores.");
  }
  for (const fragment of [
    "paymentRoute.includes(\"<MarketplaceRoute>\")",
    'paymentSuccess.includes("useCheckoutReturn")',
    '!paymentSuccess.includes("activeEnrollments[0]")',
  ]) {
    if (!b10.includes(fragment)) failures.push(`Contrato B10 não preserva a B90: ${fragment}`);
  }
  if (!parent.includes('await import("./check-exact-checkout-return.mjs")')) {
    failures.push("B90 não está encadeada no gate bloqueante B89.");
  }

  for (const fragment of [
    "checkout_intent",
    "matrícula não relacionada",
    "produto digital",
    "polling",
    "branch `dev`",
  ]) {
    if (!documentation.includes(fragment)) failures.push(`Documentação B90 incompleta: ${fragment}`);
  }
  if (!status.includes("Retorno financeiro exato")) failures.push("STATUS não registra a B90.");
}

if (failures.length > 0) {
  console.error("Contrato B90 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B90 aprovado: o retorno financeiro usa somente o checkout_intent pertencente à conta autenticada.",
);
