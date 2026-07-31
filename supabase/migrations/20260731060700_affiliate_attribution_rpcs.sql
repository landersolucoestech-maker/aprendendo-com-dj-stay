-- FASE B20: RPCs de perfil, termos, links, clique, atribuição e integração com checkout.

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
  elsif p_subject_type = 'digital_product'::public.checkout_subject_type then
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
  v_role public.app_role := (select private.current_user_role());
  v_profile public.affiliate_profiles;
  v_code text;
begin
  if v_user_id is null or v_role is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;
  if v_role <> 'afiliado'::public.app_role then
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

  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  insert into public.affiliate_profiles (
    user_id,
    code,
    status,
    display_name,
    created_by_user_id
  ) values (
    v_user_id,
    v_code,
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
  v_code text;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null or p_status = 'pending'::public.affiliate_profile_status then
    raise exception 'AFFILIATE_STATUS_TRANSITION_INVALID' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.user_roles
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
    v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    insert into public.affiliate_profiles (
      user_id,
      code,
      status,
      created_by_user_id
    ) values (
      p_user_id,
      v_code,
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
  elsif p_status = 'suspended'::public.affiliate_profile_status then
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
  v_subject_exists boolean;
  v_affiliate_eligible boolean;
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

create or replace function public.create_affiliate_link(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_destination_path text
)
returns public.affiliate_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.affiliate_profiles;
  v_terms public.affiliate_subject_terms;
  v_link public.affiliate_links;
  v_code text;
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'afiliado'::public.app_role then
    raise exception 'AFFILIATE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_subject_id is null
     or p_destination_path !~ '^/[A-Za-z0-9/_?&=.-]{1,500}$'
     or p_destination_path ~ '^//' then
    raise exception 'AFFILIATE_DESTINATION_INVALID' using errcode = '22023';
  end if;

  select * into v_profile
  from public.affiliate_profiles
  where user_id = v_user_id
    and status = 'active'::public.affiliate_profile_status;
  if not found then
    raise exception 'AFFILIATE_PROFILE_NOT_ACTIVE' using errcode = '42501';
  end if;

  select * into v_terms
  from public.affiliate_subject_terms
  where subject_type = p_subject_type
    and subject_id = p_subject_id
    and active;
  if not found or not private.affiliate_subject_is_available(p_subject_type, p_subject_id) then
    raise exception 'AFFILIATE_SUBJECT_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('affiliate-link:' || v_user_id::text || ':' || p_subject_type::text || ':' || p_subject_id::text, 0)
  );

  select * into v_link
  from public.affiliate_links
  where affiliate_user_id = v_user_id
    and subject_type = p_subject_type
    and subject_id = p_subject_id
    and status = 'active'::public.affiliate_link_status
  for update;

  if found then
    return v_link;
  end if;

  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));

  insert into public.affiliate_links (
    affiliate_user_id,
    subject_type,
    subject_id,
    code,
    destination_path
  ) values (
    v_user_id,
    p_subject_type,
    p_subject_id,
    v_code,
    p_destination_path
  )
  returning * into v_link;

  perform private.log_affiliate_event(
    'link_created'::public.affiliate_event_type,
    v_user_id,
    v_user_id,
    v_link.id,
    null,
    null,
    null,
    jsonb_build_object(
      'subject_type', v_link.subject_type,
      'subject_id', v_link.subject_id,
      'destination_path', v_link.destination_path,
      'terms_id', v_terms.id
    ),
    v_user_id
  );

  return v_link;
end;
$$;

create or replace function public.deactivate_affiliate_link(
  p_link_id uuid
)
returns public.affiliate_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_link public.affiliate_links;
begin
  if v_user_id is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;

  select * into v_link
  from public.affiliate_links
  where id = p_link_id
  for update;

  if not found then
    raise exception 'AFFILIATE_LINK_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_link.affiliate_user_id <> v_user_id and not (select private.affiliate_is_admin()) then
    raise exception 'AFFILIATE_LINK_OWNERSHIP_REQUIRED' using errcode = '42501';
  end if;
  if v_link.status = 'inactive'::public.affiliate_link_status then
    return v_link;
  end if;

  update public.affiliate_links
  set status = 'inactive'::public.affiliate_link_status,
      deactivated_at = statement_timestamp()
  where id = v_link.id
  returning * into v_link;

  update public.affiliate_attributions
  set status = 'invalidated'::public.affiliate_attribution_status,
      invalidated_at = statement_timestamp(),
      invalidation_reason = 'Link de afiliado desativado.'
  where link_id = v_link.id
    and status = 'active'::public.affiliate_attribution_status;

  perform private.log_affiliate_event(
    'link_deactivated'::public.affiliate_event_type,
    v_link.affiliate_user_id,
    v_link.affiliate_user_id,
    v_link.id,
    null,
    null,
    null,
    '{}'::jsonb,
    v_user_id
  );

  return v_link;
end;
$$;

create or replace function public.record_affiliate_click(
  p_link_code text,
  p_visitor_token uuid,
  p_landing_path text,
  p_referrer_origin text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.affiliate_links;
  v_terms public.affiliate_subject_terms;
  v_click public.affiliate_clicks;
  v_attribution public.affiliate_attributions;
  v_previous public.affiliate_attributions;
  v_visitor_hash text;
  v_user_agent_hash text;
  v_replaced boolean := false;
begin
  if nullif(lower(btrim(p_link_code)), '') is null
     or p_visitor_token is null
     or p_landing_path !~ '^/[A-Za-z0-9/_?&=.-]{1,500}$'
     or p_landing_path ~ '^//'
     or (p_referrer_origin is not null and char_length(p_referrer_origin) not between 3 and 300)
     or (p_user_agent is not null and char_length(p_user_agent) > 1000) then
    raise exception 'AFFILIATE_CLICK_INPUT_INVALID' using errcode = '22023';
  end if;

  select link_record.* into v_link
  from public.affiliate_links link_record
  join public.affiliate_profiles profile_record
    on profile_record.user_id = link_record.affiliate_user_id
   and profile_record.status = 'active'::public.affiliate_profile_status
  where link_record.code = lower(btrim(p_link_code))
    and link_record.status = 'active'::public.affiliate_link_status;

  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'AFFILIATE_LINK_NOT_AVAILABLE');
  end if;

  select * into v_terms
  from public.affiliate_subject_terms
  where subject_type = v_link.subject_type
    and subject_id = v_link.subject_id
    and active;

  if not found or not private.affiliate_subject_is_available(v_link.subject_type, v_link.subject_id) then
    return jsonb_build_object('accepted', false, 'reason', 'AFFILIATE_SUBJECT_NOT_AVAILABLE');
  end if;

  v_visitor_hash := encode(extensions.digest(p_visitor_token::text, 'sha256'), 'hex');
  v_user_agent_hash := case
    when p_user_agent is null then null
    else encode(extensions.digest(p_user_agent, 'sha256'), 'hex')
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'affiliate-attribution:' || v_visitor_hash || ':' || v_link.subject_type::text || ':' || v_link.subject_id::text,
      0
    )
  );

  select * into v_previous
  from public.affiliate_attributions
  where visitor_token_hash = v_visitor_hash
    and subject_type = v_link.subject_type
    and subject_id = v_link.subject_id
    and status = 'active'::public.affiliate_attribution_status
  for update;

  if found then
    update public.affiliate_attributions
    set status = 'invalidated'::public.affiliate_attribution_status,
        invalidated_at = statement_timestamp(),
        invalidation_reason = 'Substituída por atribuição last-click mais recente.'
    where id = v_previous.id;
    v_replaced := true;

    perform private.log_affiliate_event(
      'attribution_replaced'::public.affiliate_event_type,
      v_previous.affiliate_user_id,
      v_previous.affiliate_user_id,
      v_previous.link_id,
      v_previous.id,
      null,
      null,
      jsonb_build_object('replacement_link_id', v_link.id),
      null
    );
  end if;

  insert into public.affiliate_clicks (
    link_id,
    affiliate_user_id,
    visitor_token_hash,
    landing_path,
    referrer_origin,
    user_agent_hash
  ) values (
    v_link.id,
    v_link.affiliate_user_id,
    v_visitor_hash,
    p_landing_path,
    nullif(btrim(p_referrer_origin), ''),
    v_user_agent_hash
  )
  returning * into v_click;

  insert into public.affiliate_attributions (
    affiliate_user_id,
    link_id,
    click_id,
    terms_id,
    commission_bps,
    subject_type,
    subject_id,
    visitor_token_hash,
    status,
    expires_at
  ) values (
    v_link.affiliate_user_id,
    v_link.id,
    v_click.id,
    v_terms.id,
    v_terms.commission_bps,
    v_link.subject_type,
    v_link.subject_id,
    v_visitor_hash,
    'active'::public.affiliate_attribution_status,
    statement_timestamp() + make_interval(days => v_terms.attribution_window_days)
  )
  returning * into v_attribution;

  perform private.log_affiliate_event(
    'click_recorded'::public.affiliate_event_type,
    v_link.affiliate_user_id,
    v_link.affiliate_user_id,
    v_link.id,
    v_attribution.id,
    null,
    null,
    jsonb_build_object(
      'click_id', v_click.id,
      'landing_path', v_click.landing_path,
      'replaced_previous', v_replaced
    ),
    null
  );

  perform private.log_affiliate_event(
    'attribution_created'::public.affiliate_event_type,
    v_link.affiliate_user_id,
    v_link.affiliate_user_id,
    v_link.id,
    v_attribution.id,
    null,
    null,
    jsonb_build_object(
      'terms_id', v_terms.id,
      'commission_bps', v_attribution.commission_bps,
      'expires_at', v_attribution.expires_at
    ),
    null
  );

  return jsonb_build_object(
    'accepted', true,
    'reason', null,
    'destination_path', v_link.destination_path,
    'attribution_id', v_attribution.id,
    'expires_at', v_attribution.expires_at
  );
end;
$$;

create or replace function private.prepare_checkout_intent_with_attribution(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_license_id uuid,
  p_idempotency_key uuid,
  p_affiliate_visitor_token uuid default null
)
returns public.checkout_intents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_intent public.checkout_intents;
  v_attribution public.affiliate_attributions;
  v_hash text;
begin
  v_intent := private.prepare_checkout_intent(
    p_subject_type,
    p_subject_id,
    p_license_id,
    p_idempotency_key
  );

  if p_affiliate_visitor_token is null then
    return v_intent;
  end if;

  select * into v_intent
  from public.checkout_intents
  where id = v_intent.id
  for update;

  if v_intent.affiliate_attribution_id is not null then
    return v_intent;
  end if;

  if v_intent.status not in (
    'prepared'::public.checkout_intent_status,
    'provider_failed'::public.checkout_intent_status
  ) then
    raise exception 'AFFILIATE_ATTRIBUTION_TOO_LATE' using errcode = '22023';
  end if;

  v_hash := encode(extensions.digest(p_affiliate_visitor_token::text, 'sha256'), 'hex');

  select * into v_attribution
  from public.affiliate_attributions
  where visitor_token_hash = v_hash
    and subject_type = p_subject_type
    and subject_id = p_subject_id
    and status = 'active'::public.affiliate_attribution_status
    and expires_at > statement_timestamp()
  order by attributed_at desc
  limit 1
  for update;

  if not found then
    return v_intent;
  end if;

  if v_attribution.affiliate_user_id = v_user_id then
    update public.affiliate_attributions
    set status = 'invalidated'::public.affiliate_attribution_status,
        invalidated_at = statement_timestamp(),
        invalidation_reason = 'Autoindicação não permitida.'
    where id = v_attribution.id;

    perform private.log_affiliate_event(
      'attribution_replaced'::public.affiliate_event_type,
      v_attribution.affiliate_user_id,
      v_attribution.affiliate_user_id,
      v_attribution.link_id,
      v_attribution.id,
      null,
      null,
      jsonb_build_object('reason', 'self_referral_invalidated'),
      v_user_id
    );

    return v_intent;
  end if;

  update public.checkout_intents
  set affiliate_attribution_id = v_attribution.id,
      item_snapshot = item_snapshot || jsonb_build_object(
        'affiliate', jsonb_build_object(
          'attribution_id', v_attribution.id,
          'affiliate_user_id', v_attribution.affiliate_user_id,
          'link_id', v_attribution.link_id,
          'terms_id', v_attribution.terms_id,
          'commission_bps', v_attribution.commission_bps,
          'captured_at', statement_timestamp()
        )
      ),
      version = version + 1
  where id = v_intent.id
  returning * into v_intent;

  return v_intent;
end;
$$;

create or replace function public.prepare_checkout_intent_with_attribution(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_license_id uuid,
  p_idempotency_key uuid,
  p_affiliate_visitor_token uuid default null
)
returns public.checkout_intents
language sql
security invoker
set search_path = ''
as $$
  select private.prepare_checkout_intent_with_attribution(
    p_subject_type,
    p_subject_id,
    p_license_id,
    p_idempotency_key,
    p_affiliate_visitor_token
  )
$$;

create or replace function private.sync_payment_order_attempt_from_checkout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders;
begin
  if new.status <> 'checkout_created'::public.checkout_intent_status then
    return new;
  end if;

  insert into public.payment_orders (
    user_id,
    checkout_intent_id,
    subject_type,
    subject_id,
    license_id,
    affiliate_attribution_id,
    status,
    amount_cents,
    currency_code,
    title_snapshot,
    item_snapshot
  ) values (
    new.user_id,
    new.id,
    new.subject_type,
    new.subject_id,
    new.license_id,
    new.affiliate_attribution_id,
    'checkout_pending'::public.payment_order_status,
    new.amount_cents,
    new.currency_code,
    new.title_snapshot,
    new.item_snapshot
  )
  on conflict (checkout_intent_id) do update
  set amount_cents = excluded.amount_cents,
      currency_code = excluded.currency_code,
      title_snapshot = excluded.title_snapshot,
      item_snapshot = excluded.item_snapshot,
      affiliate_attribution_id = excluded.affiliate_attribution_id,
      version = public.payment_orders.version + 1
  returning * into v_order;

  insert into public.payment_attempts (
    order_id,
    checkout_intent_id,
    provider,
    provider_checkout_id,
    status,
    amount_cents,
    currency_code
  ) values (
    v_order.id,
    new.id,
    new.provider,
    new.provider_checkout_id,
    'checkout_created'::public.payment_attempt_status,
    new.amount_cents,
    new.currency_code
  )
  on conflict (checkout_intent_id) do update
  set provider_checkout_id = excluded.provider_checkout_id,
      amount_cents = excluded.amount_cents,
      currency_code = excluded.currency_code,
      version = public.payment_attempts.version + 1;

  return new;
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
revoke all on function private.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
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
revoke all on function public.create_affiliate_link(
  public.checkout_subject_type,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.deactivate_affiliate_link(uuid) from public, anon, authenticated;
revoke all on function public.record_affiliate_click(
  text,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
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
grant execute on function public.create_affiliate_link(
  public.checkout_subject_type,
  uuid,
  text
) to authenticated;
grant execute on function public.deactivate_affiliate_link(uuid) to authenticated;
grant execute on function public.record_affiliate_click(
  text,
  uuid,
  text,
  text,
  text
) to anon, authenticated;
grant execute on function public.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;
