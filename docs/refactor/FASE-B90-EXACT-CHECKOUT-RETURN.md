# Fase B90 — retorno financeiro correlacionado ao checkout exato

## Problema comprovado

A página `/pagamento-sucesso` não consultava a compra que originou o callback. Ela carregava todas as matrículas ativas do usuário e selecionava `activeEnrollments[0]`.

Esse comportamento podia:

- apresentar um curso antigo como resultado de uma compra nova;
- declarar acesso liberado quando o checkout retornado ainda estava pendente;
- não representar compras de produtos digitais, embora o callback fosse compartilhado;
- ignorar cancelamento, expiração, falha, reembolso, chargeback e revogação do entitlement.

## Identificador canônico

A Edge Function de checkout já inclui `checkout_intent=<uuid>` nas URLs de sucesso, cancelamento e expiração enviadas ao Asaas. O banco também mantém relação única entre:

- `checkout_intents.id`;
- `payment_orders.checkout_intent_id`;
- `payment_attempts.checkout_intent_id`;
- `payment_entitlements.order_id`.

A B90 usa esse UUID como única chave de correlação do retorno.

## Read model autenticado

A migration `20260802234500_checkout_return_status.sql` criou:

- `private.get_my_checkout_return(uuid)`;
- `public.get_my_checkout_return(uuid)`.

A função privada usa `SECURITY DEFINER` e `search_path` vazio. O wrapper permanece `SECURITY INVOKER`.

O read model:

- exige sessão autenticada;
- retorna dados somente quando o checkout pertence a `auth.uid()`;
- devolve `{ found: false }` para checkout inexistente ou pertencente a outra conta;
- consulta exatamente o pedido, a tentativa mais recente e o entitlement ligados ao checkout;
- não expõe URL ou identificador privado do checkout do provider;
- não expõe payload bruto de webhook ou evento financeiro.

O payload inclui somente estados, snapshots comerciais, datas e destinos de acesso necessários à tela de retorno.

## Estado da interface

`PaymentSuccess.tsx` deixou de usar `useCourseAccess`, `getActiveEnrollments` e qualquer fallback pela primeira matrícula.

A página agora representa explicitamente:

- pagamento pendente;
- pagamento confirmado com acesso ainda em finalização;
- compra confirmada somente com entitlement ativo e controlador de acesso;
- cancelamento;
- expiração;
- falha do provider ou tentativa;
- reembolso pendente ou concluído;
- chargeback pendente, revertido ou perdido;
- acesso suspenso ou revogado.

O polling ocorre a cada três segundos somente em `pending` e `finalizing_access`. Estados finais não continuam consultando indefinidamente.

## Curso e produto digital

A rota de retorno passou a usar o guard de compradores do marketplace, permitindo:

- aluno;
- afiliado;
- administrador proprietário.

O botão de acesso é derivado do tipo de compra e do papel atual:

- curso do aluno: detalhe do curso adquirido;
- curso do proprietário: preview administrativo do curso adquirido;
- produto digital: biblioteca de produtos do comprador.

O botão só aparece quando o entitlement exato está ativo e `controls_access = true`.

## Contratos e testes

- `59_checkout_return_status.test.sql` cobre correlação exata, isolamento entre usuários, matrícula não relacionada e produto digital;
- `checkout-return.test.ts` valida o payload estrito e os vínculos entre tipo de compra e entitlement;
- `checkout-return.test.ts` em `src/lib` valida polling e classificação dos estados;
- `check-exact-checkout-return.mjs` bloqueia o retorno da inferência por matrículas genéricas;
- o checker B90 é encadeado no gate B89, que já participa do `typecheck` bloqueante.

## Ambiente

A fase foi implementada exclusivamente na branch `dev`. Nenhuma migration foi aplicada diretamente ao Supabase remoto, e a branch `main` permanece sem alterações.

A aprovação técnica não substitui a homologação dos callbacks e webhooks no sandbox do Asaas.
