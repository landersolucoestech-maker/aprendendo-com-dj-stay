import { existsSync, readFileSync } from "node:fs";

const ADR_PATH = "docs/adr/ADR-001-provedor-de-pagamentos.md";
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(existsSync(ADR_PATH), "ADR B17 deve existir.");

if (existsSync(ADR_PATH)) {
  const adr = readFileSync(ADR_PATH, "utf8");

  for (const required of [
    "**Status:** Aceita",
    "**Provedor principal:** Asaas",
    "**Estratégia de integração:** Checkout hospedado + API server-side + webhooks autenticados",
    "**Provedor de contingência arquitetural:** Mercado Pago",
    "O navegador não confirma pagamento",
    "webhook autenticado do Asaas",
    "reconciliação server-side",
    "ASAAS_API_KEY",
    "ASAAS_WEBHOOK_TOKEN",
    "asaas-access-token",
    "provider_event_id",
    "PaymentProviderAdapter",
    "PAYMENT_CONFIRMED",
    "PAYMENT_REFUNDED",
    "PAYMENT_CHARGEBACK_REQUESTED",
    "DIGITAL_PRODUCT_PURCHASE_SOURCE_RESERVED",
    "Mercado Pago",
    "Stripe",
    "Pagar.me",
  ]) {
    expect(adr.includes(required), `ADR B17 deve conter: ${required}`);
  }

  for (const forbidden of [
    "callbackUrl confirma",
    "redirect confirma",
    "pagamento-sucesso confirma",
    "VITE_ASAAS_API_KEY",
    "VITE_ASAAS_WEBHOOK_TOKEN",
    "sb_secret_",
    "eyJhbGci",
  ]) {
    expect(!adr.includes(forbidden), `ADR B17 contém padrão proibido: ${forbidden}`);
  }

  expect(
    adr.includes("retornar `2xx` rapidamente após persistência válida"),
    "Webhook deve persistir antes de responder com sucesso.",
  );
  expect(
    adr.includes("tolerar duplicidade e entrega fora de ordem"),
    "Webhook deve tolerar duplicidade e reordenação.",
  );
  expect(
    adr.includes("validar valor, moeda e vínculo do pedido"),
    "Fulfillment deve validar o snapshot financeiro local.",
  );
  expect(
    adr.includes("estorno confirmado revoga o acesso"),
    "Estorno deve revogar entitlement.",
  );
  expect(
    adr.includes("chargeback solicitado suspende preventivamente o acesso"),
    "Chargeback deve suspender entitlement.",
  );
  expect(
    adr.includes("O domínio local não poderá importar tipos do Asaas diretamente"),
    "Domínio deve permanecer desacoplado do SDK do provedor.",
  );
  expect(
    adr.includes("B18 e B19 deverão depender de uma interface interna"),
    "Próximas fases devem usar adapter interno.",
  );
  expect(
    adr.includes("Somente acessos ativos e comprovados" ) || adr.includes("acesso somente"),
    "ADR deve preservar a regra de entitlement comprovado.",
  );

  const secretAssignmentPattern = /ASAAS_(?:API_KEY|WEBHOOK_TOKEN)\s*=\s*[^\s`]+/;
  expect(!secretAssignmentPattern.test(adr), "ADR não pode conter valor de segredo Asaas.");
}

if (failures.length) {
  console.error("Contrato B17 inválido:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Contrato estático da FASE B17 aprovado.");
