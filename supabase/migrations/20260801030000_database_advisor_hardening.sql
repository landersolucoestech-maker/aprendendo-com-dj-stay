-- FASE B30: hardening orientado pelos advisors do Supabase.
-- Otimiza funções de autenticação nas políticas de certificados e torna
-- explícita a negação de acesso direto às tabelas operadas exclusivamente por RPC.

-- As subconsultas escalares são avaliadas uma vez por statement pelo planner,
-- evitando reavaliação de auth/private functions para cada linha.
drop policy if exists certificates_select on public.certificates;
create policy certificates_select
on public.certificates
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and user_id = (select auth.uid())
  )
);

drop policy if exists certificate_events_select on public.certificate_events;
create policy certificate_events_select
on public.certificate_events
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and exists (
      select 1
      from public.certificates certificate_record
      where certificate_record.id = certificate_events.certificate_id
        and certificate_record.user_id = (select auth.uid())
    )
  )
);

-- O domínio de contato é acessível somente pelas funções private SECURITY DEFINER.
-- As políticas restritivas documentam a negação direta sem conceder privilégios.
drop policy if exists contact_messages_direct_access_denied on public.contact_messages;
create policy contact_messages_direct_access_denied
on public.contact_messages
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists contact_message_events_direct_access_denied on public.contact_message_events;
create policy contact_message_events_direct_access_denied
on public.contact_message_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

-- Reafirma o contrato de privilégio mínimo mesmo em ambientes atualizados.
revoke all on public.contact_messages from public, anon, authenticated;
revoke all on public.contact_message_events from public, anon, authenticated;
