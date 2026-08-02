# FASE B91 — Expiração e reconciliação de checkout

## Objetivo

Fechar a lacuna entre o prazo registrado pelo provedor e os estados financeiros persistidos pela plataforma.

Antes desta fase, `checkout_intents`, `payment_orders` e `payment_attempts` possuíam estados `expired`, mas nenhum fluxo confiável os aplicava usando o relógio do servidor. Além disso, o claim do provedor podia tentar reutilizar um intent cujo URL havia vencido sem verificar se o pedido vinculado já estava pago, reembolsado ou em chargeback.

## Implementação

A migration `20260803000000_checkout_expiration_reconciliation.sql` adiciona:

- classificação imutável de pedidos financeiramente terminais;
- reconciliação transacional de um checkout pelo `checkout_intent` e proprietário;
- expiração sincronizada de intent, pedido e tentativa ainda não pagos;
- evento de auditoria `expired`, gravado uma única vez;
- batch limitado e reservado ao `service_role` para processar checkouts vencidos;
- RPC autenticada `reconcile_my_checkout_return`, que reconcilia pelo horário do servidor antes de devolver o read model B90;
- proteção no claim do provedor contra reabertura de pedidos pagos, em reembolso ou em chargeback.

## Regras de segurança

O navegador não informa que um pagamento venceu e não altera estados financeiros diretamente. A reconciliação usa somente:

- `expires_at` persistido;
- `statement_timestamp()` do PostgreSQL;
- estado atual de intent, pedido e tentativa;
- identidade da sessão autenticada ou `service_role`.

Outro usuário recebe o mesmo resultado de item inexistente e não consegue provocar a expiração de um checkout alheio.

Pedidos nos estados `paid`, `refund_pending`, `refunded`, `chargeback_pending`, `chargeback_won` e `chargeback_lost` nunca são reabertos pelo claim do provedor.

## Nova tentativa

Quando o retorno reconciliado informa `expired` ou `cancelled`, a interface remove apenas a chave idempotente local daquele curso ou produto. A próxima ação de compra gera um novo intent.

A chave não é removida para pedido pago, reembolsado, contestado, suspenso ou revogado. Esses estados exigem decisão financeira ou de acesso explícita e não podem ser convertidos em nova cobrança automaticamente.

## Cobertura

`60_checkout_expiration_reconciliation.test.sql` cobre:

- grants de `anon`, `authenticated` e `service_role`;
- expiração sincronizada de intent, pedido e tentativa;
- idempotência do evento de auditoria;
- checkout futuro preservado;
- isolamento entre usuários;
- pedido pago preservado e bloqueado no claim;
- intent expirado não reutilizável com a mesma chave;
- batch limitado do `service_role`;
- rejeição de limite inválido.

A implementação está somente na branch `dev`. Nenhuma migration foi aplicada ao projeto Supabase remoto e a branch `main` permanece sem alterações.
