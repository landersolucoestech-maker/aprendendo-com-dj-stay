-- FASE B91: expiração transacional por horário do servidor e proteção contra reabertura financeira.

create or replace function private.checkout_order_is_financially_terminal(
  p_status public.payment_order_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in (
    'paid'::public.payment_order_status,
    'refund_pending'::public.payment_order_status,
    'refunded'::public.payment_order_status,
    'chargeback_pending'::public.payment_order_status,
    'chargeback_won'::public.payment_order_status,
    'chargeback_lost'::public.payment_order_status
  )
$$;

create or replace function private.reconcile_checkout_intent_expiration(
  p_intent_id uuid,
  p_user_id uuid
)
returns public.checkout_intents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_actor_role text := coalesce((select auth.role()), '');
  v_intent public.checkout_intents;
  v_order public.payment_orders;
  v_has_order boolean := false;
begin
  if p_intent_id is null or p_user_id is null then
    raise exception 'CHECKOUT_IDENTIFIERS_REQUIRED' using errcode = '22023';
  end if;

  if v_actor_role <> 'service_role'
     and v_actor_user_id is distinct from p_user_id then
    raise exception 'CHECKOUT_OWNER_REQUIRED' using errcode = '42501';
  end if;

  select * into v_intent
  from public.checkout_intents checkout_intent
  where checkout_intent.id = p_intent_id
    and checkout_intent.user_id = p_user_id
  for update;

  if not found then
    return null;
  end if;

  select * into v_order
  from public.payment_orders payment_order
  where payment_order.checkout_intent_id = v_intent.id
  for update;
  v_has_order := found;

  if v_intent.status <> 'checkout_created'::public.checkout_intent_status
     or v_intent.expires_at is null
     or v_intent.expires_at > statement_timestamp() then
    return v_intent;
  end if;

  if v_has_order
     and private.checkout_order_is_financially_terminal(v_order.status) then
    return v_intent;
  end if;

  update public.checkout_intents
  set status = 'expired'::public.checkout_intent_status,
      provider_request_token = null,
      provider_request_started_at = null,
      failure_code = 'CHECKOUT_EXPIRED',
      failure_reason = 'O prazo do checkout terminou antes da confirmação do pagamento.',
      version = version + 1
  where id = v_intent.id
  returning * into v_intent;

  if v_has_order then
    update public.payment_orders
    set status = 'expired'::public.payment_order_status,
        version = version + 1
    where id = v_order.id
      and status in (
        'checkout_pending'::public.payment_order_status,
        'payment_pending'::public.payment_order_status
      );

    update public.payment_attempts
    set status = 'expired'::public.payment_attempt_status,
        failure_code = coalesce(failure_code, 'CHECKOUT_EXPIRED'),
        version = version + 1
    where order_id = v_order.id
      and status in (
        'checkout_created'::public.payment_attempt_status,
        'pending'::public.payment_attempt_status,
        'failed'::public.payment_attempt_status
      );
  end if;

  perform private.log_checkout_intent_event(
    v_intent.id,
    'expired'::public.checkout_intent_event_type,
    'checkout_created'::public.checkout_intent_status,
    'expired'::public.checkout_intent_status,
    jsonb_build_object(
      'reason', 'server_deadline_elapsed',
      'expires_at', v_intent.expires_at,
      'order_id', case when v_has_order then v_order.id else null end
    ),
    case when v_actor_role = 'service_role' then null else v_actor_user_id end
  );

  return v_intent;
end;
$$;

create or replace function private.expire_due_checkout_intents(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_result public.checkout_intents;
  v_expired_count integer := 0;
begin
  perform private.assert_checkout_service_role();

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'CHECKOUT_EXPIRATION_LIMIT_INVALID' using errcode = '22023';
  end if;

  for v_candidate in
    select checkout_intent.id, checkout_intent.user_id
    from public.checkout_intents checkout_intent
    where checkout_intent.status = 'checkout_created'::public.checkout_intent_status
      and checkout_intent.expires_at is not null
      and checkout_intent.expires_at <= statement_timestamp()
    order by checkout_intent.expires_at, checkout_intent.id
    limit p_limit
    for update skip locked
  loop
    v_result := private.reconcile_checkout_intent_expiration(
      v_candidate.id,
      v_candidate.user_id
    );

    if v_result.status = 'expired'::public.checkout_intent_status then
      v_expired_count := v_expired_count + 1;
    end if;
  end loop;

  return v_expired_count;
end;
$$;

create or replace function public.reconcile_my_checkout_return(
  p_checkout_intent_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;

  perform private.reconcile_checkout_intent_expiration(
    p_checkout_intent_id,
    v_user_id
  );

  return private.get_my_checkout_return(p_checkout_intent_id);
end;
$$;

create or replace function public.expire_due_checkout_intents(
  p_limit integer default 100
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.expire_due_checkout_intents(p_limit)
$$;

create or replace function private.claim_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_lease_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.checkout_intents;
  v_order public.payment_orders;
  v_has_order boolean := false;
  v_from_status public.checkout_intent_status;
  v_token uuid;
begin
  perform private.assert_checkout_service_role();

  if p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'CHECKOUT_PROVIDER_LEASE_INVALID' using errcode = '22023';
  end if;

  select * into v_intent
  from public.checkout_intents
  where id = p_intent_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'CHECKOUT_INTENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_order
  from public.payment_orders payment_order
  where payment_order.checkout_intent_id = v_intent.id
  for update;
  v_has_order := found;

  if v_has_order
     and private.checkout_order_is_financially_terminal(v_order.status) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'CHECKOUT_ORDER_TERMINAL',
      'intent', to_jsonb(v_intent)
    );
  end if;

  v_intent := private.reconcile_checkout_intent_expiration(
    v_intent.id,
    v_intent.user_id
  );

  if v_intent.status = 'checkout_created'::public.checkout_intent_status
     and v_intent.expires_at > statement_timestamp() then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'CHECKOUT_ALREADY_CREATED',
      'intent', to_jsonb(v_intent)
    );
  end if;

  if v_intent.status = 'provider_creating'::public.checkout_intent_status
     and v_intent.provider_request_started_at > statement_timestamp() - make_interval(secs => p_lease_seconds) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'CHECKOUT_PROVIDER_REQUEST_IN_PROGRESS',
      'intent', to_jsonb(v_intent)
    );
  end if;

  if v_intent.status in (
    'expired'::public.checkout_intent_status,
    'cancelled'::public.checkout_intent_status
  ) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'CHECKOUT_INTENT_NOT_RETRYABLE',
      'intent', to_jsonb(v_intent)
    );
  end if;

  v_from_status := v_intent.status;
  v_token := gen_random_uuid();

  update public.checkout_intents
  set status = 'provider_creating'::public.checkout_intent_status,
      provider_request_token = v_token,
      provider_request_started_at = statement_timestamp(),
      provider_checkout_id = null,
      provider_checkout_url = null,
      expires_at = null,
      failure_code = null,
      failure_reason = null,
      version = version + 1
  where id = v_intent.id
  returning * into v_intent;

  perform private.log_checkout_intent_event(
    v_intent.id,
    'provider_claimed'::public.checkout_intent_event_type,
    v_from_status,
    v_intent.status,
    jsonb_build_object('provider', v_intent.provider, 'request_token', v_token),
    p_user_id
  );

  return jsonb_build_object(
    'claimed', true,
    'reason', null,
    'request_token', v_token,
    'intent', to_jsonb(v_intent)
  );
end;
$$;

revoke all on function private.checkout_order_is_financially_terminal(
  public.payment_order_status
) from public, anon, authenticated;
revoke all on function private.reconcile_checkout_intent_expiration(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.expire_due_checkout_intents(integer)
  from public, anon, authenticated;
revoke all on function public.reconcile_my_checkout_return(uuid)
  from public, anon, authenticated;
revoke all on function public.expire_due_checkout_intents(integer)
  from public, anon, authenticated;

grant execute on function private.reconcile_checkout_intent_expiration(uuid, uuid)
  to authenticated, service_role;
grant execute on function private.expire_due_checkout_intents(integer)
  to service_role;
grant execute on function public.reconcile_my_checkout_return(uuid)
  to authenticated;
grant execute on function public.expire_due_checkout_intents(integer)
  to service_role;
