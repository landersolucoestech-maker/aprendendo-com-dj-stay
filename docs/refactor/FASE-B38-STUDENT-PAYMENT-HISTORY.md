# FASE B38 — Histórico real de pedidos e pagamentos do aluno

## Objetivo

Substituir as telas financeiras vazias do Portal do Aluno por dados reais do checkout e dos webhooks já persistidos.

## Segurança

- a RPC obtém o usuário exclusivamente por `auth.uid()`;
- não existe argumento `user_id` no contrato público;
- cada consulta filtra `payment_orders.user_id` pela sessão autenticada;
- usuários anônimos não executam a RPC;
- o retorno não contém payload bruto, eventos do provedor, e-mail ou dados de outra conta;
- a interface é somente leitura.

## Conteúdo exibido

- resumo de pedidos, pendências, pagamentos confirmados e reembolsos;
- título, valor, moeda, status e datas do pedido;
- última tentativa de cobrança em formato sanitizado;
- situação do entitlement e do controle de acesso;
- estado vazio somente quando a conta realmente não possui pedidos.

## Integração

`StudentPortalRouter` mantém as áreas acadêmicas no portal existente e direciona somente `orders` e `payments` para `StudentFinancialPortal`, preservando o mesmo `StudentPortalShell` e a mesma navegação.

## Fora de escopo

- alteração manual de status financeiro;
- exposição de payload ou eventos brutos do provedor;
- conciliação bancária e emissão fiscal;
- promoção para produção.
