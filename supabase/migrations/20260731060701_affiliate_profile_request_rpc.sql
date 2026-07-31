-- FASE B20: solicitação idempotente do perfil de afiliado.

create or replace function public.request_affiliate_profile(
  p_display_name text default null
)
returns public.affiliate_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.affiliate_profiles;
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'afiliado'::public.app_role then
    raise exception 'AFFILIATE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_display_name is not null
     and char_length(btrim(p_display_name)) not between 2 and 120 then
    raise exception 'AFFILIATE_DISPLAY_NAME_INVALID' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('affiliate-profile:' || v_user_id::text, 0));

  select * into v_profile
  from public.affiliate_profiles
  where user_id = v_user_id
  for update;

  if found then
    if p_display_name is not null
       and v_profile.display_name is distinct from btrim(p_display_name) then
      update public.affiliate_profiles
      set display_name = btrim(p_display_name)
      where user_id = v_user_id
      returning * into v_profile;
    end if;
    return v_profile;
  end if;

  insert into public.affiliate_profiles (
    user_id,
    code,
    status,
    display_name,
    created_by_user_id
  ) values (
    v_user_id,
    lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
    'pending'::public.affiliate_profile_status,
    nullif(btrim(p_display_name), ''),
    v_user_id
  )
  returning * into v_profile;

  perform private.log_affiliate_event(
    'profile_created'::public.affiliate_event_type,
    v_user_id,
    v_user_id,
    null,
    null,
    null,
    null,
    jsonb_build_object('status', v_profile.status, 'code', v_profile.code),
    v_user_id
  );

  return v_profile;
end;
$$;

revoke all on function public.request_affiliate_profile(text) from public, anon, authenticated;
grant execute on function public.request_affiliate_profile(text) to authenticated;
