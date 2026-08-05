# FASE B140 — Sincronização do Supabase remoto de desenvolvimento

## Objetivo

Eliminar o drift entre as migrations já versionadas na branch `dev` e o projeto Supabase remoto de desenvolvimento, sem alterar `main` nem o projeto de produção.

## Escopo verificado

- repositório: `landersolucoestech-maker/aprendendo-com-dj-stay`;
- branch GitHub observada antes da execução: `dev` em `a6d5943d15c50b417bcbb29c466d8edb8e93673b`;
- projeto Supabase pai: `tduvfrxagujryfnqpdmc`;
- branch Supabase de desenvolvimento: `dev`;
- project ref de desenvolvimento: `jmtyurketfclaneqxohu`;
- projeto Supabase `main`: não alterado.

## Drift encontrado

O remoto de desenvolvimento já continha `student_course_access_pagination`, `student_progress_summary` e `student_course_detail_access`, porém não registrava quatorze migrations intermediárias presentes no GitHub. Isso deixava o ambiente remoto sem catálogo público, resolução e retorno de checkout, expiração automática, observabilidade do cron, retenção, analytics e as assinaturas paginadas dos read models administrativos.

## Migrations aplicadas no remoto `dev`

Em ordem de dependência:

1. `public_course_catalog` — `20260805010749`;
2. `course_checkout_resolution` — `20260805010802`;
3. `checkout_return_status` — `20260805010819`;
4. `checkout_expiration_reconciliation` — `20260805010856`;
5. `checkout_expiration_cron` — `20260805010911`;
6. `checkout_expiration_postgres_executor` — `20260805010926`;
7. `checkout_expiration_cron_health` — `20260805010947`;
8. `platform_cron_history_retention` — `20260805011002`;
9. `payment_admin_analytics` — `20260805011033`;
10. `academic_admin_analytics` — `20260805011107`;
11. `contact_admin_pagination` — `20260805011124`;
12. `students_admin_pagination` — `20260805011156`;
13. `affiliate_admin_pagination` — `20260805011228`;
14. `affiliate_portal_pagination` — `20260805011309`.

Nenhuma migration nova foi inventada nesta fase. O SQL aplicado corresponde às migrations já versionadas em `supabase/migrations`.

## Evidências pós-aplicação

### Contratos PostgreSQL

Foram confirmadas as assinaturas públicas e privadas esperadas para:

- `get_public_course_catalog()`;
- `resolve_course_checkout_subject(text)`;
- `get_my_checkout_return(uuid)`;
- `reconcile_my_checkout_return(uuid)`;
- `expire_due_checkout_intents(integer)`;
- `get_checkout_expiration_cron_health(integer)`;
- `get_payment_admin_analytics(timestamptz, timestamptz, integer)`;
- `get_academic_admin_analytics(timestamptz, timestamptz, uuid, integer)`;
- `get_contact_messages_admin(contact_message_status, text, integer, integer)`;
- `get_students_admin_dashboard(text, integer, integer, integer, integer, integer, integer)`;
- `get_affiliate_admin_dashboard(integer, integer, integer, integer, integer, integer, integer, integer)`;
- `get_affiliate_portal(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer)`.

Os wrappers do schema `public` permanecem `SECURITY INVOKER`; as implementações privilegiadas permanecem isoladas no schema `private` com validações de sessão e papel.

### Catálogo público

O smoke direto de `public.get_public_course_catalog()` retornou:

- payload JSON do tipo `object`;
- chave `courses` do tipo `array`;
- zero cursos visíveis no estado atual do banco.

O array vazio é comportamento válido e não foi substituído por fixture ou dado inventado.

### Agendador PostgreSQL

- extensão `pg_cron`: instalada na versão `1.6.4`;
- job `expire-due-checkout-intents`: ativo, agenda `*/5 * * * *`, comando `select private.expire_due_checkout_intents(100);`;
- job `prune-platform-cron-run-history`: ativo, agenda `20 3 * * *`, comando `select private.prune_platform_cron_run_history(30, 5000);`;
- primeira execução observada do job de expiração: `2026-08-05 01:10:00 UTC` (`2026-08-04 22:10:00 America/Sao_Paulo`), status `succeeded`, retorno `1 row`.

### Segurança

O advisor de segurança do Supabase foi executado depois das migrations e retornou zero lints.

O advisor de performance mantém apenas avisos informativos de índices ainda não utilizados no banco de desenvolvimento. Nenhum índice foi removido porque ausência de uso em ambiente sem tráfego representativo não prova redundância.

### Edge Functions

As funções remotas permaneceram ativas e não foram alteradas nesta fase:

- `media-playback`;
- `create-asaas-checkout`;
- `asaas-webhook`.

## Limites da conclusão

Esta fase comprova sincronização estrutural e execução interna no Supabase remoto de desenvolvimento. Ela não comprova:

- compra real no sandbox Asaas;
- confirmação, reembolso ou chargeback pelo provider;
- entrega de e-mail transacional;
- carga representativa;
- pentest;
- promoção para produção.

## Resultado

O drift identificado entre GitHub `dev` e Supabase remoto `dev` foi eliminado para as quatorze migrations verificadas. `main` e produção permaneceram intactos.