# ADR-001 — Provedor de pagamentos da plataforma

- **Status:** Aceita
- **Data da decisão:** 31 de julho de 2026
- **Fase:** B17 — Decisão do provedor de pagamentos
- **Escopo:** cursos e produtos digitais vendidos pela plataforma
- **Provedor principal:** Asaas
- **Estratégia de integração:** Checkout hospedado + API server-side + webhooks autenticados
- **Provedor de contingência arquitetural:** Mercado Pago

## 1. Contexto

A plataforma precisa aceitar pagamentos no Brasil, inicialmente por **Pix** e **cartão de crédito**, sem armazenar dados sensíveis de cartão e sem permitir que um redirecionamento do navegador seja tratado como confirmação financeira.

As fases B18 e B19 implementarão checkout, pedidos e pagamentos. Esta ADR define previamente a fronteira de confiança, o provedor principal, o modelo de integração e as condições que a implementação deverá obedecer.

A decisão considera:

- Pix disponível para uma empresa brasileira desde o início da operação;
- cartão à vista e parcelado;
- checkout hospedado para reduzir escopo PCI e exposição de dados sensíveis;
- API e webhooks adequados para fluxo assíncrono;
- estorno total ou parcial;
- chargeback, contestação e perda de acesso;
- sandbox e separação rigorosa entre desenvolvimento e produção;
- custos publicamente verificáveis;
- suporte operacional no Brasil;
- capacidade de reconciliação quando webhooks atrasarem ou falharem;
- possibilidade de troca futura de provedor sem reescrever o domínio de pedidos.

## 2. Decisão

Será utilizado o **Asaas como provedor principal de pagamentos**, por meio do **Checkout hospedado do Asaas**, com os métodos:

- `PIX`;
- `CREDIT_CARD`.

A aplicação criará o checkout exclusivamente no backend. O navegador receberá somente a URL hospedada do checkout e será redirecionado para o ambiente do provedor.

O Asaas não será o sistema de registro do negócio. O sistema de registro será o banco PostgreSQL da aplicação, contendo pedido, tentativa de pagamento, eventos recebidos, conciliação, liberação e revogação de acesso.

## 3. Motivos determinantes

### 3.1 Pix disponível sem dependência de convite

O Asaas oferece Pix e cartão no checkout para contas habilitadas. Isso elimina o bloqueio identificado no Stripe, cujo Pix para contas brasileiras permanece sujeito a elegibilidade e convite, incluindo histórico mínimo de processamento informado na documentação oficial.

### 3.2 Checkout hospedado

O checkout hospedado reduz a superfície de segurança da aplicação:

- nenhum dado de cartão transita pelo frontend ou pelo Supabase;
- a plataforma não renderiza formulário próprio de cartão;
- a aplicação não armazena PAN, CVV, data de validade ou token de cartão reutilizável;
- o provedor executa autenticação, antifraude e captura no ambiente dele.

### 3.3 Preço público compatível com operação inicial

Na data desta decisão, a página pública de preços do Asaas apresenta, para o modelo padrão:

- Pix: **R$ 1,99 por recebimento**, após o período promocional informado pelo provedor;
- cartão de crédito à vista: **a partir de 2,99% + R$ 0,49**;
- cartão parcelado: **a partir de 3,49% + R$ 0,49**.

Taxas efetivas, antecipação, prazo de recebimento e condições comerciais devem ser consultados na conta contratada antes da ativação de produção. Nenhuma taxa será codificada como constante definitiva na aplicação.

### 3.4 Webhooks adequados ao modelo assíncrono

O Asaas documenta autenticação por token no webhook, reentrega de eventos e necessidade de idempotência. Isso atende ao requisito de que o pagamento seja confirmado fora do navegador.

### 3.5 Operação brasileira

O provedor possui operação, documentação, cobrança, suporte e terminologia orientados ao mercado brasileiro, facilitando Pix, parcelamento, estorno e tratamento operacional de chargeback.

## 4. Alternativas avaliadas

| Provedor | Pix | Cartão | Checkout hospedado | Custos e liquidação | Webhooks, estorno e disputa | Decisão |
|---|---|---|---|---|---|---|
| **Asaas** | Disponível | À vista e parcelado | Sim | Preço público; Pix por tarifa fixa e cartão percentual + tarifa fixa. Condições finais dependem da conta. | Webhook autenticado, reentrega, eventos de estorno e chargeback. | **Selecionado** |
| **Mercado Pago** | Disponível | Disponível | Sim, além de Checkout Transparente | Taxa e prazo podem variar por produto, conta e prazo escolhido. | Webhooks, reembolsos e chargebacks maduros. | Contingência principal |
| **Stripe** | Disponível apenas para contas brasileiras elegíveis/convidadas | Disponível | Sim | Cartão nacional publicado a 3,99% + R$ 0,39; Pix publicado a 1,19%. | API e webhooks excelentes, estorno e disputa maduros. | Rejeitado nesta fase pelo bloqueio de disponibilidade do Pix |
| **Pagar.me** | Disponível na API/Checkout V5 | Disponível | Sim | Condições e taxas dependem da oferta e contratação comercial. | API V5, webhooks, estornos, recebíveis e chargeback. | Rejeitado nesta fase por maior dependência comercial e operacional |

## 5. Fronteira de confiança

### 5.1 O navegador não confirma pagamento

Os seguintes sinais são **não confiáveis** e nunca poderão liberar curso ou produto digital:

- retorno para `callbackUrl`;
- acesso à página `/pagamento-sucesso`;
- query string informando sucesso;
- estado local do frontend;
- resposta visual do checkout;
- botão clicado pelo usuário;
- `externalReference` recebido do navegador sem validação server-side.

A página de retorno poderá informar apenas que o pagamento está sendo processado e consultar o estado persistido do pedido.

### 5.2 Fontes autorizadas de confirmação

Um pagamento somente poderá mudar para estado confirmado por uma destas fontes:

1. webhook autenticado do Asaas, persistido e processado de forma idempotente;
2. reconciliação server-side consultando a API do Asaas com credencial secreta;
3. ação administrativa excepcional, explicitamente auditada, que não poderá usar a origem `purchase` sem evidência do provedor.

### 5.3 Credenciais

Credenciais serão usadas somente em Edge Functions ou outro backend confiável.

Nomes previstos, sem valores no repositório:

- `ASAAS_API_KEY`;
- `ASAAS_WEBHOOK_TOKEN`;
- `ASAAS_ENVIRONMENT`;
- `ASAAS_API_BASE_URL`;
- `PAYMENT_PROVIDER`.

É proibido:

- prefixar segredo com `VITE_`;
- enviar chave do Asaas ao navegador;
- armazenar segredo em tabela pública;
- registrar segredo em logs;
- versionar `.env` ou chave de sandbox/produção.

## 6. Arquitetura da integração

### 6.1 Criação do checkout

Fluxo obrigatório:

1. usuário autenticado seleciona curso ou produto;
2. backend valida preço, moeda, disponibilidade, licença e identidade do usuário;
3. backend cria um pedido local imutável para aquela cotação;
4. backend cria uma tentativa de pagamento;
5. backend envia ao Asaas o valor derivado do snapshot local;
6. backend usa `externalReference` opaco apontando para a tentativa local;
7. backend persiste o identificador do checkout e o identificador do pagamento retornados;
8. navegador recebe somente a URL hospedada;
9. usuário conclui o pagamento no Asaas;
10. confirmação ocorre por webhook ou reconciliação, nunca pelo redirect.

### 6.2 Endpoint de webhook

A implementação B19 deverá criar uma Edge Function dedicada, por exemplo `asaas-webhook`, com as seguintes regras:

- aceitar somente `POST`;
- validar `asaas-access-token` por comparação segura;
- rejeitar corpo inválido antes de processar domínio;
- persistir o evento bruto sanitizado antes de responder;
- usar o identificador único do evento como chave idempotente;
- retornar `2xx` rapidamente após persistência válida;
- processar efeitos de negócio em etapa transacional separada;
- tolerar duplicidade e entrega fora de ordem;
- nunca registrar chave, token completo ou dados sensíveis de pagamento;
- manter trilha de tentativas, erro e reprocessamento;
- consultar a API quando a sequência de eventos for inconclusiva.

### 6.3 Idempotência

As seguintes unicidades serão obrigatórias:

- um evento do provedor por `provider + provider_event_id`;
- uma tentativa por chave idempotente local;
- um pagamento local por identificador de cobrança do provedor;
- uma liberação ativa por `entitlement_type + entitlement_id + user_id`;
- uma transição de estado aplicada uma única vez.

Reentregar o mesmo webhook não poderá:

- criar outro pedido;
- duplicar recebimento;
- duplicar matrícula;
- duplicar acesso a produto;
- reenviar comissão;
- alterar novamente estoque ou contabilidade.

## 7. Máquina de estados local

### 7.1 Pedido

Estados previstos:

- `draft`;
- `checkout_pending`;
- `payment_pending`;
- `paid`;
- `fulfillment_pending`;
- `fulfilled`;
- `cancelled`;
- `expired`;
- `refund_pending`;
- `refunded`;
- `chargeback_pending`;
- `chargeback_won`;
- `chargeback_lost`.

### 7.2 Tentativa de pagamento

Estados previstos:

- `created`;
- `checkout_created`;
- `pending`;
- `confirmed`;
- `received`;
- `failed`;
- `expired`;
- `cancelled`;
- `refund_pending`;
- `refunded`;
- `chargeback_pending`;
- `chargeback_won`;
- `chargeback_lost`.

### 7.3 Regras de transição

- `confirmed` ou `received` poderá tornar o pedido `paid`;
- `paid` não significa automaticamente `fulfilled`; a liberação será uma transação separada e idempotente;
- estorno confirmado revoga o acesso vinculado ao item estornado;
- chargeback solicitado suspende preventivamente o acesso, preservando histórico;
- chargeback ganho poderá restaurar o acesso apenas por transição auditada;
- chargeback perdido manterá a revogação;
- um evento antigo não poderá regredir um estado terminal mais novo;
- valores, moeda e identidade serão comparados com o snapshot do pedido antes da confirmação.

## 8. Mapeamento inicial de eventos Asaas

O mapeamento exato deverá ser validado contra a documentação vigente durante B19. A intenção de domínio é:

| Evento do Asaas | Efeito local esperado |
|---|---|
| `PAYMENT_CREATED` | tentativa criada ou reconhecida, sem liberar acesso |
| `PAYMENT_AWAITING_RISK_ANALYSIS` | manter pagamento pendente |
| `PAYMENT_APPROVED_BY_RISK_ANALYSIS` | manter pendente até confirmação financeira |
| `PAYMENT_CONFIRMED` | validar valor/moeda e marcar pagamento confirmado |
| `PAYMENT_RECEIVED` | registrar recebimento; pode confirmar caso ainda pendente |
| `PAYMENT_OVERDUE` | manter pedido não pago; não liberar acesso |
| `PAYMENT_DELETED` | cancelar tentativa quando ainda permitido |
| `PAYMENT_REFUND_IN_PROGRESS` | entrar em `refund_pending` |
| `PAYMENT_REFUNDED` | marcar estornado e revogar entitlement |
| `PAYMENT_CHARGEBACK_REQUESTED` | entrar em `chargeback_pending` e suspender acesso |
| `PAYMENT_CHARGEBACK_DISPUTE` | registrar contestação em andamento |
| reversão ou vitória de chargeback | restaurar somente após evento/reconciliação conclusiva |

## 9. Estorno e chargeback

### 9.1 Estorno

- estorno será solicitado apenas pelo backend;
- o pedido local registra solicitação antes da chamada externa;
- sucesso HTTP da solicitação não equivale a estorno concluído;
- estado final virá por webhook ou reconciliação;
- estorno parcial deverá revogar somente os itens ou quantidades abrangidos;
- taxas não serão presumidas como devolvidas;
- falhas serão reprocessáveis e auditadas.

### 9.2 Chargeback

- todo chargeback será persistido com motivo, prazo e evidências disponíveis;
- o acesso será suspenso preventivamente quando houver risco financeiro confirmado;
- documentos de contestação não serão armazenados em bucket público;
- decisão final atualizará pedido, pagamento, ledger e entitlement;
- suporte operacional deverá acompanhar prazo de defesa no painel do provedor.

## 10. Sandbox e ambientes

### Desenvolvimento

- utilizar exclusivamente credenciais de sandbox;
- URL base e chave separadas das credenciais de produção;
- webhooks apontam para endpoint de desenvolvimento;
- dados de teste não podem ser copiados para produção;
- nenhum teste automatizado chama a API de produção.

### Produção

- ativação somente após validação cadastral e comercial;
- credenciais inseridas como secrets no projeto Supabase de produção;
- token de webhook diferente do ambiente dev;
- allowlist operacional de URLs de callback;
- teste de valor mínimo real, estorno, Pix expirado, cartão recusado e reentrega de webhook antes do lançamento.

## 11. Reconciliação e contingência

Será implementada reconciliação periódica para pedidos não terminais:

- consultar cobranças pendentes ou sem webhook conclusivo;
- comparar valor, moeda, cliente e `externalReference`;
- registrar divergências sem sobrescrever evidência anterior;
- reprocessar fulfillment idempotente;
- alertar pedidos pagos sem entitlement e entitlements sem pagamento válido.

Se o Asaas apresentar indisponibilidade prolongada:

1. novos checkouts poderão ser temporariamente bloqueados;
2. pedidos existentes continuarão reconciliáveis;
3. webhooks serão processados quando retomados;
4. a aplicação não mudará automaticamente para outro provedor no mesmo pedido;
5. Mercado Pago poderá ser ativado como novo adapter somente para novos pedidos, após ADR complementar e homologação.

## 12. Adapter de provedor

B18 e B19 deverão depender de uma interface interna, e não diretamente do SDK do Asaas:

```ts
interface PaymentProviderAdapter {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  requestRefund(input: RefundInput): Promise<RefundResult>;
  parseWebhook(request: Request): Promise<VerifiedProviderEvent>;
}
```

O adapter deverá normalizar:

- identificadores;
- status;
- valores em centavos;
- moeda;
- método de pagamento;
- datas;
- eventos de estorno;
- eventos de chargeback;
- erros transitórios e permanentes.

O domínio local não poderá importar tipos do Asaas diretamente.

## 13. Observabilidade e auditoria

Devem existir métricas e logs para:

- checkout criado, falho e expirado;
- webhook recebido, duplicado, rejeitado e reprocessado;
- latência entre evento do provedor e aplicação local;
- pagamento confirmado sem fulfillment;
- fulfillment sem pagamento válido;
- estorno solicitado, concluído e falho;
- chargeback aberto e encerrado;
- divergência de reconciliação;
- volume e valor por método de pagamento.

Logs devem usar IDs internos e do provedor, sem segredo e sem dados completos de cartão.

## 14. Consequências

### Positivas

- Pix e cartão atendidos no contexto brasileiro;
- redução de escopo PCI;
- preço inicial publicamente verificável;
- confirmação assíncrona e auditável;
- possibilidade de trocar o provider por adapter;
- acesso a cursos e produtos desacoplado do redirect.

### Negativas

- dependência operacional e comercial do Asaas;
- necessidade de processador de webhooks idempotente;
- necessidade de reconciliação periódica;
- prazo e custo efetivos dependem da conta e antecipação;
- contingência requer outro adapter e homologação, não simples troca de variável.

## 15. Critérios obrigatórios para B18 e B19

A implementação futura não será aceita se:

- confirmar pagamento pela página de retorno;
- criar cobrança diretamente no frontend;
- armazenar chave Asaas em variável `VITE_*`;
- liberar acesso antes de validar valor, moeda e vínculo do pedido;
- processar webhook sem autenticação e idempotência;
- usar `purchase` em concessão administrativa sem evidência do provedor;
- misturar sandbox e produção;
- deixar estorno ou chargeback sem revogação/suspensão correspondente;
- acoplar o domínio diretamente ao formato de resposta do Asaas;
- omitir trilha de auditoria e reconciliação.

## 16. Referências oficiais consultadas

### Asaas

- Preços e taxas: https://www.asaas.com/precos-e-taxas
- Introdução ao Checkout: https://docs.asaas.com/docs/getting-started-with-checkout
- Implementação de webhooks: https://docs.asaas.com/docs/how-to-implement-asaas-webhooks
- Eventos de pagamento: https://docs.asaas.com/docs/payment-events
- Estornos: https://docs.asaas.com/docs/refunds
- Chargebacks: https://docs.asaas.com/docs/chargebacks

### Mercado Pago

- Checkout API: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/overview
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/notifications/webhooks

### Stripe

- Preços no Brasil: https://stripe.com/br/pricing
- Pix: https://docs.stripe.com/payments/pix

### Pagar.me

- Checkout hospedado: https://docs.pagar.me/docs/checkout-about
- Pix: https://docs.pagar.me/docs/pix-1
- Webhooks: https://docs.pagar.me/docs/webhooks-1
- Oferta e recebimento: https://www.pagar.me/oferta
