-- FASE B20: clique anônimo pseudonimizado e atribuição last-click.

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

revoke all on function public.record_affiliate_click(
  text,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.record_affiliate_click(
  text,
  uuid,
  text,
  text,
  text
) to anon, authenticated;
