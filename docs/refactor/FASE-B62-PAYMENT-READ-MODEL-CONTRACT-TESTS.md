# Fase B62 — Contratos dos modelos financeiros de leitura

## Objetivo

Endurecer os contratos Zod usados pelo painel administrativo de pagamentos e pelo histórico financeiro do aluno, eliminando definições duplicadas e adicionando cobertura unitária determinística.

## Problemas tratados

Os modelos financeiros possuíam três fragilidades:

- o tipo de item do checkout era redefinido em `payment-admin.ts`, separado da definição canônica do checkout;
- objetos raiz e aninhados aceitavam campos extras por comportamento padrão do Zod;
- o código monetário validava somente o comprimento, permitindo valores como `brl` ou `B1L`.

Além disso, os modelos de leitura não validavam explicitamente a coerência entre o tipo do item e a presença da licença.

## Implementação

### Primitivas compartilhadas

`src/contracts/payment-admin.ts` importa e reexporta `checkoutSubjectTypeSchema` de `src/contracts/checkout.ts`, preservando a API usada pelos clientes RPC sem manter um segundo enum.

O módulo também disponibiliza:

- `paymentOrderStatusSchema`;
- `currencyCodeSchema`, limitado a três letras maiúsculas;
- `validatePaymentSubjectLicense`, usado pelos modelos administrativo e do aluno.

### Objetos estritos

Os seguintes níveis passam a rejeitar propriedades desconhecidas:

- pedido administrativo;
- tentativa administrativa;
- entitlement administrativo;
- resumo e raiz do dashboard;
- pedido do aluno;
- tentativa do aluno;
- entitlement do aluno;
- resumo e raiz do histórico.

### Coerência de item e licença

Os contratos aceitam somente:

- curso com `license_id` nulo;
- produto digital com `license_id` UUID válido.

## Testes

`src/contracts/payment-read-models.test.ts` cobre:

- identidade da definição canônica do tipo de checkout;
- todos os status de pedido suportados;
- rejeição de status desconhecido ou com capitalização divergente;
- moedas ISO maiúsculas e valores inválidos;
- pedidos de curso e produto digital;
- coerência de licença;
- UUIDs, e-mail, timestamps com offset e valores não negativos;
- campos extras em objetos raiz e aninhados;
- dashboard administrativo e histórico do aluno.

## Contrato permanente

`scripts/check-payment-read-model-tests.mjs` verifica:

- reutilização da definição canônica;
- ausência do enum duplicado;
- moeda com padrão alfabético maiúsculo;
- coerência compartilhada entre item e licença;
- uso de objetos estritos;
- cenários obrigatórios da suíte;
- documentação e encadeamento ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs ou Edge Functions;
- nenhuma chamada ao provider financeiro;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B62 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
