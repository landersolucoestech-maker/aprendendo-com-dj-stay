-- FASE B20: perfis de afiliado, termos configuráveis e helpers privados.

alter table public.affiliate_attributions
  add column terms_id uuid references public.affiliate_subject_terms(id) on delete restrict,
  add column commission_bps integer;

alter table public.affiliate_attributions
  add constraint affiliate_attributions_commission_bps_range
    check (commission_bps between 1 and 10000);

alter table public.affiliate_attributions
  alter column terms_id set not null,
  alter column commission_bps set not null;

create index affiliate_attributions_terms_idx
  on public.affiliate_attributions (terms_id);

create or replace function private.affiliate_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.current_user_role()) = 'administrador_proprietario'::public.app_role,
    false
  )
$$;

create or replace function private.log_affiliate_event(
  p_event_type public.affiliate_event_type,
  p_affiliate_user_id uuid default null,
  p_profile_user_id uuid default null,
  p_link_id uuid default null,
  p_attribution_id uuid default null,
  p_commission_id uuid default null,
  p_payout_id uuid default null,
  p_details jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.affiliate_events (
    affiliate_user_id,
    event_type,
    actor_user_id,
    profile_user_id,
    link_id,
    attribution_id,
    commission_id,
    payout_id,
    details
  ) values (
    p_affiliate_user_id,
    p_event_type,
    coalesce(p_actor_user_id, (select auth.uid())),
    p_profile_user_id,
    p_link_id,
    p_attribution_id,
    p_commission_id,
    p_payout_id,
    coalesce(p_details, '{}'::jsonb)
  )
$$;

create or replace function private.affiliate_subject_is_available(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_subject_type = 'course'::public.checkout_subject_type then
    return exists (
      select 1
      from public.courses course_record
      where course_record.id = p_subject_id
        and course_record.affiliate_eligible
        and course_record.status = 'published'::public.course_status
        and course_record.deleted_at is null
        and (course_record.availability_starts_at is null or course_record.availability_starts_at <= statement_timestamp())
        and (course_record.availability_ends_at is null or course_record.availability_ends_at > statement_timestamp())
    );
  end if;

  if p_subject_type = 'digital_product'::public.checkout_subject_type then
    return exists (
      select 1
      from public.digital_products product_record
      where product_record.id = p_subject_id
        and product_record.affiliate_eligible
        and product_record.status = 'published'::public.digital_product_status
        and product_record.deleted_at is null
        and (product_record.availability_starts_at is null or product_record.availability_starts_at <= statement_timestamp())
        and (product_record.availability_ends_at is null or product_record.availability_ends_at > statement_timestamp())
    );
  end if;

  return false;
end;
$$;

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

create or replace function public.admin_configure_affiliate_terms(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_commission_bps integer,
  p_attribution_window_days integer,
  p_active boolean default true
)
returns public.affiliate_subject_terms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_terms public.affiliate_subject_terms;
  v_subject_exists boolean := false;
  v_affiliate_eligible boolean := false;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_subject_id is null
     or p_commission_bps not between 1 and 10000
     or p_attribution_window_days not between 1 and 365 then
    raise exception 'AFFILIATE_TERMS_INVALID' using errcode = '22023';
  end if;

  if p_subject_type = 'course'::public.checkout_subject_type then
    select true, affiliate_eligible
    into v_subject_exists, v_affiliate_eligible
    from public.courses
    where id = p_subject_id and deleted_at is null;
  elsif p_subject_type = 'digital_product'::public.checkout_subject_type then
    select true, affiliate_eligible
    into v_subject_exists, v_affiliate_eligible
    from public.digital_products
    where id = p_subject_id and deleted_at is null;
  else
    raise exception 'AFFILIATE_SUBJECT_TYPE_INVALID' using errcode = '22023';
  end if;

  if not coalesce(v_subject_exists, false) then
    raise exception 'AFFILIATE_SUBJECT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_active and not coalesce(v_affiliate_eligible, false) then
    raise exception 'AFFILIATE_SUBJECT_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  insert into public.affiliate_subject_terms (
    subject_type,
    subject_id,
    commission_bps,
    attribution_window_days,
    active,
    created_by_user_id,
    updated_by_user_id
  ) values (
    p_subject_type,
    p_subject_id,
    p_commission_bps,
    p_attribution_window_days,
    p_active,
    v_actor,
    v_actor
  )
  on conflict (subject_type, subject_id) do update
  set commission_bps = excluded.commission_bps,
      attribution_window_days = excluded.attribution_window_days,
      active = excluded.active,
      updated_by_user_id = v_actor
  returning * into v_terms;

  if not p_active then
    update public.affiliate_links
    set status = 'inactive'::public.affiliate_link_status,
        deactivated_at = statement_timestamp()
    where subject_type = p_subject_type
      and subject_id = p_subject_id
      and status = 'active'::public.affiliate_link_status;

    update public.affiliate_attributions
    set status = 'invalidated'::public.affiliate_attribution_status,
        invalidated_at = statement_timestamp(),
        invalidation_reason = 'Termos de afiliado desativados.'
    where subject_type = p_subject_type
      and subject_id = p_subject_id
      and status = 'active'::public.affiliate_attribution_status;
  end if;

  perform private.log_affiliate_event(
    'terms_configured'::public.affiliate_event_type,
    null,
    null,
    null,
    null,
    null,
    null,
    jsonb_build_object(
      'terms_id', v_terms.id,
      'subject_type', v_terms.subject_type,
      'subject_id', v_terms.subject_id,
      'commission_bps', v_terms.commission_bps,
      'attribution_window_days', v_terms.attribution_window_days,
      'active', v_terms.active
    ),
    v_actor
  );

  return v_terms;
end;
$$;

revoke all on function private.affiliate_is_admin() from public, anon, authenticated;
revoke all on function private.log_affiliate_event(
  public.affiliate_event_type,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  uuid
) from public, anon, authenticated;
revoke all on function private.affiliate_subject_is_available(
  public.checkout_subject_type,
  uuid
) from public, anon, authenticated;

revoke all on function public.request_affiliate_profile(text) from public, anon, authenticated;
revoke all on function public.admin_set_affiliate_profile_status(
  uuid,
  public.affiliate_profile_status,
  text
) from public, anon, authenticated;
revoke all on function public.admin_configure_affiliate_terms(
  public.checkout_subject_type,
  uuid,
  integer,
  integer,
  boolean
) from public, anon, authenticated;

grant execute on function public.request_affiliate_profile(text) to authenticated;
grant execute on function public.admin_set_affiliate_profile_status(
  uuid,
  public.affiliate_profile_status,
  text
) to authenticated;
grant execute on function public.admin_configure_affiliate_terms(
  public.checkout_subject_type,
  uuid,
  integer,
  integer,
  boolean
) to authenticated;
