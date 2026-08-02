# Fase B59 — Limpeza idempotente do Supabase local no CI

## Objetivo

Eliminar falhas transitórias do gate causadas por containers ou volumes locais residuais do Supabase no runner, sem ocultar regressões reais de migrations ou pgTAP.

## Problema comprovado

O run `30733337500` do commit `2933a3447116b7458dfe7682f1e6f441f3c92906` falhou ao iniciar a stack local porque a porta `54322` já estava ocupada. A repetição do mesmo SHA em runner limpo passou integralmente, incluindo 1.394 testes pgTAP, tipos, TypeScript e build.

Esse resultado confirma uma colisão de infraestrutura local, não uma falha SQL.

## Implementação

O workflow técnico passa a executar:

1. `supabase stop --no-backup` em modo best-effort antes de `supabase start`;
2. `supabase start`, `db reset --local --no-seed` e `test db` como comandos bloqueantes;
3. geração e sincronização dos tipos enquanto o banco ainda está ativo;
4. um step final com `if: always()` para executar novamente `supabase stop --no-backup` antes do Typecheck e do build.

A limpeza usa a mesma CLI fixada pelo gate: `2.111.0`.

## Motivo da separação

A stack não pode ser encerrada no final do step de pgTAP, porque o step seguinte gera tipos TypeScript a partir do banco local. Por isso, a limpeza final ocorre somente depois da tentativa de geração de tipos e também é executada quando banco ou tipos falham.

## Tratamento de falhas

Somente os comandos de limpeza usam `|| true`, pois ausência de stack ou estado parcial não deve bloquear uma nova tentativa de inicialização.

Continuam estritamente bloqueantes:

- `supabase start`;
- `supabase db reset --local --no-seed`;
- `supabase test db`.

Logo, migrations inválidas, banco indisponível e falhas pgTAP continuam produzindo evidência vermelha acionável.

## Contrato permanente

`scripts/check-supabase-ci-cleanup.mjs` valida:

- limpeza antes da inicialização;
- limpeza final depois da geração de tipos e antes do Typecheck;
- execução final com `always()`;
- uso exclusivo da CLI fixada;
- ausência de mascaramento nos comandos bloqueantes;
- ausência de `--all`, `--linked` e comandos Docker destrutivos genéricos;
- encadeamento pelo contrato B46 de determinismo do CI.

## Limites de segurança

A operação atua somente na stack local identificada pelo `supabase/config.toml`. Não executa comandos contra o projeto remoto, não usa `--linked` e não modifica migrations, dados ou branches Supabase.

## Escopo excluído

- nenhuma migration;
- nenhuma alteração em schema ou dados;
- nenhuma alteração no projeto Supabase remoto;
- nenhuma alteração de versão da CLI;
- nenhum comando `docker rm`, `docker system prune` ou `docker volume prune`;
- nenhuma alteração na branch `main`.

## Critérios de aceite

- contrato B59 aprovado;
- lint aprovado;
- testes unitários aprovados;
- stack local iniciada após a limpeza prévia;
- banco e pgTAP aprovados;
- tipos sincronizados;
- limpeza final executada;
- TypeScript aprovado;
- build aprovado.
