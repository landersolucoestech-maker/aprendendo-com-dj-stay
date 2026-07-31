-- FASE B20: implementações privadas e wrappers públicos security invoker.

alter function public.request_affiliate_profile(text) set schema private;
alter function public.create_affiliate_link(public.checkout_subject_type, uuid, text) set schema private;
alter function public.deactivate_affiliate_link(uuid) set schema private;
alter function public.record_affiliate_click(text, uuid, text, text, text) set schema private;

revoke all on function private.request_affiliate_profile(text) from public, anon, authenticated;
revoke all on function private.create_affiliate_link(public.checkout_subject_type, uuid, text) from public, anon, authenticated;
revoke all on function private.deactivate_affiliate_link(uuid) from public, anon, authenticated;
revoke all on function private.record_affiliate_click(text, uuid, text, text, text) from public, anon, authenticated;

grant execute on function private.request_affiliate_profile(text) to authenticated;
grant execute on function private.create_affiliate_link(public.checkout_subject_type, uuid, text) to authenticated;
grant execute on function private.deactivate_affiliate_link(uuid) to authenticated;
grant execute on function private.record_affiliate_click(text, uuid, text, text, text) to anon, authenticated;

create function public.request_affiliate_profile(p_display_name text default null)
returns public.affiliate_profiles
language sql
security invoker
set search_path = ''
as $$
  select private.request_affiliate_profile(p_display_name)
$$;

create function public.create_affiliate_link(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_destination_path text
)
returns public.affiliate_links
language sql
security invoker
set search_path = ''
as $$
  select private.create_affiliate_link(p_subject_type, p_subject_id, p_destination_path)
$$;

create function public.deactivate_affiliate_link(p_link_id uuid)
returns public.affiliate_links
language sql
security invoker
set search_path = ''
as $$
  select private.deactivate_affiliate_link(p_link_id)
$$;

create function public.record_affiliate_click(
  p_link_code text,
  p_visitor_token uuid,
  p_landing_path text,
  p_referrer_origin text default null,
  p_user_agent text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.record_affiliate_click(
    p_link_code,
    p_visitor_token,
    p_landing_path,
    p_referrer_origin,
    p_user_agent
  )
$$;

revoke all on function public.request_affiliate_profile(text) from public, anon, authenticated;
revoke all on function public.create_affiliate_link(public.checkout_subject_type, uuid, text) from public, anon, authenticated;
revoke all on function public.deactivate_affiliate_link(uuid) from public, anon, authenticated;
revoke all on function public.record_affiliate_click(text, uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.request_affiliate_profile(text) to authenticated;
grant execute on function public.create_affiliate_link(public.checkout_subject_type, uuid, text) to authenticated;
grant execute on function public.deactivate_affiliate_link(uuid) to authenticated;
grant execute on function public.record_affiliate_click(text, uuid, text, text, text) to anon, authenticated;
