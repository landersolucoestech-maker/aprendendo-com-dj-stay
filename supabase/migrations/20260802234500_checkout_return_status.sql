-- FASE B90: retorno financeiro correlacionado ao checkout_intent do callback.

create or replace function private.get_my_checkout_return(
  p_checkout_intent_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_intent public.checkout_intents;
  v_order public.payment_orders;
  v_attempt public.payment_attempts;
  v_entitlement public.payment_entitlements;
  v_has_order boolean := false;
  v_has_attempt boolean := false;
  v_has_entitlement boolean := false;
begin
  if v_user_id is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;

  select * into v_intent
  from public.checkout_intents checkout_intent
  where checkout_intent.id = p_checkout_intent_id
    and checkout_intent.user_id = v_user_id;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select * into v_order
  from public.payment_orders payment_order
  where payment_order.checkout_intent_id = v_intent.id
  limit 1;
  v_has_order := found;

  if v_has_order then
    select * into v_attempt
    from public.payment_attempts payment_attempt
    where payment_attempt.order_id = v_order.id
    order by payment_attempt.updated_at desc, payment_attempt.created_at desc
    limit 1;
    v_has_attempt := found;

    select * into v_entitlement
    from public.payment_entitlements payment_entitlement
    where payment_entitlement.order_id = v_order.id
    limit 1;
    v_has_entitlement := found;
  end if;

  return jsonb_build_object(
    'found', true,
    'checkout_intent_id', v_intent.id,
    'intent_status', v_intent.status,
    'subject_type', v_intent.subject_type,
    'subject_id', v_intent.subject_id,
    'license_id', v_intent.license_id,
    'title', v_intent.title_snapshot,
    'amount_cents', v_intent.amount_cents,
    'currency_code', v_intent.currency_code,
    'expires_at', v_intent.expires_at,
    'failure_code', v_intent.failure_code,
    'failure_reason', v_intent.failure_reason,
    'created_at', v_intent.created_at,
    'updated_at', v_intent.updated_at,
    'order', case
      when v_has_order then jsonb_build_object(
        'id', v_order.id,
        'status', v_order.status,
        'payment_confirmed_at', v_order.payment_confirmed_at,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at
      )
      else null
    end,
    'attempt', case
      when v_has_attempt then jsonb_build_object(
        'id', v_attempt.id,
        'status', v_attempt.status,
        'billing_type', v_attempt.billing_type,
        'provider_status', v_attempt.provider_status,
        'confirmed_at', v_attempt.confirmed_at,
        'received_at', v_attempt.received_at,
        'failure_code', v_attempt.failure_code,
        'updated_at', v_attempt.updated_at
      )
      else null
    end,
    'entitlement', case
      when v_has_entitlement then jsonb_build_object(
        'id', v_entitlement.id,
        'status', v_entitlement.status,
        'controls_access', v_entitlement.controls_access,
        'enrollment_id', v_entitlement.enrollment_id,
        'digital_product_access_id', v_entitlement.digital_product_access_id,
        'granted_at', v_entitlement.granted_at,
        'suspended_at', v_entitlement.suspended_at,
        'revoked_at', v_entitlement.revoked_at
      )
      else null
    end
  );
end;
$$;

create or replace function public.get_my_checkout_return(
  p_checkout_intent_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_my_checkout_return(p_checkout_intent_id)
$$;

revoke all on function private.get_my_checkout_return(uuid)
  from public, anon, authenticated;
revoke all on function public.get_my_checkout_return(uuid)
  from public, anon, authenticated;

grant execute on function private.get_my_checkout_return(uuid)
  to authenticated;
grant execute on function public.get_my_checkout_return(uuid)
  to authenticated;
