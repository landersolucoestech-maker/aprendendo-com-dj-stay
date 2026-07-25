begin;

create or replace function private.preserve_terminal_payment_status()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.status in ('approved', 'refunded', 'chargeback')
     and new.status in ('created', 'pending', 'processing', 'rejected', 'cancelled') then
    new.status := old.status;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;

revoke all on function private.preserve_terminal_payment_status() from public, anon, authenticated;

drop trigger if exists payments_preserve_terminal_status on public.payments;
create trigger payments_preserve_terminal_status
  before update of status on public.payments
  for each row
  execute function private.preserve_terminal_payment_status();

create or replace function private.fulfill_approved_payment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  order_record public.orders;
begin
  if new.status <> 'approved' or (tg_op = 'UPDATE' and old.status = 'approved') then
    return new;
  end if;

  select * into order_record
  from public.orders
  where id = new.order_id
  for update;

  if order_record.id is null then
    raise exception 'Order not found for approved payment';
  end if;

  if new.currency <> order_record.currency then
    raise exception 'Payment currency does not match order currency';
  end if;

  if new.amount_cents < order_record.total_cents then
    raise exception 'Approved payment amount is lower than order total';
  end if;

  update public.orders
     set status = 'paid',
         paid_at = coalesce(new.approved_at, now()),
         updated_at = now()
   where id = new.order_id
     and status <> 'paid';

  insert into public.enrollments (
    user_id,
    course_id,
    order_item_id,
    status,
    enrolled_at,
    access_starts_at,
    access_expires_at
  )
  select
    order_record.user_id,
    oi.course_id,
    oi.id,
    'active',
    now(),
    now(),
    case
      when oi.lifetime_access then null
      else now() + make_interval(days => oi.access_days)
    end
  from public.order_items oi
  where oi.order_id = new.order_id
  on conflict (user_id, course_id) do update set
    order_item_id = excluded.order_item_id,
    status = 'active',
    access_starts_at = least(public.enrollments.access_starts_at, excluded.access_starts_at),
    access_expires_at = case
      when public.enrollments.access_expires_at is null or excluded.access_expires_at is null then null
      else greatest(public.enrollments.access_expires_at, excluded.access_expires_at)
    end,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.fulfill_approved_payment() from public, anon, authenticated;

create or replace function private.expire_stale_carts()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected integer;
begin
  update public.carts
     set status = case
       when expires_at <= now() then 'expired'::public.cart_status
       else 'abandoned'::public.cart_status
     end,
     updated_at = now()
   where status = 'active'
     and (
       expires_at <= now()
       or updated_at <= now() - interval '24 hours'
     );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function private.expire_stale_carts() from public, anon, authenticated;
grant execute on function private.expire_stale_carts() to service_role;

commit;
