# Fase B65 — Contratos de favoritos do aluno

## Objetivo

Endurecer os contratos Zod dos favoritos do aluno e adicionar cobertura unitária determinística alinhada aos retornos RPC já existentes.

## Problemas tratados

Os modelos de favoritos aceitavam timestamps arbitrários, títulos vazios, caminhos externos ou ambíguos e campos extras não retornados pelas RPCs.

O tipo de item também era definido por um enum próprio, duplicando a primitiva canônica já usada pelo checkout e pelos modelos financeiros.

## Implementação

`src/contracts/student-favorites.ts` passa a exigir:

- reutilização exata de `checkoutSubjectTypeSchema`, preservando o export público `studentFavoriteSubjectTypeSchema`;
- UUID válido para favorito e item referenciado;
- título não vazio após trim;
- caminho de ação interno iniciado por uma barra simples;
- rejeição de URL externa, caminho protocol-relative e barra invertida;
- `created_at` como datetime com timezone ou offset;
- total inteiro não negativo;
- objetos estritos para favorito, lista e resultado de toggle;
- status de favorito estritamente booleano.

## Testes

`src/contracts/student-favorites.test.ts` cobre:

- identidade com a definição canônica do checkout;
- tipos canônicos e tipos inválidos;
- favoritos de curso e produto digital;
- normalização e rejeição de título vazio;
- caminhos internos e caminhos inseguros;
- timestamps e UUIDs inválidos;
- campos internos adicionais;
- listas preenchidas e vazias;
- totais negativos ou fracionários;
- resultados de toggle verdadeiros e falsos;
- status booleano e valores coercíveis inválidos.

## Contrato permanente

`scripts/check-student-favorite-contract-tests.mjs` verifica:

- importação e identidade da primitiva canônica;
- ausência de enum duplicado;
- schemas estritos e primitivas obrigatórias;
- alinhamento com os tipos e campos retornados pela migration B41;
- cobertura dos cenários negativos de segurança;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, hooks, páginas ou componentes;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B65 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
