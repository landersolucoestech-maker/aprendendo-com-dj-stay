-- FASE B96: analytics financeiros reais por período para o proprietário.

create or replace function private.get_payment_admin_analytics(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_top_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_end_at timestamptz := coalesce(p_end_at, statement_timestamp());
  v_start_at timestamptz := coalesce(p_start_at, v_end_at - interval '30 days');
  v_top_limit integer := least(greatest(coalesce(p_top_limit, 10), 1), 20);
begin
  if auth.uid() is null
     or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_start_at >= v_end_at then
    raise exception 'PAYMENT_ANALYTICS_PERIOD_INVALID' using errcode = '22023';
  end if;

  if v_end_at - v_start_at > interval '366 days' then
    raise exception 'PAYMENT_ANALYTICS_PERIOD_TOO_LARGE' using errcode = '22023';
  end if;

  return (
    with confirmed_orders as materialized (
      select
        payment_order.id,
        payment_order.user_id,
        payment_order.subject_type,
        payment_order.subject_id,
        payment_order.status,
        payment_order.amount_cents,
        payment_order.title_snapshot,
        payment_order.payment_confirmed_at
      from public.payment_orders as payment_order
      where payment_order.payment_confirmed_at >= v_start_at
        and payment_order.payment_confirmed_at < v_end_at
    ), summary as (
      select
        count(*)::integer as confirmed_orders,
        count(distinct user_id)::integer as unique_customers,
        coalesce(sum(amount_cents), 0)::bigint as gross_revenue_cents,
        count(*) filter (where status = 'refunded'::public.payment_order_status)::integer as refunded_orders,
        coalesce(sum(amount_cents) filter (where status = 'refunded'::public.payment_order_status), 0)::bigint as refunded_amount_cents,
        count(*) filter (where status = 'chargeback_lost'::public.payment_order_status)::integer as chargeback_lost_orders,
        coalesce(sum(amount_cents) filter (where status = 'chargeback_lost'::public.payment_order_status), 0)::bigint as chargeback_lost_amount_cents,
        coalesce(sum(amount_cents) filter (where status = 'refund_pending'::public.payment_order_status), 0)::bigint as refund_pending_amount_cents,
        coalesce(sum(amount_cents) filter (where status = 'chargeback_pending'::public.payment_order_status), 0)::bigint as chargeback_pending_amount_cents
      from confirmed_orders
    ), status_values as (
      select unnest(enum_range(null::public.payment_order_status)) as status
    ), status_summary as (
      select
        status_value.status,
        count(confirmed_order.id)::integer as order_count,
        coalesce(sum(confirmed_order.amount_cents), 0)::bigint as amount_cents
      from status_values as status_value
      left join confirmed_orders as confirmed_order
        on confirmed_order.status = status_value.status
      group by status_value.status
    ), subject_values as (
      select unnest(enum_range(null::public.checkout_subject_type)) as subject_type
    ), subject_summary as (
      select
        subject_value.subject_type,
        count(confirmed_order.id)::integer as order_count,
        coalesce(sum(confirmed_order.amount_cents), 0)::bigint as gross_revenue_cents,
        coalesce(sum(confirmed_order.amount_cents) filter (
          where confirmed_order.status in (
            'refunded'::public.payment_order_status,
            'chargeback_lost'::public.payment_order_status
          )
        ), 0)::bigint as reversed_amount_cents
      from subject_values as subject_value
      left join confirmed_orders as confirmed_order
        on confirmed_order.subject_type = subject_value.subject_type
      group by subject_value.subject_type
    ), offer_summary as (
      select
        confirmed_order.subject_type,
        confirmed_order.subject_id,
        (array_agg(
          confirmed_order.title_snapshot
          order by confirmed_order.payment_confirmed_at desc, confirmed_order.id desc
        ))[1] as title,
        count(*)::integer as order_count,
        sum(confirmed_order.amount_cents)::bigint as gross_revenue_cents,
        coalesce(sum(confirmed_order.amount_cents) filter (
          where confirmed_order.status in (
            'refunded'::public.payment_order_status,
            'chargeback_lost'::public.payment_order_status
          )
        ), 0)::bigint as reversed_amount_cents
      from confirmed_orders as confirmed_order
      group by confirmed_order.subject_type, confirmed_order.subject_id
      order by count(*) desc, sum(confirmed_order.amount_cents) desc, confirmed_order.subject_id
      limit v_top_limit
    ), local_days as (
      select generate_series(
        (v_start_at at time zone 'America/Sao_Paulo')::date,
        ((v_end_at - interval '1 microsecond') at time zone 'America/Sao_Paulo')::date,
        interval '1 day'
      )::date as day
    ), daily_summary as (
      select
        local_day.day,
        count(confirmed_order.id)::integer as order_count,
        coalesce(sum(confirmed_order.amount_cents), 0)::bigint as gross_revenue_cents,
        coalesce(sum(confirmed_order.amount_cents) filter (
          where confirmed_order.status in (
            'refunded'::public.payment_order_status,
            'chargeback_lost'::public.payment_order_status
          )
        ), 0)::bigint as reversed_amount_cents
      from local_days as local_day
      left join confirmed_orders as confirmed_order
        on (confirmed_order.payment_confirmed_at at time zone 'America/Sao_Paulo')::date = local_day.day
      group by local_day.day
    )
    select jsonb_build_object(
      'period', jsonb_build_object(
        'start_at', v_start_at,
        'end_at', v_end_at,
        'time_zone', 'America/Sao_Paulo'
      ),
      'summary', jsonb_build_object(
        'confirmed_orders', summary.confirmed_orders,
        'unique_customers', summary.unique_customers,
        'gross_revenue_cents', summary.gross_revenue_cents,
        'refunded_orders', summary.refunded_orders,
        'refunded_amount_cents', summary.refunded_amount_cents,
        'chargeback_lost_orders', summary.chargeback_lost_orders,
        'chargeback_lost_amount_cents', summary.chargeback_lost_amount_cents,
        'refund_pending_amount_cents', summary.refund_pending_amount_cents,
        'chargeback_pending_amount_cents', summary.chargeback_pending_amount_cents,
        'net_after_reversals_cents',
          summary.gross_revenue_cents
          - summary.refunded_amount_cents
          - summary.chargeback_lost_amount_cents,
        'average_ticket_cents', case
          when summary.confirmed_orders = 0 then 0
          else round(summary.gross_revenue_cents::numeric / summary.confirmed_orders)::bigint
        end
      ),
      'status_breakdown', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'status', status_row.status,
              'order_count', status_row.order_count,
              'amount_cents', status_row.amount_cents
            ) order by status_row.status::text
          ),
          '[]'::jsonb
        )
        from status_summary as status_row
      ),
      'subject_breakdown', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'subject_type', subject_row.subject_type,
              'order_count', subject_row.order_count,
              'gross_revenue_cents', subject_row.gross_revenue_cents,
              'reversed_amount_cents', subject_row.reversed_amount_cents,
              'net_after_reversals_cents',
                subject_row.gross_revenue_cents - subject_row.reversed_amount_cents
            ) order by subject_row.subject_type::text
          ),
          '[]'::jsonb
        )
        from subject_summary as subject_row
      ),
      'top_offers', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'subject_type', offer_row.subject_type,
              'subject_id', offer_row.subject_id,
              'title', offer_row.title,
              'order_count', offer_row.order_count,
              'gross_revenue_cents', offer_row.gross_revenue_cents,
              'reversed_amount_cents', offer_row.reversed_amount_cents,
              'net_after_reversals_cents',
                offer_row.gross_revenue_cents - offer_row.reversed_amount_cents
            ) order by offer_row.order_count desc, offer_row.gross_revenue_cents desc, offer_row.subject_id
          ),
          '[]'::jsonb
        )
        from offer_summary as offer_row
      ),
      'daily', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'day', to_char(daily_row.day, 'YYYY-MM-DD'),
              'order_count', daily_row.order_count,
              'gross_revenue_cents', daily_row.gross_revenue_cents,
              'reversed_amount_cents', daily_row.reversed_amount_cents,
              'net_after_reversals_cents',
                daily_row.gross_revenue_cents - daily_row.reversed_amount_cents
            ) order by daily_row.day
          ),
          '[]'::jsonb
        )
        from daily_summary as daily_row
      )
    from summary
  );
end;
$$;

revoke all on function private.get_payment_admin_analytics(timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function private.get_payment_admin_analytics(timestamptz, timestamptz, integer)
  to authenticated, service_role;

create or replace function public.get_payment_admin_analytics(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_top_limit integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_payment_admin_analytics(p_start_at, p_end_at, p_top_limit)
$$;

revoke all on function public.get_payment_admin_analytics(timestamptz, timestamptz, integer)
  from public, anon;
grant execute on function public.get_payment_admin_analytics(timestamptz, timestamptz, integer)
  to authenticated;
