# Fase B61 — Contrato e idempotência do checkout hospedado

## Objetivo

Endurecer a fronteira do checkout hospedado e adicionar cobertura unitária determinística para os payloads enviados e recebidos, sem alterar provider, migrations ou estado remoto.

## Problemas tratados

O checkout possuía validação de UUID, combinação de licença, HTTPS e expiração com timezone, mas não rejeitava campos extras e não tinha suíte unitária própria.

A chave idempotente era lida e gravada diretamente no `sessionStorage`. Bloqueio de storage, quota indisponível ou valor persistido corrompido podiam interromper a preparação do checkout ou enviar uma chave inválida ao contrato.

## Implementação

### Contratos estritos

`src/contracts/checkout.ts` passa a rejeitar campos extras tanto na solicitação quanto na resposta.

A suíte valida:

- tipos canônicos `course` e `digital_product`;
- curso sem licença;
- produto digital com licença;
- rejeição de combinações inválidas;
- UUIDs de item, licença, idempotência e intenção;
- URL obrigatoriamente HTTPS;
- expiração com timezone ou offset;
- status exclusivamente `checkout_created`;
- rejeição de campos adicionais.

### Idempotência resiliente

A responsabilidade foi extraída para `src/lib/hosted-checkout-idempotency.ts`.

O módulo:

- isola a chave por tipo, item e licença;
- reutiliza somente valor persistido com formato UUID válido;
- gera novo UUID quando não existe valor ou quando o valor está corrompido;
- persiste em modo best-effort;
- não propaga falhas de leitura, gravação ou remoção do `sessionStorage`;
- mantém a limpeza restrita à chave correspondente.

`src/hooks/useHostedCheckout.ts` preserva a API pública existente por reexportação, enquanto a implementação passa a residir em módulo independente e testável.

## Testes

Arquivos:

- `src/contracts/checkout.test.ts`;
- `src/lib/hosted-checkout-idempotency.test.ts`.

O ambiente de teste permanece Node e usa globals controlados para `window`, `sessionStorage` e `crypto.randomUUID`.

## Contrato permanente

`scripts/check-checkout-tests.mjs` verifica:

- presença dos arquivos de produção, testes e documentação;
- regras essenciais dos schemas;
- cenários negativos obrigatórios;
- tratamento best-effort do storage;
- integração do módulo com o hook;
- script `check:checkout-tests` e encadeamento ao `typecheck`.

## Escopo excluído

- nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração nas Edge Functions;
- nenhuma chamada ao provider;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`;
- nenhuma declaração de homologação financeira.

## Critérios de aceite

- contrato B61 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
