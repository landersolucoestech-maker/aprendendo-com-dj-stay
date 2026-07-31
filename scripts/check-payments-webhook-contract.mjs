import { existsSync, readFileSync } from "node:fs";

const paths = {
  checkoutSchema: "supabase/migrations/20260731060000_checkout_intents_schema.sql",
  checkoutRpcs: "supabase/migrations/20260731060100_checkout_intent_rpcs.sql",
  paymentSchema: "supabase/migrations/20260731060200_payment_orders_and_events.sql",
  webhookRpcs: "supabase/migrations/20260731060300_payment_webhook_rpcs.sql",
  checkoutFunction: "supabase/functions/create-asaas-checkout/index.ts",
  webhookFunction: "supabase/functions/asaas-webhook/index.ts",
  config: "supabase/config.toml",
  checkoutContract: "src/contracts/checkout.ts",
  checkoutHook: "src/hooks/useHostedCheckout.ts",
  marketplace: "src/pages/marketplace/DigitalMarketplace.tsx",
  paymentReturn: "src/pages/PaymentSuccess.tsx",
  schemaTest: "supabase/tests/29_payments_schema.test.sql",
  lifecycleTest: "supabase/tests/30_checkout_lifecycle.test.sql",
  webhookTest: "supabase/tests/31_payment_webhooks.test.sql",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const checkoutSchema = read(paths.checkoutSchema);
const checkoutRpcs = read(paths.checkoutRpcs);
const paymentSchema = read(paths.paymentSchema);
const webhookRpcs = read(paths.webhookRpcs);
const checkoutFunction = read(paths.checkoutFunction);
const webhookFunction = read(paths.webhookFunction);
const config = read(paths.config);
const checkoutContract = read(paths.checkoutContract);
const checkoutHook = read(paths.checkoutHook);
const marketplace = read(paths.marketplace);
const paymentReturn = read(paths.paymentReturn);
const tests = [paths.schemaTest, paths.lifecycleTest, paths.webhookTest].map(read).join("\n");

for (const table of [
  "checkout_intents",
  "checkout_intent_events",
  "payment_orders",
  "payment_attempts",
  "payment_provider_events",
]) {
  const schema = table.startsWith("checkout_") ? checkoutSchema : paymentSchema;
  expect(
    schema.includes(`alter table public.${table} force row level security`),
    `${table} deve usar RLS forçada.`,
  );
}

expect(
  checkoutSchema.includes("checkout_intents_user_idempotency_uidx"),
  "Checkout deve ser idempotente por usuário e chave local.",
);
expect(
  paymentSchema.includes("payment_provider_events_provider_event_uidx"),
  "Eventos do provedor devem ter unicidade idempotente.",
);
expect(
  checkoutRpcs.includes("pg_advisory_xact_lock") && checkoutRpcs.includes("provider_request_token"),
  "Criação do checkout deve possuir trava transacional e lease do provedor.",
);
expect(
  webhookRpcs.includes("PAYMENT_SNAPSHOT_MISMATCH") &&
    webhookRpcs.includes("PROVIDER_PAYMENT_ID_CONFLICT"),
  "Webhook deve validar snapshot financeiro e identidade do pagamento.",
);
expect(
  webhookRpcs.includes("fulfillment_performed', false"),
  "B18 deve manter sua fronteira original antes da extensão atômica da B19.",
);
expect(
  !webhookRpcs.includes("grant_course_enrollment") &&
    !webhookRpcs.includes("grant_digital_product_access"),
  "Migration B18 não pode conceder curso ou produto diretamente.",
);

expect(
  checkoutFunction.includes('billingTypes: ["PIX", "CREDIT_CARD"]'),
  "Checkout hospedado deve oferecer Pix e cartão.",
);
expect(
  checkoutFunction.includes('externalReference: intent.id'),
  "Checkout deve usar referência opaca ao intent local.",
);
expect(
  checkoutFunction.includes("prepare_checkout_intent") &&
    checkoutFunction.includes("complete_checkout_provider_request"),
  "Edge Function deve usar cotação e lifecycle transacionais.",
);
expect(
  checkoutFunction.includes("AUTHORIZATION_REQUIRED") &&
    checkoutFunction.includes("userClient.auth.getUser()"),
  "Checkout deve exigir e validar sessão autenticada.",
);

expect(
  webhookFunction.includes('const TOKEN_HEADER = "asaas-access-token"'),
  "Webhook deve autenticar o header oficial do Asaas.",
);
expect(
  webhookFunction.includes("constantTimeEqual") &&
    webhookFunction.includes("ASAAS_WEBHOOK_TOKEN"),
  "Webhook deve comparar o token de forma resistente a timing.",
);
expect(
  webhookFunction.includes("process_asaas_payment_webhook") &&
    webhookFunction.includes("MAX_BODY_BYTES"),
  "Webhook deve persistir pelo RPC idempotente e limitar o corpo.",
);
expect(
  config.includes("[functions.create-asaas-checkout]\nverify_jwt = true"),
  "Checkout deve manter verify_jwt habilitado.",
);
expect(
  config.includes("[functions.asaas-webhook]\nverify_jwt = false"),
  "Webhook externo deve usar autenticação própria em vez de JWT Supabase.",
);

expect(
  checkoutContract.includes("hostedCheckoutInputSchema") &&
    checkoutContract.includes("hostedCheckoutResultSchema"),
  "Frontend deve validar entrada e resposta do checkout.",
);
expect(
  checkoutHook.includes('supabase.functions.invoke("create-asaas-checkout"'),
  "Frontend deve invocar a Edge Function oficial.",
);
expect(
  checkoutHook.includes("sessionStorage") && checkoutHook.includes("crypto.randomUUID"),
  "Frontend deve manter chave idempotente por sessão.",
);
expect(
  marketplace.includes("Comprar com Pix ou cartão") &&
    marketplace.includes("window.location.assign(result.checkoutUrl)"),
  "Marketplace deve encaminhar somente para a URL hospedada validada.",
);
expect(
  paymentReturn.includes("Esta página não libera conteúdo por conta própria"),
  "Página de retorno não pode confirmar pagamento ou liberar conteúdo.",
);

expect(
  tests.includes("duplicate webhook is acknowledged idempotently") &&
    tests.includes("old created event cannot regress received payment") &&
    tests.includes("snapshot mismatch remains persisted for audit") &&
    tests.includes("conflicting provider payment is rejected"),
  "Testes B18 devem cobrir idempotência, reordenação e divergências financeiras.",
);

const combined = [
  checkoutSchema,
  checkoutRpcs,
  paymentSchema,
  webhookRpcs,
  checkoutFunction,
  webhookFunction,
  checkoutContract,
  checkoutHook,
  marketplace,
].join("\n");

for (const forbidden of [
  "VITE_ASAAS_API_KEY",
  "VITE_ASAAS_WEBHOOK_TOKEN",
  "sb_secret_",
  "SUPABASE_SERVICE_ROLE_KEY=",
  "ASAAS_API_KEY=",
  "ASAAS_WEBHOOK_TOKEN=",
]) {
  expect(!combined.includes(forbidden), `B18 contém segredo ou padrão proibido: ${forbidden}`);
}

if (failures.length) {
  console.error("Contrato B18 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B18 aprovado.");
