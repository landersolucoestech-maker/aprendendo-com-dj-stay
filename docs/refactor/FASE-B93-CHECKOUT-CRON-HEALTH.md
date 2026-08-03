# FASE B93 — Saúde administrativa do cron de checkout

## Objetivo

Dar ao instrutor/proprietário visibilidade operacional sobre o job PostgreSQL `expire-due-checkout-intents`, sem conceder acesso direto ao schema `cron` e sem expor o comando SQL, usuário do banco, banco de destino, PID, `jobid` ou `runid`.

## Implementação

A migration `20260803010000_checkout_expiration_cron_health.sql` adiciona:

- `private.get_checkout_expiration_cron_health(integer)` como read model `SECURITY DEFINER`;
- `public.get_checkout_expiration_cron_health(integer)` como wrapper `SECURITY INVOKER`;
- validação obrigatória do papel `administrador_proprietario`;
- limite entre 1 e 25 execuções recentes;
- leitura sanitizada de `cron.job` e `cron.job_run_details`;
- estados explícitos `healthy`, `degraded`, `running`, `never_run`, `inactive` e `missing`;
- contagem de falhas nas últimas 24 horas, última execução e último sucesso;
- mensagens de falha limitadas a 500 caracteres e sem caracteres de controle.

O frontend possui contrato Zod estrito, cliente RPC dedicado, hook React Query e o componente `CheckoutCronHealthCard` no dashboard do proprietário.

## Segurança

- `anon` não pode executar a RPC;
- usuários autenticados chegam somente ao wrapper público;
- o read model privado recusa qualquer papel diferente de `administrador_proprietario`;
- `authenticated` continua sem `USAGE` no schema `cron` e sem grants nas tabelas nativas;
- o payload não contém comando SQL nem metadados internos do executor;
- a observabilidade é somente leitura e não ativa, desativa, altera ou remove jobs.

## Interface

O dashboard administrativo mostra:

- estado sanitizado do job;
- agenda configurada;
- última execução;
- último sucesso;
- falhas nas últimas 24 horas;
- até oito execuções recentes;
- duração e mensagem sanitizada quando houver falha;
- atualização manual sem bloquear os demais indicadores administrativos.

## Cobertura

O pgTAP valida 34 condições, incluindo autorização, grants, job configurado sem histórico, falha recente, limitação do histórico, sanitização, job inativo e job ausente.

A suíte unitária valida o payload persistido, estados coerentes, datas, duração e rejeição de metadados internos. O contrato estático B93 permanece encadeado após B92 no gate bloqueante.

## Retenção

O `pg_cron` não remove automaticamente registros de `cron.job_run_details`. Esta fase limita somente o volume retornado pela interface; ela não apaga o histórico nativo. Uma política explícita e auditável de retenção deverá ser aplicada antes da promoção para produção para evitar crescimento indefinido dessa tabela.

## Escopo de ambiente

A implementação foi versionada exclusivamente na branch `dev`. Nenhuma migration B93 foi aplicada ao Supabase remoto e nenhuma alteração foi feita em `main` ou produção.
