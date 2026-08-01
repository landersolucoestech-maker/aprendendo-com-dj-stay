create or replace function private.get_payment_admin_dashboard(
  p_status public.payment_order_status default null,
  p_subject_type public.checkout_subject_type default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(p_search), '');
begin
  if auth.uid() is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total_orders', (select count(*) from public.payment_orders),
      'pending_orders', (
        select count(*) from public.payment_orders
        where status in ('checkout_pending'::public.payment_order_status, 'payment_pending'::public.payment_order_status)
      ),
      'paid_orders', (select count(*) from public.payment_orders where status = 'paid'::public.payment_order_status),
      'refunded_orders', (select count(*) from public.payment_orders where status = 'refunded'::public.payment_order_status),
      'chargeback_orders', (
        select count(*) from public.payment_orders
        where status in (
          'chargeback_pending'::public.payment_order_status,
          'chargeback_won'::public.payment_order_status,
          'chargeback_lost'::public.payment_order_status
        )
      ),
      'confirmed_amount_cents', (
        select coalesce(sum(amount_cents), 0)
        from public.payment_orders
        where payment_confirmed_at is not null
      ),
      'refunded_amount_cents', (
        select coalesce(sum(amount_cents), 0)
        from public.payment_orders
        where status = 'refunded'::public.payment_order_status
      ),
      'chargeback_lost_amount_cents', (
        select coalesce(sum(amount_cents), 0)
        from public.payment_orders
        where status = 'chargeback_lost'::public.payment_order_status
      )
    ),
    'total', (
      select count(*)
      from public.payment_orders payment_order
      left join auth.users account on account.id = payment_order.user_id
      where (p_status is null or payment_order.status = p_status)
        and (p_subject_type is null or payment_order.subject_type = p_subject_type)
        and (
          v_search is null
          or payment_order.id::text ilike '%' || v_search || '%'
          or payment_order.title_snapshot ilike '%' || v_search || '%'
          or coalesce(account.email, '') ilike '%' || v_search || '%'
        )
    ),
    'orders', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', order_record.id,
            'user_id', order_record.user_id,
            'customer_email', order_record.customer_email,
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
            'affiliate_attribution_id', order_record.affiliate_attribution_id,
            'latest_attempt', case
              when order_record.attempt_id is null then null
              else jsonb_build_object(
                'id', order_record.attempt_id,
                'status', order_record.attempt_status,
                'billing_type', order_record.billing_type,
                'provider', order_record.provider,
                'provider_status', order_record.provider_status,
                'provider_payment_id', order_record.provider_payment_id,
                'confirmed_at', order_record.attempt_confirmed_at,
                'received_at', order_record.attempt_received_at,
                'failure_code', order_record.attempt_failure_code,
                'updated_at', order_record.attempt_updated_at
              )
            end,
            'entitlement', case
              when order_record.entitlement_id is null then null
              else jsonb_build_object(
                'id', order_record.entitlement_id,
                'status', order_record.entitlement_status,
                'controls_access', order_record.controls_access,
                'enrollment_id', order_record.enrollment_id,
                'digital_product_access_id', order_record.digital_product_access_id,
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
          account.email as customer_email,
          latest_attempt.id as attempt_id,
          latest_attempt.status as attempt_status,
          latest_attempt.billing_type,
          latest_attempt.provider,
          latest_attempt.provider_status,
          latest_attempt.provider_payment_id,
          latest_attempt.confirmed_at as attempt_confirmed_at,
          latest_attempt.received_at as attempt_received_at,
          latest_attempt.failure_code as attempt_failure_code,
          latest_attempt.updated_at as attempt_updated_at,
          entitlement.id as entitlement_id,
          entitlement.status as entitlement_status,
          entitlement.controls_access,
          entitlement.enrollment_id,
          entitlement.digital_product_access_id,
          entitlement.granted_at,
          entitlement.suspended_at,
          entitlement.revoked_at
        from public.payment_orders payment_order
        left join auth.users account on account.id = payment_order.user_id
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
        where (p_status is null or payment_order.status = p_status)
          and (p_subject_type is null or payment_order.subject_type = p_subject_type)
          and (
            v_search is null
            or payment_order.id::text ilike '%' || v_search || '%'
            or payment_order.title_snapshot ilike '%' || v_search || '%'
            or coalesce(account.email, '') ilike '%' || v_search || '%'
          )
        order by payment_order.created_at desc, payment_order.id desc
        limit v_limit offset v_offset
      ) order_record
    )
  );
end;
$$;

revoke all on function private.get_payment_admin_dashboard(public.payment_order_status, public.checkout_subject_type, text, integer, integer) from public, anon, authenticated;
grant execute on function private.get_payment_admin_dashboard(public.payment_order_status, public.checkout_subject_type, text, integer, integer) to service_role;

create or replace function public.get_payment_admin_dashboard(
  p_status public.payment_order_status default null,
  p_subject_type public.checkout_subject_type default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_payment_admin_dashboard(p_status, p_subject_type, p_search, p_limit, p_offset);
$$;

revoke all on function public.get_payment_admin_dashboard(public.payment_order_status, public.checkout_subject_type, text, integer, integer) from public, anon;
grant execute on function public.get_payment_admin_dashboard(public.payment_order_status, public.checkout_subject_type, text, integer, integer) to authenticated, service_role;
