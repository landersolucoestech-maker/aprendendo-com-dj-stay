-- FASE B20: propagação imutável da atribuição do checkout para o pedido.

create or replace function private.sync_payment_order_attempt_from_checkout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders;
begin
  if new.status <> 'checkout_created'::public.checkout_intent_status then
    return new;
  end if;

  insert into public.payment_orders (
    user_id,
    checkout_intent_id,
    subject_type,
    subject_id,
    license_id,
    affiliate_attribution_id,
    status,
    amount_cents,
    currency_code,
    title_snapshot,
    item_snapshot
  ) values (
    new.user_id,
    new.id,
    new.subject_type,
    new.subject_id,
    new.license_id,
    new.affiliate_attribution_id,
    'checkout_pending'::public.payment_order_status,
    new.amount_cents,
    new.currency_code,
    new.title_snapshot,
    new.item_snapshot
  )
  on conflict (checkout_intent_id) do update
  set amount_cents = excluded.amount_cents,
      currency_code = excluded.currency_code,
      title_snapshot = excluded.title_snapshot,
      item_snapshot = excluded.item_snapshot,
      affiliate_attribution_id = excluded.affiliate_attribution_id,
      version = public.payment_orders.version + 1
  returning * into v_order;

  insert into public.payment_attempts (
    order_id,
    checkout_intent_id,
    provider,
    provider_checkout_id,
    status,
    amount_cents,
    currency_code
  ) values (
    v_order.id,
    new.id,
    new.provider,
    new.provider_checkout_id,
    'checkout_created'::public.payment_attempt_status,
    new.amount_cents,
    new.currency_code
  )
  on conflict (checkout_intent_id) do update
  set provider_checkout_id = excluded.provider_checkout_id,
      amount_cents = excluded.amount_cents,
      currency_code = excluded.currency_code,
      version = public.payment_attempts.version + 1;

  return new;
end;
$$;

revoke all on function private.sync_payment_order_attempt_from_checkout()
  from public, anon, authenticated;
