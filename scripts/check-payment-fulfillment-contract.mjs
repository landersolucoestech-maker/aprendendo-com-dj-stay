import { existsSync, readFileSync } from "node:fs";

const paths = {
  enumMigration: "supabase/migrations/20260731060500_payment_entitlements_schema.sql",
  schemaMigration: "supabase/migrations/20260731060510_payment_entitlements_schema.sql",
  stateMachine: "supabase/migrations/20260731060520_payment_state_machine_hardening.sql",
  fulfillment: "supabase/migrations/20260731060530_payment_fulfillment.sql",
  schemaTest: "supabase/tests/32_payment_entitlements_schema.test.sql",
  courseTest: "supabase/tests/33_course_payment_fulfillment.test.sql",
  productTest: "supabase/tests/34_digital_product_payment_fulfillment.test.sql",
};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

for (const path of Object.values(paths)) {
  expect(existsSync(path), `${path} deve existir.`);
}

const enumMigration = read(paths.enumMigration);
const schema = read(paths.schemaMigration);
const stateMachine = read(paths.stateMachine);
const fulfillment = read(paths.fulfillment);
const tests = [paths.schemaTest, paths.courseTest, paths.productTest].map(read).join("\n");

expect(
  enumMigration.includes("add value if not exists 'suspended'"),
  "Produto digital deve possuir estado suspenso para chargeback.",
);
for (const table of [
  "payment_entitlements",
  "payment_entitlement_events",
  "commission_adjustment_events",
]) {
  expect(
    schema.includes(`alter table public.${table} force row level security`),
    `${table} deve usar RLS forçada.`,
  );
}
expect(
  schema.includes("payment_entitlements_subject_link") &&
    schema.includes("payment_entitlements_status_contract"),
  "Entitlement deve vincular exatamente um acesso e obedecer lifecycle.",
);
expect(
  schema.includes("freeze_payment_entitlement_identity"),
  "Identidade do entitlement deve ser imutável.",
);
expect(
  schema.includes("commission_adjustment_events") &&
    schema.includes("basis_amount_cents") &&
    !schema.includes("commission_rate"),
  "B19 deve registrar base financeira sem inventar percentual de afiliado.",
);

expect(
  stateMachine.includes("PAYMENT_AWAITING_CHARGEBACK_REVERSAL") &&
    stateMachine.includes("chargeback_won") &&
    stateMachine.includes("chargeback_lost"),
  "Máquina de estados deve representar vitória e perda de chargeback.",
);
expect(
  stateMachine.includes("PAYMENT_PARTIALLY_REFUNDED"),
  "Máquina de estados deve reconhecer estorno parcial do provedor.",
);
expect(
  stateMachine.includes("when p_event_type = 'PAYMENT_RECEIVED' then") &&
    stateMachine.includes("'refunded'::public.payment_attempt_status") &&
    stateMachine.includes("then p_current"),
  "Evento recebido tardio não pode reabrir pagamento terminal.",
);

for (const functionName of [
  "confirm_digital_product_purchase",
  "grant_payment_order_entitlement",
  "suspend_payment_order_entitlement",
  "revoke_payment_order_entitlement",
  "restore_payment_order_entitlement",
  "apply_payment_order_status_transition",
]) {
  expect(fulfillment.includes(`function private.${functionName}`), `${functionName} deve existir.`);
}
expect(
  fulfillment.includes("payment_orders_apply_entitlement") &&
    fulfillment.includes("after update of status on public.payment_orders"),
  "Transição financeira deve disparar fulfillment na mesma transação.",
);
expect(
  fulfillment.includes("private.confirm_course_purchase") &&
    fulfillment.includes("private.confirm_digital_product_purchase"),
  "B19 deve conceder curso e produto pelos contratos internos seguros.",
);
expect(
  fulfillment.includes("p_order.item_snapshot->'license'") &&
    fulfillment.includes("DIGITAL_PRODUCT_LICENSE_SNAPSHOT_INVALID"),
  "Produto comprado deve usar o snapshot de licença fechado no pedido.",
);
expect(
  fulfillment.includes("private.suspend_course_enrollment") &&
    fulfillment.includes("private.revoke_course_enrollment"),
  "Curso deve suspender e revogar pelo lifecycle canônico.",
);
expect(
  fulfillment.includes("'suspended'::public.digital_product_access_status") &&
    fulfillment.includes("'revoked'::public.digital_product_access_status"),
  "Produto deve suspender e revogar acesso real.",
);
expect(
  fulfillment.includes("'accrue'::public.commission_adjustment_kind") &&
    fulfillment.includes("'hold'::public.commission_adjustment_kind") &&
    fulfillment.includes("'reverse'::public.commission_adjustment_kind") &&
    fulfillment.includes("'restore'::public.commission_adjustment_kind"),
  "Lifecycle financeiro deve emitir todos os sinais de comissão.",
);
expect(
  fulfillment.includes("'attribution_status', 'pending_b20'"),
  "Comissão deve aguardar atribuição real da B20.",
);
expect(
  !fulfillment.includes("delete from public.payment_entitlements") &&
    !fulfillment.includes("delete from public.digital_product_accesses") &&
    !fulfillment.includes("delete from public.enrollments"),
  "Fulfillment não pode apagar histórico de acesso.",
);

for (const requiredTest of [
  "duplicate paid event is idempotent",
  "chargeback suspends enrollment",
  "won chargeback restores enrollment",
  "lost chargeback revokes enrollment",
  "product access preserves exact license snapshot",
  "chargeback suspends product access",
  "refund revokes product access",
  "commission signals preserve financial sequence",
]) {
  expect(tests.includes(requiredTest), `Testes B19 devem conter: ${requiredTest}`);
}

const forbidden = [
  "Math.random(",
  "commission_rate",
  "affiliate_id = '",
  "delete from public.payment_entitlement_events",
  "delete from public.commission_adjustment_events",
];
for (const pattern of forbidden) {
  expect(!fulfillment.includes(pattern), `Fulfillment B19 contém padrão proibido: ${pattern}`);
}

if (failures.length) {
  console.error("Contrato B19 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B19 aprovado.");
