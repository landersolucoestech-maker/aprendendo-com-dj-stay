-- FASE B20: visão agregada e restrita do portal do afiliado.

create or replace function public.get_affiliate_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.affiliate_profiles;
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'afiliado'::public.app_role then
    raise exception 'AFFILIATE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select * into v_profile
  from public.affiliate_profiles
  where user_id = v_user_id;

  return jsonb_build_object(
    'profile', case when v_profile.user_id is null then null else to_jsonb(v_profile) end,
    'summary', jsonb_build_object(
      'clicks', (
        select count(*) from public.affiliate_clicks
        where affiliate_user_id = v_user_id
      ),
      'conversions', (
        select count(*) from public.affiliate_attributions
        where affiliate_user_id = v_user_id
          and status = 'converted'::public.affiliate_attribution_status
      ),
      'gross_sales_cents', coalesce((
        select sum(commission.basis_amount_cents)
        from public.affiliate_commissions commission
        where commission.affiliate_user_id = v_user_id
          and commission.status <> 'reversed'::public.affiliate_commission_status
      ), 0),
      'available_cents', coalesce((
        select sum(commission_amount_cents)
        from public.affiliate_commissions
        where affiliate_user_id = v_user_id
          and status = 'available'::public.affiliate_commission_status
      ), 0),
      'held_cents', coalesce((
        select sum(commission_amount_cents)
        from public.affiliate_commissions
        where affiliate_user_id = v_user_id
          and status = 'held'::public.affiliate_commission_status
      ), 0),
      'paid_cents', coalesce((
        select sum(commission_amount_cents)
        from public.affiliate_commissions
        where affiliate_user_id = v_user_id
          and status = 'paid'::public.affiliate_commission_status
      ), 0),
      'reversed_cents', coalesce((
        select sum(commission_amount_cents)
        from public.affiliate_commissions
        where affiliate_user_id = v_user_id
          and status = 'reversed'::public.affiliate_commission_status
      ), 0)
    ),
    'offers', coalesce((
      select jsonb_agg(to_jsonb(offer_record) order by offer_record.title)
      from (
        select
          terms.subject_type,
          terms.subject_id,
          course.title,
          course.slug,
          terms.commission_bps,
          terms.attribution_window_days,
          link.id as link_id,
          link.code as link_code,
          link.destination_path,
          link.status as link_status
        from public.affiliate_subject_terms terms
        join public.courses course
          on terms.subject_type = 'course'::public.checkout_subject_type
         and course.id = terms.subject_id
        left join public.affiliate_links link
          on link.affiliate_user_id = v_user_id
         and link.subject_type = terms.subject_type
         and link.subject_id = terms.subject_id
         and link.status = 'active'::public.affiliate_link_status
        where terms.active
          and private.affiliate_subject_is_available(terms.subject_type, terms.subject_id)
        union all
        select
          terms.subject_type,
          terms.subject_id,
          product.title,
          product.slug,
          terms.commission_bps,
          terms.attribution_window_days,
          link.id as link_id,
          link.code as link_code,
          link.destination_path,
          link.status as link_status
        from public.affiliate_subject_terms terms
        join public.digital_products product
          on terms.subject_type = 'digital_product'::public.checkout_subject_type
         and product.id = terms.subject_id
        left join public.affiliate_links link
          on link.affiliate_user_id = v_user_id
         and link.subject_type = terms.subject_type
         and link.subject_id = terms.subject_id
         and link.status = 'active'::public.affiliate_link_status
        where terms.active
          and private.affiliate_subject_is_available(terms.subject_type, terms.subject_id)
      ) offer_record
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', link.id,
          'subject_type', link.subject_type,
          'subject_id', link.subject_id,
          'code', link.code,
          'status', link.status,
          'destination_path', link.destination_path,
          'created_at', link.created_at,
          'clicks', (
            select count(*) from public.affiliate_clicks click_record
            where click_record.link_id = link.id
          ),
          'conversions', (
            select count(*) from public.affiliate_attributions attribution
            where attribution.link_id = link.id
              and attribution.status = 'converted'::public.affiliate_attribution_status
          ),
          'commission_cents', coalesce((
            select sum(commission.commission_amount_cents)
            from public.affiliate_commissions commission
            where commission.link_id = link.id
              and commission.status <> 'reversed'::public.affiliate_commission_status
          ), 0)
        ) order by link.created_at desc
      )
      from public.affiliate_links link
      where link.affiliate_user_id = v_user_id
    ), '[]'::jsonb),
    'commissions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', commission.id,
          'order_id', commission.order_id,
          'title', payment_order.title_snapshot,
          'basis_amount_cents', commission.basis_amount_cents,
          'commission_bps', commission.commission_bps,
          'commission_amount_cents', commission.commission_amount_cents,
          'status', commission.status,
          'created_at', commission.created_at,
          'available_at', commission.available_at,
          'paid_at', commission.paid_at
        ) order by commission.created_at desc
      )
      from public.affiliate_commissions commission
      join public.payment_orders payment_order on payment_order.id = commission.order_id
      where commission.affiliate_user_id = v_user_id
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', payout.id,
          'status', payout.status,
          'amount_cents', payout.amount_cents,
          'external_reference', payout.external_reference,
          'notes', payout.notes,
          'paid_at', payout.paid_at,
          'created_at', payout.created_at
        ) order by payout.created_at desc
      )
      from public.affiliate_payouts payout
      where payout.affiliate_user_id = v_user_id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(event_record) order by event_record.created_at desc)
      from (
        select id, event_type, details, created_at
        from public.affiliate_events
        where affiliate_user_id = v_user_id
        order by created_at desc
        limit 50
      ) event_record
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_affiliate_portal() from public, anon, authenticated;
grant execute on function public.get_affiliate_portal() to authenticated;
