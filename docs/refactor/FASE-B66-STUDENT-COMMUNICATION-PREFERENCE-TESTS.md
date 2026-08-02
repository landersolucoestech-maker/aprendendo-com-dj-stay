# Fase B66 — Contratos de preferências de comunicação

## Objetivo

Endurecer os contratos Zod das preferências de comunicação do aluno e adicionar cobertura unitária determinística alinhada às regras de consentimento já persistidas no PostgreSQL.

## Problemas tratados

Os modelos aceitavam campos extras e não validavam integralmente a relação entre marketing, analytics, versão do consentimento e horário da escolha.

A RPC já aplica uma representação canônica:

- marketing ou analytics exigem versão de consentimento;
- versão e horário são persistidos em conjunto;
- quando ambas as opções estão desativadas, versão e horário são removidos.

O frontend precisava rejeitar qualquer payload divergente dessa representação antes de utilizá-lo.

## Implementação

`src/contracts/student-communication-preferences.ts` passa a exigir:

- notificações internas transacionais sempre ativas;
- valores booleanos explícitos para todos os canais configuráveis;
- versão do consentimento entre 1 e 100 caracteres após trim;
- timestamps com timezone ou offset;
- versão e horário do consentimento presentes ou ausentes em conjunto;
- consentimento obrigatório quando marketing ou analytics estiverem ativos;
- consentimento ausente quando marketing e analytics estiverem desativados;
- objetos estritos para leitura e atualização.

E-mail transacional e atualizações de produto permanecem independentes do consentimento opcional de marketing e analytics.

## Testes

`src/contracts/student-communication-preferences.test.ts` cobre:

- configuração conservadora padrão;
- marketing, analytics e ambas as opções consentidas;
- trim da versão;
- literal obrigatório de notificações internas;
- versão sem horário e horário sem versão;
- marketing ou analytics sem consentimento;
- consentimento residual com opções desativadas;
- versão vazia ou acima do limite;
- timestamps sem timezone;
- campos extras;
- e-mail transacional e atualizações de produto sem consentimento opcional;
- todas as combinações válidas e inválidas de atualização.

## Contrato permanente

`scripts/check-student-communication-preference-tests.mjs` verifica:

- schemas estritos;
- limite da versão e timestamps com offset;
- coerência do par versão/horário;
- obrigatoriedade e remoção do consentimento conforme as opções;
- alinhamento com constraints e implementação da migration B42;
- cenários negativos obrigatórios da suíte;
- documentação e integração ao `typecheck`.

## Escopo excluído

- Nenhuma migration;
- nenhuma alteração de schema ou dados;
- nenhuma alteração em RPCs, hooks ou páginas;
- nenhum envio externo de e-mail ou analytics;
- nenhuma escrita no Supabase remoto;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B66 aprovado;
- lint aprovado;
- testes unitários aprovados;
- banco local e pgTAP aprovados;
- tipos sincronizados;
- TypeScript aprovado;
- build aprovado.
