# FASE B96 — Analytics financeiro administrativo

## Objetivo

Adicionar ao módulo financeiro do proprietário indicadores reais por período, sem substituir a listagem operacional vitalícia da FASE B37 e sem apresentar valores estimados.

## Read model

A migration `20260803023000_payment_admin_analytics.sql` adiciona:

- `private.get_payment_admin_analytics(timestamptz, timestamptz, integer)` como função `SECURITY DEFINER`;
- `public.get_payment_admin_analytics(timestamptz, timestamptz, integer)` como wrapper `SECURITY INVOKER`;
- autorização obrigatória do papel `administrador_proprietario`;
- período padrão de 30 dias e limite máximo de 366 dias;
- limite entre 1 e 20 ofertas mais vendidas;
- agregação diária no fuso `America/Sao_Paulo`;
- inclusão exclusiva de pedidos com `payment_confirmed_at` persistido dentro do intervalo solicitado.

## Métricas

O read model retorna:

- pedidos confirmados;
- clientes únicos;
- receita bruta confirmada;
- reembolsos concluídos;
- chargebacks perdidos;
- valores ainda em reembolso ou chargeback pendente;
- receita após reversões concluídas;
- ticket médio;
- distribuição atual por status;
- receita por tipo: curso ou produto digital;
- ofertas mais vendidas;
- série diária contínua, incluindo dias sem venda.

## Semântica financeira

A métrica `net_after_reversals_cents` significa exclusivamente:

`receita bruta confirmada - reembolsos concluídos - chargebacks perdidos`

Ela não representa lucro contábil nem receita líquida fiscal. Tarifas do provider, impostos, custos, comissões de afiliados e outros ajustes não são descontados porque ainda não há um ledger consolidado que permita esse cálculo com precisão.

Valores em `refund_pending` e `chargeback_pending` são exibidos separadamente como risco financeiro e não são descontados até que o estado se torne conclusivo.

## Segurança e privacidade

- `anon` não pode executar a RPC;
- usuários autenticados sem papel de proprietário recebem `ADMIN_REQUIRED`;
- o payload não contém e-mail do cliente, ID de pagamento do provider ou ID de checkout externo;
- a interface é somente leitura;
- nenhum callback do navegador altera estado financeiro;
- a listagem B37 e o analytics B96 continuam consultas independentes.

## Interface

A página `/admin/pagamentos` apresenta:

- filtros rápidos de 7, 30, 90 e 365 dias;
- atualização manual do período;
- receita bruta, receita após reversões, ticket médio, pedidos confirmados e clientes únicos;
- valores em risco;
- comparação entre cursos e produtos digitais;
- ranking das ofertas mais vendidas;
- tendência dos últimos 14 dias do período;
- distribuição dos pedidos confirmados por estado atual.

## Cobertura

O pgTAP B96 possui 37 asserções e valida autorização, limites, fuso, recorte temporal, cálculos, agrupamentos, ordenação, dias zerados, ausência de identificadores sensíveis e rejeição de períodos inválidos.

A suíte unitária valida coerência matemática do payload, ticket médio, reversões, período e rejeição de campos extras. O contrato estático B96 permanece encadeado após o gate B37.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration B96 foi aplicada ao Supabase remoto e nenhuma alteração foi feita em `main` ou produção.
