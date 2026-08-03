# FASE B94 — Retenção do histórico dos jobs PostgreSQL

## Objetivo

Impedir crescimento indefinido de `cron.job_run_details` sem apagar execuções recentes, execuções em andamento ou histórico de jobs externos à plataforma.

## Implementação

A migration `20260803013000_platform_cron_history_retention.sql` adiciona:

- `private.prune_platform_cron_run_history(integer, integer)` como função `SECURITY DEFINER`;
- execução permitida somente quando `session_user = 'postgres'`;
- retenção configurável entre 7 e 365 dias;
- lote configurável entre 1 e 10.000 registros;
- remoção ordenada do histórico elegível mais antigo;
- `FOR UPDATE SKIP LOCKED` para permitir lotes concorrentes sem disputa;
- job `prune-platform-cron-run-history` executado diariamente às 03:20 UTC;
- configuração operacional padrão de 30 dias e até 5.000 exclusões por execução.

## Fronteira de dados

A limpeza considera somente execuções concluídas dos jobs:

- `expire-due-checkout-intents`;
- `prune-platform-cron-run-history`.

São preservados:

- registros com menos de 30 dias na configuração padrão;
- execuções em andamento, identificadas por `end_time is null`;
- qualquer histórico pertencente a jobs externos ou não reconhecidos;
- registros além do limite do lote, que ficam para a próxima execução.

## Segurança

- não existe wrapper no schema `public`;
- `anon`, `authenticated` e `service_role` não recebem `EXECUTE`;
- não há segredo, requisição HTTP, Edge Function ou chamada pela Data API;
- o comando agendado chama somente a função privada com limites explícitos;
- a migration remove jobs homônimos antes de agendar, impedindo duplicação.

## Cobertura

O pgTAP B94 possui 36 asserções e valida:

- existência, volatilidade e propriedade `SECURITY DEFINER`;
- ausência de privilégios para papéis da API;
- limites de retenção e lote;
- job único, ativo, diário, executado por `postgres` e no banco atual;
- remoção por lote do histórico antigo elegível;
- preservação de histórico recente;
- preservação de execuções em andamento;
- preservação de jobs externos;
- idempotência após a remoção dos registros elegíveis;
- rejeição de parâmetros fora dos limites.

O contrato estático B94 permanece encadeado após B93 no gate bloqueante.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration B94 foi aplicada ao Supabase remoto e nenhuma alteração foi feita em `main` ou produção.
