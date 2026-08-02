# Fase B64 — Contratos de notificações do aluno

## Objetivo

Endurecer os contratos Zod das notificações transacionais do aluno e adicionar cobertura unitária determinística alinhada aos constraints e retornos RPC já existentes no PostgreSQL.

## Problemas tratados

Os contratos aceitavam campos extras, timestamps arbitrários, textos fora dos limites persistidos e caminhos de ação externos ou relativos.

Isso permitia que respostas divergentes das RPCs fossem aceitas silenciosamente pelo frontend, apesar de o banco já impor limites e formatos mais restritivos.

## Implementação

`src/contracts/student-notifications.ts` passa a exigir:

- tipos canônicos de notificação;
- UUID válido para a notificação e para a entidade de origem quando presente;
- título entre 3 e 160 caracteres após trim;
- mensagem entre 3 e 1000 caracteres após trim;
- caminho de ação interno iniciado por uma única barra, ou `null`;
- tipo de entidade de origem não vazio quando presente;
- `read_at` e `created_at` como datetime com timezone ou offset;
- contagens inteiras não negativas;
- objetos estritos para notificação, lista e resultados de leitura.

## Testes

`src/contracts/student-notifications.test.ts` cobre:

- todos os tipos canônicos e tipos inválidos;
- notificações lidas e não lidas;
- normalização de título e mensagem;
- limites textuais do banco;
- caminhos internos, externos, relativos e protocolados;
- UUIDs e timestamps inválidos;
- campos internos adicionais;
- contagens negativas ou fracionárias;
- resultados de leitura individual e em lote.

## Contrato permanente

`scripts/check-student-notification-contract-tests.mjs` verifica:

- alinhamento dos schemas com os constraints da migration B40;
- timestamps com offset;
- caminhos de ação exclusivamente internos;
- limites de título e mensagem;
- objetos estritos;
- cenários negativos obrigatórios da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, Edge Functions ou páginas;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B64 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
