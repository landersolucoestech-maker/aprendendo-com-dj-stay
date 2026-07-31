-- FASE B20: criação, confirmação e cancelamento de pagamentos manuais auditados.

create or replace function public.admin_create_affiliate_payout(
  p_affiliate_user_id uuid,
  p_commission_ids uuid[],
  p_notes text default null
)
returns public.affiliate_payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_payout public.affiliate_payouts;
  v_expected_count integer;
  v_actual_count integer;
  v_amount integer;
  v_valid boolean;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_affiliate_user_id is null
     or p_commission_ids is null
     or cardinality(p_commission_ids) = 0
     or cardinality(p_commission_ids) > 500
     or (p_notes is not null and char_length(p_notes) > 2000) then
    raise exception 'AFFILIATE_PAYOUT_INPUT_INVALID' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.affiliate_profiles
    where user_id = p_affiliate_user_id
  ) then
    raise exception 'AFFILIATE_PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select count(*) into v_expected_count
  from (select distinct unnest(p_commission_ids) as id) selected;

  perform 1
  from public.affiliate_commissions commission_record
  where commission_record.id = any(p_commission_ids)
  order by commission_record.id
  for update;

  select
    count(*),
    coalesce(sum(commission_amount_cents), 0)::integer,
    coalesce(bool_and(
      affiliate_user_id = p_affiliate_user_id
      and status = 'available'::public.affiliate_commission_status
    ), false)
  into v_actual_count, v_amount, v_valid
  from public.affiliate_commissions
  where id = any(p_commission_ids);

  if v_actual_count <> v_expected_count or not v_valid or v_amount <= 0 then
    raise exception 'AFFILIATE_PAYOUT_COMMISSION_SET_INVALID' using errcode = '22023';
  end if;

  insert into public.affiliate_payouts (
    affiliate_user_id,
    status,
    amount_cents,
    currency_code,
    notes,
    created_by_user_id
  ) values (
    p_affiliate_user_id,
    'draft'::public.affiliate_payout_status,
    v_amount,
    'BRL',
    nullif(btrim(p_notes), ''),
    v_actor
  )
  returning * into v_payout;

  insert into public.affiliate_payout_items (
    payout_id,
    commission_id,
    amount_cents
  )
  select
    v_payout.id,
    commission_record.id,
    commission_record.commission_amount_cents
  from public.affiliate_commissions commission_record
  where commission_record.id = any(p_commission_ids);

  update public.affiliate_commissions
  set status = 'held'::public.affiliate_commission_status,
      held_at = statement_timestamp()
  where id = any(p_commission_ids)
    and status = 'available'::public.affiliate_commission_status;

  insert into public.affiliate_events (
    affiliate_user_id,
    event_type,
    actor_user_id,
    commission_id,
    payout_id,
    details
  )
  select
    p_affiliate_user_id,
    'commission_held'::public.affiliate_event_type,
    v_actor,
    item.commission_id,
    v_payout.id,
    jsonb_build_object('reason', 'payout_draft')
  from public.affiliate_payout_items item
  where item.payout_id = v_payout.id;

  perform private.log_affiliate_event(
    'payout_created'::public.affiliate_event_type,
    p_affiliate_user_id,
    p_affiliate_user_id,
    null,
    null,
    null,
    v_payout.id,
    jsonb_build_object(
      'amount_cents', v_payout.amount_cents,
      'commission_count', v_actual_count
    ),
    v_actor
  );

  return v_payout;
end;
$$;

create or replace function public.admin_mark_affiliate_payout_paid(
  p_payout_id uuid,
  p_external_reference text
)
returns public.affiliate_payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_payout public.affiliate_payouts;
  v_item_count integer;
  v_updated_count integer;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_payout_id is null
     or nullif(btrim(p_external_reference), '') is null
     or char_length(btrim(p_external_reference)) not between 3 and 200 then
    raise exception 'AFFILIATE_PAYOUT_REFERENCE_INVALID' using errcode = '22023';
  end if;

  select * into v_payout
  from public.affiliate_payouts
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'AFFILIATE_PAYOUT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_payout.status = 'paid'::public.affiliate_payout_status then
    return v_payout;
  end if;
  if v_payout.status <> 'draft'::public.affiliate_payout_status then
    raise exception 'AFFILIATE_PAYOUT_NOT_PAYABLE' using errcode = '22023';
  end if;

  select count(*) into v_item_count
  from public.affiliate_payout_items
  where payout_id = v_payout.id;

  perform 1
  from public.affiliate_commissions commission_record
  join public.affiliate_payout_items item
    on item.commission_id = commission_record.id
  where item.payout_id = v_payout.id
  order by commission_record.id
  for update of commission_record;

  update public.affiliate_commissions commission_record
  set status = 'paid'::public.affiliate_commission_status,
      paid_at = statement_timestamp(),
      held_at = null
  from public.affiliate_payout_items item
  where item.payout_id = v_payout.id
    and item.commission_id = commission_record.id
    and commission_record.status = 'held'::public.affiliate_commission_status;

  get diagnostics v_updated_count = row_count;

  if v_item_count = 0 or v_updated_count <> v_item_count then
    raise exception 'AFFILIATE_PAYOUT_COMMISSION_STATE_INVALID' using errcode = '40001';
  end if;

  update public.affiliate_payouts
  set status = 'paid'::public.affiliate_payout_status,
      external_reference = btrim(p_external_reference),
      paid_by_user_id = v_actor,
      paid_at = statement_timestamp()
  where id = v_payout.id
  returning * into v_payout;

  perform private.log_affiliate_event(
    'payout_paid'::public.affiliate_event_type,
    v_payout.affiliate_user_id,
    v_payout.affiliate_user_id,
    null,
    null,
    null,
    v_payout.id,
    jsonb_build_object(
      'amount_cents', v_payout.amount_cents,
      'external_reference', v_payout.external_reference
    ),
    v_actor
  );

  return v_payout;
end;
$$;

create or replace function public.admin_cancel_affiliate_payout(
  p_payout_id uuid,
  p_reason text
)
returns public.affiliate_payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_payout public.affiliate_payouts;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_payout_id is null
     or nullif(btrim(p_reason), '') is null
     or char_length(btrim(p_reason)) not between 3 and 1000 then
    raise exception 'AFFILIATE_PAYOUT_CANCELLATION_REASON_INVALID' using errcode = '22023';
  end if;

  select * into v_payout
  from public.affiliate_payouts
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'AFFILIATE_PAYOUT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_payout.status = 'cancelled'::public.affiliate_payout_status then
    return v_payout;
  end if;
  if v_payout.status <> 'draft'::public.affiliate_payout_status then
    raise exception 'AFFILIATE_PAYOUT_NOT_CANCELLABLE' using errcode = '22023';
  end if;

  perform 1
  from public.affiliate_commissions commission_record
  join public.affiliate_payout_items item
    on item.commission_id = commission_record.id
  where item.payout_id = v_payout.id
  order by commission_record.id
  for update of commission_record;

  update public.affiliate_commissions commission_record
  set status = 'available'::public.affiliate_commission_status,
      available_at = coalesce(available_at, statement_timestamp()),
      held_at = null
  from public.affiliate_payout_items item
  where item.payout_id = v_payout.id
    and item.commission_id = commission_record.id
    and commission_record.status = 'held'::public.affiliate_commission_status;

  update public.affiliate_payouts
  set status = 'cancelled'::public.affiliate_payout_status,
      cancelled_at = statement_timestamp(),
      cancellation_reason = btrim(p_reason)
  where id = v_payout.id
  returning * into v_payout;

  perform private.log_affiliate_event(
    'payout_cancelled'::public.affiliate_event_type,
    v_payout.affiliate_user_id,
    v_payout.affiliate_user_id,
    null,
    null,
    null,
    v_payout.id,
    jsonb_build_object('reason', v_payout.cancellation_reason),
    v_actor
  );

  return v_payout;
end;
$$;

revoke all on function public.admin_create_affiliate_payout(uuid, uuid[], text)
  from public, anon, authenticated;
revoke all on function public.admin_mark_affiliate_payout_paid(uuid, text)
  from public, anon, authenticated;
revoke all on function public.admin_cancel_affiliate_payout(uuid, text)
  from public, anon, authenticated;

grant execute on function public.admin_create_affiliate_payout(uuid, uuid[], text)
  to authenticated;
grant execute on function public.admin_mark_affiliate_payout_paid(uuid, text)
  to authenticated;
grant execute on function public.admin_cancel_affiliate_payout(uuid, text)
  to authenticated;
