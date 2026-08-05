# FASE B144 — Retenção autônoma das quotas anônimas

## Objetivo

Remover contadores anônimos expirados mesmo quando não existe novo tráfego, sem depender exclusivamente da limpeza oportunística executada durante submissões de contato ou cliques de afiliado.

## Escopo

- GitHub: `landersolucoestech-maker/aprendendo-com-dj-stay`, branch `dev`;
- Supabase remoto `dev`: project ref `jmtyurketfclaneqxohu`;
- projeto Supabase principal `tduvfrxagujryfnqpdmc` e branch GitHub `main`: sem alterações.

## Defeito operacional

O B143 já atribuía `expires_at` a cada contador e eliminava no máximo 100 registros vencidos durante uma mutação anônima aceita. Essa estratégia limitava o custo por requisição, mas deixava uma lacuna: em períodos sem tráfego, registros expirados poderiam permanecer indefinidamente.

## Correção

A migration `20260805030014_anonymous_mutation_rate_limit_retention.sql` cria a função privada:

```text
private.prune_anonymous_mutation_rate_limits(p_delete_limit integer default 5000)
```

A função:

- é `SECURITY DEFINER` com `search_path` vazio;
- somente aceita sessão executada como `postgres`;
- rejeita lotes fora do intervalo de 1 a 10.000;
- seleciona apenas linhas com `expires_at <= statement_timestamp()`;
- ordena deterministicamente os candidatos;
- limita a seleção antes da exclusão;
- usa `FOR UPDATE SKIP LOCKED` para coexistir com execuções concorrentes;
- retorna a quantidade efetivamente removida;
- não concede `EXECUTE` a `PUBLIC`, `anon`, `authenticated` ou `service_role`.

## Job

O job `prune-anonymous-mutation-rate-limits` é executado como `postgres` aos trinta e sete minutos de cada hora:

```text
37 * * * *
```

Cada execução remove no máximo cinco mil registros vencidos:

```sql
select private.prune_anonymous_mutation_rate_limits(5000);
```

O nome fixo do job usa o comportamento de upsert de `cron.schedule`, evitando duplicação quando a migration é reconciliada no mesmo ambiente.

## Prova remota

A prova transacional contra o Supabase remoto `dev` criou três registros expirados e um ativo. O resultado persistido da função foi:

- primeiro lote limitado a dois registros: dois removidos;
- um registro expirado permaneceu após o primeiro lote;
- o registro ativo permaneceu intacto;
- segundo lote: um registro removido;
- zero registros expirados ao final;
- registro ativo ainda presente;
- lote inválido bloqueado com `ANONYMOUS_RATE_LIMIT_PRUNE_LIMIT_INVALID`;
- job único, ativo, com agenda e comando exatos;
- executor do job: `postgres`;
- zero privilégio de execução para os papéis de cliente.

Todas as inserções de prova foram revertidas. O estado remoto permaneceu sem contadores artificiais.

## Testes

O arquivo `supabase/tests/anonymous_mutation_rate_limit_retention.test.sql` possui 22 asserções pgTAP para:

- existência e configuração da função;
- executor e privilégios;
- limite de lote;
- `FOR UPDATE SKIP LOCKED`;
- unicidade, agenda, comando e executor do job;
- exclusão limitada em dois lotes;
- preservação de registros ativos;
- falha fechada para lote inválido.

O verificador `scripts/check-anonymous-mutation-rate-limit-retention.mjs` impede a remoção silenciosa da migration, do pgTAP, do job e da documentação operacional.

## Segurança e performance

O advisor de segurança foi executado após a migration e permaneceu sem lints. O advisor de performance continua apresentando apenas informações de ambiente sem tráfego representativo; nenhum índice foi removido com base nesses avisos.

A agenda horária adiciona o terceiro job da plataforma, muito abaixo da recomendação operacional de evitar excesso de jobs concorrentes. O minuto 37 não coincide com os jobs existentes de expiração a cada cinco minutos e retenção diária do histórico às 03:17.

## Limitações

A existência e configuração do job estão comprovadas. A observação de uma execução disparada pelo relógio do `pg_cron` depende da próxima janela horária e não é substituída pela chamada manual da mesma função.

## Resultado

Os contadores anônimos vencidos agora possuem retenção autônoma, limitada e concorrente, sem depender de tráfego futuro. O Supabase de produção e a branch `main` permaneceram intactos. A produção permaneceu intacta.
