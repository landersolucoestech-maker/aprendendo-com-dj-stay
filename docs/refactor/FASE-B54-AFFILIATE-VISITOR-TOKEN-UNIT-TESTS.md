# Fase B54 — Testes unitários do token de visitante afiliado

## Objetivo

Proteger a continuidade e integridade do token local usado para atribuição de cliques e checkouts ao programa de afiliados.

## Risco coberto

O token de visitante é persistido no navegador e reaproveitado durante a navegação. Regressões nessa camada podem:

- aceitar identificadores arbitrários ou malformados;
- gerar um token novo em cada chamada e quebrar a continuidade da atribuição;
- sobrescrever token válido existente;
- impedir a navegação quando o storage estiver bloqueado ou sem quota;
- persistir o valor sob uma chave diferente da chave canônica.

## Suíte

`src/lib/affiliate-attribution.test.ts` executa em ambiente Node e simula somente os globals necessários.

A cobertura inclui:

- UUIDs válidos das versões aceitas pelo contrato;
- UUID em caixa alta;
- rejeição de valor nulo, vazio, arbitrário, sem hífens, versão fora do intervalo e variante inválida;
- retorno `null` quando `localStorage.getItem` lança erro;
- reutilização de token existente sem chamar `crypto.randomUUID` ou `setItem`;
- geração, persistência na chave `affiliate-visitor-token:v1` e retorno do mesmo UUID;
- retorno do UUID gerado mesmo quando `localStorage.setItem` falha;
- restauração de globals e mocks após cada teste.

A fase não adiciona jsdom porque as funções dependem apenas de `localStorage` e `crypto.randomUUID`, ambos simuláveis de forma explícita.

## Contrato permanente

`scripts/check-affiliate-visitor-token-tests.mjs` valida:

- a chave, o padrão UUID e as operações de leitura, geração e escrita no código de produção;
- os principais cenários válidos, inválidos e de erro na suíte;
- a restauração de globals;
- o script npm dedicado;
- a integração do contrato B54 ao `typecheck`.

## Escopo excluído

- nenhuma mudança no algoritmo de atribuição no banco;
- nenhuma mudança em cookies ou sessão;
- nenhuma dependência nova;
- nenhuma migration, dado ou Edge Function alterada;
- nenhum projeto Supabase ou branch `main` alterado.

## Critérios de aceite

- suíte unitária completa aprovada;
- contrato B54 aprovado;
- lint aprovado;
- banco e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
