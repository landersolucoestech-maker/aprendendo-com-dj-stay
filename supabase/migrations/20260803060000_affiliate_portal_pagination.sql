-- FASE B103: paginação independente das coleções do portal do afiliado.

drop function if exists public.get_affiliate_portal();
drop function if exists private.get_affiliate_portal();

create function private.get_affiliate_portal(
  p_offer_limit integer default 25,
  p_offer_offset integer default 0,
  p_link_limit integer default 25,
  p_link_offset integer default 0,
  p_commission_limit integer default 25,
  p_commission_offset integer default 0,
  p_payout_limit integer default 25,
  p_payout_offset integer default 0,
  p_event_limit integer default 25,
  p_event_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.affiliate_profiles;
  v_offer_limit integer := greatest(1, least(coalesce(p_offer_limit, 25), 100));
  v_offer_offset integer := greatest(0, coalesce(p_offer_offset, 0));
  v_link_limit integer := greatest(1, least(coalesce(p_link_limit, 25), 100));
  v_link_offset integer := greatest(0, coalesce(p_link_offset, 0));
  v_commission_limit integer := greatest(1, least(coalesce(p_commission_limit, 25), 100));
  v_commission_offset integer := greatest(0, coalesce(p_commission_offset, 0));
  v_payout_limit integer := greatest(1, least(coalesce(p_payout_limit, 25), 100));
  v_payout_offset integer := greatest(0, coalesce(p_payout_offset, 0));
  v_event_limit integer := greatest(1, least(coalesce(p_event_limit, 25), 100));
  v_event_offset integer := greatest(0, coalesce(p_event_offset, 0));
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
    'totals', jsonb_build_object(
      'offers', (
        select count(*)
        from public.affiliate_subject_terms terms
        where terms.active
          and private.affiliate_subject_is_available(terms.subject_type, terms.subject_id)
      ),
      'links', (
        select count(*) from public.affiliate_links
        where affiliate_user_id = v_user_id
      ),
      'commissions', (
        select count(*) from public.affiliate_commissions
        where affiliate_user_id = v_user_id
      ),
      'payouts', (
        select count(*) from public.affiliate_payouts
        where affiliate_user_id = v_user_id
      ),
      'events', (
        select count(*) from public.affiliate_events
        where affiliate_user_id = v_user_id
      )
    ),
    'offers', coalesce((
      select jsonb_agg(to_jsonb(offer_page) order by offer_page.title, offer_page.subject_type, offer_page.subject_id)
      from (
        select *
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
        order by offer_record.title, offer_record.subject_type, offer_record.subject_id
        limit v_offer_limit offset v_offer_offset
      ) offer_page
    ), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(link_page.payload order by link_page.created_at desc, link_page.id desc)
      from (
        select
          link.id,
          link.created_at,
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
          ) as payload
        from public.affiliate_links link
        where link.affiliate_user_id = v_user_id
        order by link.created_at desc, link.id desc
        limit v_link_limit offset v_link_offset
      ) link_page
    ), '[]'::jsonb),
    'commissions', coalesce((
      select jsonb_agg(commission_page.payload order by commission_page.created_at desc, commission_page.id desc)
      from (
        select
          commission.id,
          commission.created_at,
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
          ) as payload
        from public.affiliate_commissions commission
        join public.payment_orders payment_order on payment_order.id = commission.order_id
        where commission.affiliate_user_id = v_user_id
        order by commission.created_at desc, commission.id desc
        limit v_commission_limit offset v_commission_offset
      ) commission_page
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(payout_page.payload order by payout_page.created_at desc, payout_page.id desc)
      from (
        select
          payout.id,
          payout.created_at,
          jsonb_build_object(
            'id', payout.id,
            'status', payout.status,
            'amount_cents', payout.amount_cents,
            'external_reference', payout.external_reference,
            'notes', payout.notes,
            'paid_at', payout.paid_at,
            'created_at', payout.created_at
          ) as payload
        from public.affiliate_payouts payout
        where payout.affiliate_user_id = v_user_id
        order by payout.created_at desc, payout.id desc
        limit v_payout_limit offset v_payout_offset
      ) payout_page
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(event_page) order by event_page.created_at desc, event_page.id desc)
      from (
        select id, event_type, details, created_at
        from public.affiliate_events
        where affiliate_user_id = v_user_id
        order by created_at desc, id desc
        limit v_event_limit offset v_event_offset
      ) event_page
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.get_affiliate_portal(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function private.get_affiliate_portal(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer)
  to authenticated;

create function public.get_affiliate_portal(
  p_offer_limit integer default 25,
  p_offer_offset integer default 0,
  p_link_limit integer default 25,
  p_link_offset integer default 0,
  p_commission_limit integer default 25,
  p_commission_offset integer default 0,
  p_payout_limit integer default 25,
  p_payout_offset integer default 0,
  p_event_limit integer default 25,
  p_event_offset integer default 0
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_affiliate_portal(
    p_offer_limit,
    p_offer_offset,
    p_link_limit,
    p_link_offset,
    p_commission_limit,
    p_commission_offset,
    p_payout_limit,
    p_payout_offset,
    p_event_limit,
    p_event_offset
  )
$$;

revoke all on function public.get_affiliate_portal(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_affiliate_portal(integer, integer, integer, integer, integer, integer, integer, integer, integer, integer)
  to authenticated;
