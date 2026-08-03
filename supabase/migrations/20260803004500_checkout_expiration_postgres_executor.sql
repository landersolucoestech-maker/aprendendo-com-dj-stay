-- FASE B92: permite que o job interno do pg_cron reconcilie vencimentos sem ampliar a Data API.

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
  v_is_postgres_executor boolean := session_user = 'postgres';
  v_intent public.checkout_intents;
  v_order public.payment_orders;
  v_has_order boolean := false;
begin
  if p_intent_id is null or p_user_id is null then
    raise exception 'CHECKOUT_IDENTIFIERS_REQUIRED' using errcode = '22023';
  end if;

  if not v_is_postgres_executor
     and v_actor_role <> 'service_role'
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
    case
      when v_is_postgres_executor or v_actor_role = 'service_role' then null
      else v_actor_user_id
    end
  );

  return v_intent;
end;
$$;

revoke all on function private.reconcile_checkout_intent_expiration(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.reconcile_checkout_intent_expiration(uuid, uuid)
  to service_role;
