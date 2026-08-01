# FASE B37 — Painel administrativo de pedidos e pagamentos

## Objetivo

Disponibilizar ao `administrador_proprietario` uma visão operacional, paginada e somente leitura do domínio financeiro já existente.

## Escopo implementado

- rota protegida `/admin/pagamentos`;
- resumo de pedidos totais, pendentes, pagos, reembolsados e chargebacks;
- valor confirmado, valor reembolsado e perda por chargeback;
- filtros por status, tipo do item e busca por pedido, título ou e-mail;
- paginação de 50 itens na interface, com limite máximo de 200 no banco;
- última tentativa de pagamento por pedido;
- entitlement mais recente e indicação de controle de acesso;
- RPC privada `SECURITY DEFINER` com guarda `administrador_proprietario`;
- wrapper pública `SECURITY INVOKER`;
- nenhum grant direto adicional nas tabelas financeiras.

## Regra de segurança operacional

A interface é deliberadamente somente leitura. Ela não permite marcar pedidos como pagos, alterar status, conceder acesso ou simular webhook. O estado financeiro continua sendo alterado somente pelos fluxos de checkout e pelos webhooks validados do provedor.

## Métricas

`confirmed_amount_cents` soma pedidos que possuem `payment_confirmed_at`. A métrica é histórica e não deve ser interpretada isoladamente como receita líquida, pois reembolsos e chargebacks são apresentados separadamente.

## Fora de escopo

- homologação financeira externa do Asaas;
- conciliação bancária;
- emissão fiscal;
- promoção para produção.
