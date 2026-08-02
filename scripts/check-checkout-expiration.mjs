import { existsSync, readFileSync } from "node:fs";

const paths = {
  migration: "supabase/migrations/20260803000000_checkout_expiration_reconciliation.sql",
  databaseTest: "supabase/tests/60_checkout_expiration_reconciliation.test.sql",
  hook: "src/hooks/useCheckoutReturn.ts",
  page: "src/pages/PaymentSuccess.tsx",
  idempotency: "src/lib/hosted-checkout-idempotency.ts",
  b90: "scripts/check-exact-checkout-return.mjs",
  documentation: "docs/refactor/FASE-B91-CHECKOUT-EXPIRATION-RECONCILIATION.md",
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
  if (!existsSync(path)) failures.push(`Arquivo B91 ausente: ${path}`);
}

if (failures.length === 0) {
  const migration = read(paths.migration);
  const databaseTest = read(paths.databaseTest);
  const hook = read(paths.hook);
  const page = read(paths.page);
  const idempotency = read(paths.idempotency);
  const b90 = read(paths.b90);
  const documentation = read(paths.documentation).toLowerCase();
  const status = read(paths.status);

  requireFragments(migration, "Migration B91", [
    "private.checkout_order_is_financially_terminal",
    "private.reconcile_checkout_intent_expiration",
    "private.expire_due_checkout_intents",
    "public.reconcile_my_checkout_return",
    "public.expire_due_checkout_intents",
    "statement_timestamp()",
    "server_deadline_elapsed",
    "for update skip locked",
    "CHECKOUT_ORDER_TERMINAL",
    "CHECKOUT_INTENT_NOT_RETRYABLE",
    "grant execute on function public.reconcile_my_checkout_return(uuid)",
    "grant execute on function public.expire_due_checkout_intents(integer)",
  ]);
  for (const terminalStatus of [
    "'paid'::public.payment_order_status",
    "'refund_pending'::public.payment_order_status",
    "'refunded'::public.payment_order_status",
    "'chargeback_pending'::public.payment_order_status",
    "'chargeback_won'::public.payment_order_status",
    "'chargeback_lost'::public.payment_order_status",
  ]) {
    if (!migration.includes(terminalStatus)) {
      failures.push(`Pedido terminal B91 não protegido: ${terminalStatus}`);
    }
  }
  if (migration.includes("to anon")) {
    failures.push("B91 não pode conceder reconciliação ou batch ao papel anon.");
  }

  requireFragments(databaseTest, "pgTAP B91", [
    "select plan(28)",
    "due checkout becomes expired from server time",
    "expiration is audited once",
    "another user cannot mutate checkout expiration",
    "paid order cannot create another provider checkout",
    "service batch expires one due checkout within the requested limit",
    "service batch rejects an invalid limit",
  ]);

  requireFragments(hook, "Hook B91", [
    '"reconcile_my_checkout_return"',
    '"retorno financeiro reconciliado do checkout"',
    "shouldPollCheckoutReturn(current) ? 3_000 : false",
  ]);
  if (hook.includes('supabase.rpc("get_my_checkout_return"')) {
    failures.push("Hook B91 não pode ignorar a reconciliação de expiração.");
  }

  requireFragments(idempotency, "Idempotência B91", [
    "clearHostedCheckoutIdempotencyKey",
    "sessionStorage.removeItem",
  ]);
  requireFragments(page, "Página B91", [
    "clearHostedCheckoutIdempotencyKey",
    'viewState === "expired" || viewState === "cancelled"',
    "resetExpiredCheckout",
    'requiresFreshIntent ? "Tentar nova compra" : "Voltar às ofertas"',
    "checkout.subject_type",
    "checkout.subject_id",
    "checkout.license_id",
  ]);
  if (page.includes('viewState === "success" || viewState === "cancelled"')) {
    failures.push("Compra confirmada não pode rotacionar a chave idempotente.");
  }

  if (!b90.includes('await import("./check-checkout-expiration.mjs")')) {
    failures.push("B91 não está encadeada no gate bloqueante B90.");
  }

  requireFragments(documentation, "Documentação B91", [
    "relógio do servidor",
    "service_role",
    "pedidos financeiramente terminais",
    "nova tentativa",
    "branch `dev`",
  ]);
  if (!status.includes("Expiração de checkout")) {
    failures.push("STATUS não registra a B91.");
  }
}

if (failures.length > 0) {
  console.error("Contrato B91 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(
  "Contrato B91 aprovado: checkouts vencidos são reconciliados pelo servidor sem reabrir pedidos financeiramente terminais.",
);
