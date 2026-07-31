-- FASE B20: conversão e ciclo de comissão derivados dos eventos financeiros B19.

create or replace function private.apply_affiliate_commission_adjustment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders;
  v_attribution public.affiliate_attributions;
  v_commission public.affiliate_commissions;
  v_amount integer;
  v_created boolean := false;
begin
  select * into v_order
  from public.payment_orders
  where id = new.order_id
  for update;

  if not found or v_order.affiliate_attribution_id is null then
    return new;
  end if;

  select * into v_attribution
  from public.affiliate_attributions
  where id = v_order.affiliate_attribution_id
  for update;

  if not found
     or v_attribution.subject_type <> v_order.subject_type
     or v_attribution.subject_id <> v_order.subject_id
     or v_attribution.affiliate_user_id = v_order.user_id then
    return new;
  end if;

  if new.kind = 'accrue'::public.commission_adjustment_kind then
    if v_attribution.status = 'active'::public.affiliate_attribution_status then
      update public.affiliate_attributions
      set status = 'converted'::public.affiliate_attribution_status,
          converted_order_id = v_order.id,
          converted_at = coalesce(v_order.payment_confirmed_at, statement_timestamp())
      where id = v_attribution.id
      returning * into v_attribution;
    elsif v_attribution.status <> 'converted'::public.affiliate_attribution_status
       or v_attribution.converted_order_id <> v_order.id then
      return new;
    end if;

    v_amount := round(
      v_order.amount_cents::numeric * v_attribution.commission_bps::numeric / 10000
    )::integer;

    if v_amount <= 0 then
      return new;
    end if;

    insert into public.affiliate_commissions (
      order_id,
      attribution_id,
      affiliate_user_id,
      link_id,
      basis_amount_cents,
      commission_bps,
      commission_amount_cents,
      currency_code,
      status,
      available_at
    ) values (
      v_order.id,
      v_attribution.id,
      v_attribution.affiliate_user_id,
      v_attribution.link_id,
      v_order.amount_cents,
      v_attribution.commission_bps,
      v_amount,
      v_order.currency_code,
      'available'::public.affiliate_commission_status,
      coalesce(v_order.payment_confirmed_at, statement_timestamp())
    )
    on conflict (order_id) do nothing
    returning * into v_commission;

    v_created := found;

    if not v_created then
      select * into v_commission
      from public.affiliate_commissions
      where order_id = v_order.id
      for update;
    end if;

    if v_created then
      perform private.log_affiliate_event(
        'conversion_created'::public.affiliate_event_type,
        v_attribution.affiliate_user_id,
        v_attribution.affiliate_user_id,
        v_attribution.link_id,
        v_attribution.id,
        v_commission.id,
        null,
        jsonb_build_object(
          'order_id', v_order.id,
          'basis_amount_cents', v_order.amount_cents,
          'commission_bps', v_attribution.commission_bps
        ),
        null
      );

      perform private.log_affiliate_event(
        'commission_available'::public.affiliate_event_type,
        v_attribution.affiliate_user_id,
        v_attribution.affiliate_user_id,
        v_attribution.link_id,
        v_attribution.id,
        v_commission.id,
        null,
        jsonb_build_object('amount_cents', v_commission.commission_amount_cents),
        null
      );
    end if;
  else
    select * into v_commission
    from public.affiliate_commissions
    where order_id = v_order.id
    for update;

    if not found then
      return new;
    end if;

    if new.kind = 'hold'::public.commission_adjustment_kind then
      if v_commission.status in (
        'pending'::public.affiliate_commission_status,
        'available'::public.affiliate_commission_status
      ) then
        update public.affiliate_commissions
        set status = 'held'::public.affiliate_commission_status,
            held_at = statement_timestamp(),
            reversed_at = null
        where id = v_commission.id
        returning * into v_commission;
      end if;

      perform private.log_affiliate_event(
        'commission_held'::public.affiliate_event_type,
        v_commission.affiliate_user_id,
        v_commission.affiliate_user_id,
        v_commission.link_id,
        v_commission.attribution_id,
        v_commission.id,
        null,
        jsonb_build_object(
          'payment_adjustment_id', new.id,
          'paid_out', v_commission.status = 'paid'::public.affiliate_commission_status
        ),
        null
      );
    elsif new.kind = 'reverse'::public.commission_adjustment_kind then
      if v_commission.status <> 'paid'::public.affiliate_commission_status
         and v_commission.status <> 'reversed'::public.affiliate_commission_status then
        update public.affiliate_commissions
        set status = 'reversed'::public.affiliate_commission_status,
            held_at = null,
            reversed_at = statement_timestamp()
        where id = v_commission.id
        returning * into v_commission;
      end if;

      perform private.log_affiliate_event(
        'commission_reversed'::public.affiliate_event_type,
        v_commission.affiliate_user_id,
        v_commission.affiliate_user_id,
        v_commission.link_id,
        v_commission.attribution_id,
        v_commission.id,
        null,
        jsonb_build_object(
          'payment_adjustment_id', new.id,
          'clawback_due', v_commission.status = 'paid'::public.affiliate_commission_status
        ),
        null
      );
    elsif new.kind = 'restore'::public.commission_adjustment_kind then
      if v_commission.status in (
        'held'::public.affiliate_commission_status,
        'reversed'::public.affiliate_commission_status
      ) then
        update public.affiliate_commissions
        set status = 'available'::public.affiliate_commission_status,
            available_at = coalesce(available_at, statement_timestamp()),
            held_at = null,
            reversed_at = null
        where id = v_commission.id
        returning * into v_commission;
      end if;

      perform private.log_affiliate_event(
        'commission_restored'::public.affiliate_event_type,
        v_commission.affiliate_user_id,
        v_commission.affiliate_user_id,
        v_commission.link_id,
        v_commission.attribution_id,
        v_commission.id,
        null,
        jsonb_build_object('payment_adjustment_id', new.id),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger commission_adjustments_apply_affiliate_commission
after insert on public.commission_adjustment_events
for each row execute function private.apply_affiliate_commission_adjustment();

revoke all on function private.apply_affiliate_commission_adjustment()
  from public, anon, authenticated;
