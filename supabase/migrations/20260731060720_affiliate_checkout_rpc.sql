-- FASE B20: atribuição anexada ao checkout antes da chamada ao provider.

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

revoke all on function private.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;

revoke all on function public.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;
