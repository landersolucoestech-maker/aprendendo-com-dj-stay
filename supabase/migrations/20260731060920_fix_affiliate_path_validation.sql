-- FASE B20: validação de path compatível com o mecanismo regex do PostgreSQL.

alter table public.affiliate_links
  drop constraint affiliate_links_destination_path;

alter table public.affiliate_links
  add constraint affiliate_links_destination_path check (
    char_length(destination_path) between 2 and 501
    and destination_path ~ '^/[A-Za-z0-9/_?&=.-]+$'
    and destination_path !~ '^//'
  );

alter table public.affiliate_clicks
  drop constraint affiliate_clicks_landing_path;

alter table public.affiliate_clicks
  add constraint affiliate_clicks_landing_path check (
    char_length(landing_path) between 2 and 501
    and landing_path ~ '^/[A-Za-z0-9/_?&=.-]+$'
    and landing_path !~ '^//'
  );

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
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'afiliado'::public.app_role then
    raise exception 'AFFILIATE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_subject_id is null
     or char_length(p_destination_path) not between 2 and 501
     or p_destination_path !~ '^/[A-Za-z0-9/_?&=.-]+$'
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
    hashtextextended(
      'affiliate-link:' || v_user_id::text || ':' || p_subject_type::text || ':' || p_subject_id::text,
      0
    )
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
    lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)),
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
     or char_length(p_landing_path) not between 2 and 501
     or p_landing_path !~ '^/[A-Za-z0-9/_?&=.-]+$'
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
