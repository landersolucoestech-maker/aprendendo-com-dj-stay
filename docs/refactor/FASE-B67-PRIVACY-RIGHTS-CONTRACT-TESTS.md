# Fase B67 — Contratos de direitos de privacidade

## Objetivo

Endurecer os contratos Zod das solicitações de direitos de privacidade e adicionar cobertura unitária determinística alinhada aos constraints, transições e formatos RPC já existentes no PostgreSQL.

## Problemas tratados

Os contratos aceitavam campos extras e não reproduziam integralmente os limites de descrição, observações, eventos e tratamento persistidos no banco.

Também era possível aceitar payloads semanticamente impossíveis, como:

- evento de criação com status de origem;
- cancelamento fora de `submitted → cancelled`;
- mudança sem origem, destino ou alteração real;
- transição administrativa originada em estado final ou cancelado;
- solicitação final sem horário de tratamento;
- responsável sem horário correspondente;
- rejeição sem justificativa.

## Implementação

`src/contracts/privacy-rights-requests.ts` passa a exigir:

- descrição entre 10 e 4000 caracteres após trim;
- observações entre 1 e 4000 caracteres quando presentes;
- timestamps com timezone ou offset;
- eventos estritos com transições coerentes;
- solicitação, lista, criação e atualização administrativa estritas;
- status `completed` e `rejected` com horário de tratamento;
- demais status sem horário de tratamento;
- responsável e horário presentes em conjunto quando o campo administrativo existe;
- justificativa obrigatória para rejeição;
- e-mail administrativo válido ou nulo;
- eventos vazios por padrão nos retornos de mutação que não incluem histórico.

Os campos opcionais preservam os diferentes formatos reais:

- histórico do aluno;
- painel administrativo;
- retorno direto das mutações.

## Testes

`src/contracts/privacy-rights-requests.test.ts` cobre:

- tipos e status canônicos;
- eventos de criação, cancelamento e mudança de status;
- transições inválidas e notas fora do limite;
- solicitações do aluno, administrador e retorno de mutação;
- status final e tratamento;
- justificativa de rejeição;
- descrição, observações, e-mail, UUIDs e timestamps;
- campos extras;
- listas preenchidas e vazias;
- totais negativos ou fracionários;
- criação normalizada;
- atualizações administrativas válidas e inválidas.

`src/contracts/privacy-rights-transitions.test.ts` fixa as transições administrativas permitidas e rejeita regressões originadas em estados finais, cancelados ou com destinos não aceitos pelas RPCs.

## Contrato permanente

`scripts/check-privacy-rights-contract-tests.mjs` verifica:

- schemas estritos e primitivas compartilhadas;
- limites de descrição e observações;
- timestamps com offset;
- coerência de eventos e tratamento;
- alinhamento com constraints e transições da migration B44;
- cobertura dedicada das transições administrativas impossíveis;
- cenários negativos obrigatórios da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, hooks ou páginas;
- nenhuma execução automática de exportação, correção ou exclusão;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B67 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
