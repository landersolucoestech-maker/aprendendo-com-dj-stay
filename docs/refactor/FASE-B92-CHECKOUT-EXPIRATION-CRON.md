# FASE B92 — Cron de expiração de checkout

## Objetivo

Executar automaticamente a reconciliação B91 mesmo quando o comprador não retorna à página de pagamento.

A B91 já possuía um batch limitado e idempotente, mas dependia de uma chamada autenticada ou de um executor externo. A B92 agenda esse batch dentro do PostgreSQL, sem requisição HTTP, segredo de cron, Edge Function adicional ou dependência do navegador.

## Agendamento

A migration `20260803003000_checkout_expiration_cron.sql`:

- habilita `pg_cron` no schema recomendado pelo Supabase;
- restringe o schema `cron` a `postgres`;
- cria um único job nomeado `expire-due-checkout-intents`;
- executa o job a cada cinco minutos;
- chama apenas `private.expire_due_checkout_intents(100)`;
- remove qualquer job anterior com o mesmo nome antes de recriá-lo.

O limite de 100 registros mantém cada execução curta e permite que execuções seguintes continuem o processamento sem uma transação ilimitada.

## Modelo de segurança

O `pg_cron` registra o usuário que agenda o job e executa o comando com as permissões desse usuário. Como migrations Supabase são aplicadas por `postgres`, o job é persistido com `username = 'postgres'`.

A função `private.assert_checkout_expiration_executor()` aceita somente:

- uma sessão de banco cujo `session_user` seja `postgres`, usada pelo job agendado;
- o fluxo `service_role` já autorizado pela B91.

A função não possui grant para `PUBLIC`, `anon`, `authenticated` ou `service_role`. O batch continua inacessível para `anon` e `authenticated`; o `service_role` mantém somente o grant necessário ao caminho operacional B91.

O schema `cron` não recebe `USAGE` para papéis da Data API. Portanto, usuários da aplicação não podem listar, alterar, pausar ou duplicar jobs.

## Operação

O job roda com a expressão:

```text
*/5 * * * *
```

O comando persistido é:

```sql
select private.expire_due_checkout_intents(100);
```

Cada execução:

1. seleciona somente intents vencidos e não terminais;
2. usa `FOR UPDATE SKIP LOCKED`;
3. sincroniza intent, pedido e tentativa;
4. grava o evento de expiração uma única vez;
5. ignora pedidos pagos, em reembolso ou em chargeback.

Os metadados do job ficam em `cron.job`; os resultados de execução ficam em `cron.job_run_details`, conforme o comportamento nativo do Supabase Cron.

## Cobertura

`61_checkout_expiration_cron.test.sql` valida:

- instalação de `pg_cron`;
- grants do schema e das funções privadas;
- existência de um único job ativo;
- frequência, banco, usuário e comando exatos;
- execução do batch como `postgres`;
- sincronização de intent, pedido e tentativa;
- auditoria única;
- idempotência;
- manutenção do limite máximo.

A implementação está somente na branch `dev`. A migration não foi aplicada ao projeto Supabase remoto e a branch `main` permanece sem alterações.
