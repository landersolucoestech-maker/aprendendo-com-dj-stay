-- FASE B20: aprovação e suspensão auditadas do perfil de afiliado.

create or replace function public.admin_set_affiliate_profile_status(
  p_user_id uuid,
  p_status public.affiliate_profile_status,
  p_reason text default null
)
returns public.affiliate_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_profile public.affiliate_profiles;
  v_previous public.affiliate_profile_status;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null or p_status = 'pending'::public.affiliate_profile_status then
    raise exception 'AFFILIATE_STATUS_TRANSITION_INVALID' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.user_roles
    where user_id = p_user_id
      and role = 'afiliado'::public.app_role
  ) then
    raise exception 'AFFILIATE_ROLE_REQUIRED' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('affiliate-profile:' || p_user_id::text, 0));

  select * into v_profile
  from public.affiliate_profiles
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.affiliate_profiles (
      user_id,
      code,
      status,
      created_by_user_id
    ) values (
      p_user_id,
      lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
      'pending'::public.affiliate_profile_status,
      v_actor
    )
    returning * into v_profile;

    perform private.log_affiliate_event(
      'profile_created'::public.affiliate_event_type,
      p_user_id,
      p_user_id,
      null,
      null,
      null,
      null,
      jsonb_build_object('status', v_profile.status, 'created_by_admin', true),
      v_actor
    );
  end if;

  v_previous := v_profile.status;

  if p_status = 'active'::public.affiliate_profile_status then
    update public.affiliate_profiles
    set status = 'active'::public.affiliate_profile_status,
        activated_by_user_id = v_actor,
        activated_at = coalesce(activated_at, statement_timestamp()),
        suspended_at = null,
        suspension_reason = null
    where user_id = p_user_id
    returning * into v_profile;

    perform private.log_affiliate_event(
      'profile_activated'::public.affiliate_event_type,
      p_user_id,
      p_user_id,
      null,
      null,
      null,
      null,
      jsonb_build_object('from_status', v_previous, 'to_status', v_profile.status),
      v_actor
    );
  else
    if v_profile.activated_at is null
       or nullif(btrim(p_reason), '') is null
       or char_length(btrim(p_reason)) not between 3 and 1000 then
      raise exception 'AFFILIATE_SUSPENSION_REASON_REQUIRED' using errcode = '22023';
    end if;

    update public.affiliate_profiles
    set status = 'suspended'::public.affiliate_profile_status,
        suspended_at = statement_timestamp(),
        suspension_reason = btrim(p_reason)
    where user_id = p_user_id
    returning * into v_profile;

    update public.affiliate_links
    set status = 'inactive'::public.affiliate_link_status,
        deactivated_at = statement_timestamp()
    where affiliate_user_id = p_user_id
      and status = 'active'::public.affiliate_link_status;

    update public.affiliate_attributions
    set status = 'invalidated'::public.affiliate_attribution_status,
        invalidated_at = statement_timestamp(),
        invalidation_reason = 'Perfil de afiliado suspenso.'
    where affiliate_user_id = p_user_id
      and status = 'active'::public.affiliate_attribution_status;

    perform private.log_affiliate_event(
      'profile_suspended'::public.affiliate_event_type,
      p_user_id,
      p_user_id,
      null,
      null,
      null,
      null,
      jsonb_build_object(
        'from_status', v_previous,
        'to_status', v_profile.status,
        'reason', v_profile.suspension_reason
      ),
      v_actor
    );
  end if;

  return v_profile;
end;
$$;

revoke all on function public.admin_set_affiliate_profile_status(
  uuid,
  public.affiliate_profile_status,
  text
) from public, anon, authenticated;

grant execute on function public.admin_set_affiliate_profile_status(
  uuid,
  public.affiliate_profile_status,
  text
) to authenticated;
