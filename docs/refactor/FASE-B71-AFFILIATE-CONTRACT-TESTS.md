# Fase B71 — contratos do programa de afiliados

## Objetivo

Endurecer os contratos TypeScript/Zod do programa de afiliados contra a estrutura persistida e os payloads efetivamente retornados pelas RPCs da Fase B20.

A fase cobre o portal do afiliado, o painel administrativo, o redirecionamento público e todas as mutações usadas pelo frontend.

## Implementação

### Contratos de leitura

`src/contracts/affiliate.ts` passou a validar de forma estrita:

- perfil do afiliado e coerência entre `pending`, `active` e `suspended`;
- termos por oferta, comissão e janela de atribuição;
- ofertas e presença conjunta dos dados de link ativo;
- links, códigos, caminhos internos e desativação;
- comissões, valores positivos, limite pela base e estado temporal;
- payouts resumidos e registros completos das RPCs;
- eventos limitados ao enum persistido;
- portal do afiliado e dashboard administrativo;
- resultado público de clique como união discriminada entre rejeição e atribuição aceita.

Os schemas reutilizam os tipos canônicos de UUID e `checkout_subject_type` já existentes no projeto.

### Contratos de entrada e mutação

Foram adicionados schemas para:

- solicitação do perfil;
- criação de link;
- ativação ou suspensão de perfil;
- configuração de termos;
- criação de payout;
- confirmação de pagamento;
- cancelamento de payout.

`src/hooks/useAffiliateProgram.ts` valida as entradas antes da chamada e aplica `parseDataContract` a todos os retornos das RPCs. Nenhuma mutação desse hook devolve mais `data` bruto ao consumidor.

### Segurança de caminhos

Os caminhos aceitos reproduzem o contrato persistido:

- começam com `/`;
- possuem no máximo 500 caracteres úteis;
- usam somente o conjunto permitido pela migration;
- rejeitam protocolo relativo iniciado por `//`;
- rejeitam barras invertidas.

### Testes

`src/contracts/affiliate.test.ts` cobre:

- estados válidos e combinações impossíveis;
- formatos de código e limites textuais;
- campos extras;
- caminhos externos ou inseguros;
- valores monetários e percentuais;
- ofertas com dados parciais de link ou termos;
- comissões e payouts incoerentes;
- IDs duplicados em payout;
- união discriminada da RPC de clique;
- entradas de todas as mutações;
- payloads agregados do portal e do painel administrativo.

`scripts/check-affiliate-contract-tests.mjs` mantém a cobertura vinculada às migrations e RPCs B20 e impede a volta de retornos brutos.

## Arquivos principais

- `src/contracts/affiliate.ts`
- `src/contracts/affiliate.test.ts`
- `src/hooks/useAffiliateProgram.ts`
- `src/pages/AffiliateRedirect.tsx`
- `scripts/check-affiliate-contract-tests.mjs`
- `package.json`

## Exclusões deliberadas

Nenhuma migration foi criada ou alterada.

Nenhuma RPC, policy, grant, dado ou configuração do Supabase remoto foi alterado.

A branch `main` não foi modificada. Todo o trabalho permaneceu na branch `dev`.

## Validação esperada

A fase somente pode ser encerrada após o mesmo snapshot aprovar:

- instalação limpa;
- lint;
- testes unitários;
- Supabase CLI;
- banco local e pgTAP;
- geração de tipos;
- TypeScript;
- build.
