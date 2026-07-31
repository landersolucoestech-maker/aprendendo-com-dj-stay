-- FASE B20: visão administrativa agregada do programa de afiliados.

create or replace function public.get_affiliate_admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'affiliates', (
        select count(*) from public.user_roles
        where role = 'afiliado'::public.app_role
      ),
      'active_affiliates', (
        select count(*) from public.affiliate_profiles
        where status = 'active'::public.affiliate_profile_status
      ),
      'clicks', (select count(*) from public.affiliate_clicks),
      'conversions', (
        select count(*) from public.affiliate_attributions
        where status = 'converted'::public.affiliate_attribution_status
      ),
      'available_cents', coalesce((
        select sum(commission_amount_cents) from public.affiliate_commissions
        where status = 'available'::public.affiliate_commission_status
      ), 0),
      'held_cents', coalesce((
        select sum(commission_amount_cents) from public.affiliate_commissions
        where status = 'held'::public.affiliate_commission_status
      ), 0),
      'paid_cents', coalesce((
        select sum(commission_amount_cents) from public.affiliate_commissions
        where status = 'paid'::public.affiliate_commission_status
      ), 0)
    ),
    'profiles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', role_record.user_id,
          'code', profile.code,
          'status', coalesce(profile.status::text, 'not_requested'),
          'display_name', profile.display_name,
          'created_at', profile.created_at,
          'activated_at', profile.activated_at,
          'suspended_at', profile.suspended_at,
          'suspension_reason', profile.suspension_reason,
          'links', (
            select count(*) from public.affiliate_links link
            where link.affiliate_user_id = role_record.user_id
              and link.status = 'active'::public.affiliate_link_status
          ),
          'clicks', (
            select count(*) from public.affiliate_clicks click_record
            where click_record.affiliate_user_id = role_record.user_id
          ),
          'conversions', (
            select count(*) from public.affiliate_attributions attribution
            where attribution.affiliate_user_id = role_record.user_id
              and attribution.status = 'converted'::public.affiliate_attribution_status
          ),
          'available_cents', coalesce((
            select sum(commission_amount_cents)
            from public.affiliate_commissions commission
            where commission.affiliate_user_id = role_record.user_id
              and commission.status = 'available'::public.affiliate_commission_status
          ), 0)
        ) order by profile.created_at desc nulls last, role_record.user_id
      )
      from public.user_roles role_record
      left join public.affiliate_profiles profile on profile.user_id = role_record.user_id
      where role_record.role = 'afiliado'::public.app_role
    ), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(to_jsonb(offer_record) order by offer_record.title)
      from (
        select
          'course'::text as subject_type,
          course.id as subject_id,
          course.title,
          course.slug,
          course.status::text as publication_status,
          course.affiliate_eligible,
          terms.id as terms_id,
          terms.commission_bps,
          terms.attribution_window_days,
          coalesce(terms.active, false) as terms_active
        from public.courses course
        left join public.affiliate_subject_terms terms
          on terms.subject_type = 'course'::public.checkout_subject_type
         and terms.subject_id = course.id
        where course.deleted_at is null
          and course.affiliate_eligible
        union all
        select
          'digital_product'::text as subject_type,
          product.id as subject_id,
          product.title,
          product.slug,
          product.status::text as publication_status,
          product.affiliate_eligible,
          terms.id as terms_id,
          terms.commission_bps,
          terms.attribution_window_days,
          coalesce(terms.active, false) as terms_active
        from public.digital_products product
        left join public.affiliate_subject_terms terms
          on terms.subject_type = 'digital_product'::public.checkout_subject_type
         and terms.subject_id = product.id
        where product.deleted_at is null
          and product.affiliate_eligible
      ) offer_record
    ), '[]'::jsonb),
    'available_commissions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', commission.id,
          'affiliate_user_id', commission.affiliate_user_id,
          'order_id', commission.order_id,
          'title', payment_order.title_snapshot,
          'basis_amount_cents', commission.basis_amount_cents,
          'commission_bps', commission.commission_bps,
          'commission_amount_cents', commission.commission_amount_cents,
          'created_at', commission.created_at
        ) order by commission.created_at
      )
      from public.affiliate_commissions commission
      join public.payment_orders payment_order on payment_order.id = commission.order_id
      where commission.status = 'available'::public.affiliate_commission_status
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', payout.id,
          'affiliate_user_id', payout.affiliate_user_id,
          'status', payout.status,
          'amount_cents', payout.amount_cents,
          'external_reference', payout.external_reference,
          'notes', payout.notes,
          'cancellation_reason', payout.cancellation_reason,
          'created_at', payout.created_at,
          'paid_at', payout.paid_at,
          'cancelled_at', payout.cancelled_at,
          'commission_ids', coalesce((
            select jsonb_agg(item.commission_id order by item.commission_id)
            from public.affiliate_payout_items item
            where item.payout_id = payout.id
          ), '[]'::jsonb)
        ) order by payout.created_at desc
      )
      from public.affiliate_payouts payout
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_affiliate_admin_dashboard()
  from public, anon, authenticated;
grant execute on function public.get_affiliate_admin_dashboard()
  to authenticated;
