create or replace function private.get_my_payment_history(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total_orders', (
        select count(*) from public.payment_orders where user_id = v_user_id
      ),
      'pending_orders', (
        select count(*) from public.payment_orders
        where user_id = v_user_id
          and status in (
            'checkout_pending'::public.payment_order_status,
            'payment_pending'::public.payment_order_status
          )
      ),
      'paid_orders', (
        select count(*) from public.payment_orders
        where user_id = v_user_id and status = 'paid'::public.payment_order_status
      ),
      'refunded_orders', (
        select count(*) from public.payment_orders
        where user_id = v_user_id and status = 'refunded'::public.payment_order_status
      )
    ),
    'total', (
      select count(*) from public.payment_orders where user_id = v_user_id
    ),
    'orders', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', order_record.id,
            'subject_type', order_record.subject_type,
            'subject_id', order_record.subject_id,
            'license_id', order_record.license_id,
            'status', order_record.status,
            'amount_cents', order_record.amount_cents,
            'currency_code', order_record.currency_code,
            'title', order_record.title_snapshot,
            'payment_confirmed_at', order_record.payment_confirmed_at,
            'created_at', order_record.created_at,
            'updated_at', order_record.updated_at,
            'latest_attempt', case
              when order_record.attempt_id is null then null
              else jsonb_build_object(
                'status', order_record.attempt_status,
                'billing_type', order_record.billing_type,
                'provider', order_record.provider,
                'provider_status', order_record.provider_status,
                'confirmed_at', order_record.attempt_confirmed_at,
                'received_at', order_record.attempt_received_at,
                'failure_code', order_record.attempt_failure_code,
                'updated_at', order_record.attempt_updated_at
              )
            end,
            'entitlement', case
              when order_record.entitlement_id is null then null
              else jsonb_build_object(
                'status', order_record.entitlement_status,
                'controls_access', order_record.controls_access,
                'granted_at', order_record.granted_at,
                'suspended_at', order_record.suspended_at,
                'revoked_at', order_record.revoked_at
              )
            end
          ) order by order_record.created_at desc, order_record.id desc
        ),
        '[]'::jsonb
      )
      from (
        select
          payment_order.*,
          latest_attempt.id as attempt_id,
          latest_attempt.status as attempt_status,
          latest_attempt.billing_type,
          latest_attempt.provider,
          latest_attempt.provider_status,
          latest_attempt.confirmed_at as attempt_confirmed_at,
          latest_attempt.received_at as attempt_received_at,
          latest_attempt.failure_code as attempt_failure_code,
          latest_attempt.updated_at as attempt_updated_at,
          entitlement.id as entitlement_id,
          entitlement.status as entitlement_status,
          entitlement.controls_access,
          entitlement.granted_at,
          entitlement.suspended_at,
          entitlement.revoked_at
        from public.payment_orders payment_order
        left join lateral (
          select payment_attempt.*
          from public.payment_attempts payment_attempt
          where payment_attempt.order_id = payment_order.id
          order by payment_attempt.created_at desc, payment_attempt.id desc
          limit 1
        ) latest_attempt on true
        left join lateral (
          select payment_entitlement.*
          from public.payment_entitlements payment_entitlement
          where payment_entitlement.order_id = payment_order.id
          order by payment_entitlement.created_at desc, payment_entitlement.id desc
          limit 1
        ) entitlement on true
        where payment_order.user_id = v_user_id
        order by payment_order.created_at desc, payment_order.id desc
        limit v_limit offset v_offset
      ) order_record
    )
  );
end;
$$;

revoke all on function private.get_my_payment_history(integer, integer) from public, anon, authenticated;
grant execute on function private.get_my_payment_history(integer, integer) to service_role;

create or replace function public.get_my_payment_history(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_payment_history(p_limit, p_offset);
$$;

revoke all on function public.get_my_payment_history(integer, integer) from public, anon;
grant execute on function public.get_my_payment_history(integer, integer) to authenticated, service_role;
