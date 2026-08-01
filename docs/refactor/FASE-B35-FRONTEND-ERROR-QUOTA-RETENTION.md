# FASE B35 — Quota e retenção de incidentes do frontend

## Estado

Implementado e aplicado exclusivamente no ambiente `dev`. Esta fase não representa promoção para produção.

## Quota transacional

A captura autenticada aceita no máximo **120 incidentes distintos por usuário por hora**.

- A contagem é serializada com `pg_advisory_xact_lock`, derivado do usuário autenticado.
- Reenvios do mesmo `event_id` pelo mesmo usuário são tratados como duplicatas idempotentes e não consomem quota adicional.
- Um `event_id` já utilizado por outro usuário gera conflito e não revela dados do incidente original.
- O banco retorna `FRONTEND_ERROR_RATE_LIMITED` quando a quota é excedida.

## Retenção

O expurgo administrativo remove apenas incidentes encerrados nos estados `resolved` ou `ignored` cujo `resolved_at` seja anterior ao corte configurado.

- Retenção mínima: **30 dias**.
- Retenção padrão na interface: **90 dias**.
- Retenção máxima aceita pelo banco: 3.650 dias.
- Lote padrão da interface: 1.000 registros.
- Lote máximo aceito pelo banco: 5.000 registros.
- Incidentes `open` e `acknowledged` nunca participam do expurgo.
- A seleção usa `FOR UPDATE SKIP LOCKED`, permitindo lotes concorrentes sem dupla remoção.

## Autorização e auditoria

A RPC pública é `security invoker` e pode ser executada por usuário autenticado, mas a implementação privada exige o papel `administrador_proprietario`.

Cada execução cria um evento em `frontend_error_maintenance_events` com:

- administrador responsável;
- retenção aplicada;
- data de corte;
- quantidade removida;
- limite do lote.

A tabela de auditoria força RLS, possui policy restritiva de negação direta e não concede acesso direto a `anon` ou `authenticated`. Não são armazenados IP ou user-agent bruto.

## Evidências

- Migration: `supabase/migrations/20260801050000_frontend_error_quota_retention.sql`
- pgTAP: `supabase/tests/47_frontend_error_quota_retention.test.sql`
- Contrato estático: `scripts/check-frontend-error-quota-retention.mjs`
- Interface: `/admin/erros`
