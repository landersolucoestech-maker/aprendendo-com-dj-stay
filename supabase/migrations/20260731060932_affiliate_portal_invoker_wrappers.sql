-- FASE B20: consultas do portal e checkout expostas por wrappers security invoker.

alter function public.get_affiliate_portal() set schema private;
alter function public.get_affiliate_admin_dashboard() set schema private;

revoke all on function private.get_affiliate_portal() from public, anon, authenticated;
revoke all on function private.get_affiliate_admin_dashboard() from public, anon, authenticated;
grant execute on function private.get_affiliate_portal() to authenticated;
grant execute on function private.get_affiliate_admin_dashboard() to authenticated;
grant execute on function private.prepare_checkout_intent_with_attribution(public.checkout_subject_type, uuid, uuid, uuid, uuid) to authenticated;

create function public.get_affiliate_portal()
returns jsonb
language sql security invoker set search_path=''
as $$ select private.get_affiliate_portal() $$;

create function public.get_affiliate_admin_dashboard()
returns jsonb
language sql security invoker set search_path=''
as $$ select private.get_affiliate_admin_dashboard() $$;

create or replace function public.prepare_checkout_intent_with_attribution(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_license_id uuid,
  p_idempotency_key uuid,
  p_affiliate_visitor_token uuid default null
)
returns public.checkout_intents
language sql security invoker set search_path=''
as $$
  select private.prepare_checkout_intent_with_attribution(
    p_subject_type,
    p_subject_id,
    p_license_id,
    p_idempotency_key,
    p_affiliate_visitor_token
  )
$$;

revoke all on function public.get_affiliate_portal() from public, anon, authenticated;
revoke all on function public.get_affiliate_admin_dashboard() from public, anon, authenticated;
revoke all on function public.prepare_checkout_intent_with_attribution(public.checkout_subject_type, uuid, uuid, uuid, uuid) from public, anon, authenticated;

grant execute on function public.get_affiliate_portal() to authenticated;
grant execute on function public.get_affiliate_admin_dashboard() to authenticated;
grant execute on function public.prepare_checkout_intent_with_attribution(public.checkout_subject_type, uuid, uuid, uuid, uuid) to authenticated;
