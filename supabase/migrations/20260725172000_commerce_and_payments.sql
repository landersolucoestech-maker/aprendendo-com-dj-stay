begin;

do $$ begin
  create type public.cart_status as enum ('active','converted','abandoned','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending','awaiting_payment','paid','cancelled','refunded','partially_refunded','chargeback');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('created','pending','processing','approved','rejected','cancelled','refunded','partially_refunded','chargeback');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('mercado_pago','stripe');
exception when duplicate_object then null; end $$;

create sequence if not exists public.order_number_seq start with 1000;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses(id) on delete restrict,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft','active','inactive','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  description text,
  currency char(3) not null default 'BRL',
  amount_cents integer not null check (amount_cents >= 0),
  compare_at_cents integer check (compare_at_cents is null or compare_at_cents >= amount_cents),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  lifetime_access boolean not null default true,
  access_days integer check (access_days is null or access_days > 0),
  max_installments integer not null default 12 check (max_installments between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  currency char(3) default 'BRL',
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  max_redemptions_per_user integer not null default 1 check (max_redemptions_per_user > 0),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value between 1 and 100)
);

create table if not exists public.coupon_products (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id,product_id)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.cart_status not null default 'active',
  currency char(3) not null default 'BRL',
  coupon_id uuid references public.coupons(id) on delete set null,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  converted_order_id uuid,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists carts_one_active_per_user_idx on public.carts(user_id) where status = 'active';

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete restrict,
  quantity integer not null default 1 check (quantity = 1),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  total_amount_cents integer not null check (total_amount_cents >= 0),
  offer_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id,offer_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('PED-' || lpad(nextval('public.order_number_seq')::text,8,'0')),
  user_id uuid not null references public.profiles(id) on delete restrict,
  cart_id uuid references public.carts(id) on delete set null,
  status public.order_status not null default 'pending',
  currency char(3) not null default 'BRL',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  coupon_code text,
  customer_snapshot jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.carts drop constraint if exists carts_converted_order_id_fkey;
alter table public.carts add constraint carts_converted_order_id_fkey foreign key (converted_order_id) references public.orders(id) on delete set null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  offer_id uuid not null references public.offers(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  product_name text not null,
  offer_name text not null,
  course_title text not null,
  quantity integer not null default 1 check (quantity = 1),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_amount_cents integer not null check (total_amount_cents >= 0),
  access_days integer,
  lifetime_access boolean not null default true,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (order_id,product_id)
);

alter table public.enrollments drop constraint if exists enrollments_order_item_id_fkey;
alter table public.enrollments add constraint enrollments_order_item_id_fkey foreign key (order_item_id) references public.order_items(id) on delete set null;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.payment_provider not null,
  idempotency_key text not null unique,
  provider_checkout_id text,
  checkout_url text,
  status public.payment_status not null default 'created',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  attempt_id uuid references public.payment_attempts(id) on delete set null,
  provider public.payment_provider not null,
  provider_payment_id text not null,
  status public.payment_status not null,
  payment_method text,
  installments integer,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'BRL',
  approved_at timestamptz,
  rejected_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider,provider_payment_id)
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  provider_refund_id text,
  amount_cents integer not null check (amount_cents > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null default false,
  payload jsonb not null,
  processing_status text not null default 'received' check (processing_status in ('received','processing','processed','ignored','failed')),
  attempts integer not null default 0,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider,provider_event_id)
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete restrict,
  discount_cents integer not null check (discount_cents >= 0),
  redeemed_at timestamptz not null default now()
);

create or replace function private.recalculate_cart(target_cart_id uuid)
returns public.carts
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare result public.carts; subtotal integer; discount integer := 0; coupon_record public.coupons;
begin
  select coalesce(sum(total_amount_cents),0) into subtotal from public.cart_items where cart_id = target_cart_id;
  select c.* into result from public.carts c where c.id = target_cart_id for update;
  if result.id is null then raise exception 'Cart not found'; end if;

  if result.coupon_id is not null then
    select * into coupon_record from public.coupons where id = result.coupon_id and is_active;
    if coupon_record.id is not null
       and (coupon_record.starts_at is null or coupon_record.starts_at <= now())
       and (coupon_record.ends_at is null or coupon_record.ends_at > now()) then
      discount := case coupon_record.discount_type
        when 'percent' then round(subtotal * coupon_record.discount_value / 100.0)
        else least(subtotal,coupon_record.discount_value)
      end;
    end if;
  end if;

  update public.carts set subtotal_cents = subtotal, discount_cents = discount,
    total_cents = greatest(subtotal-discount,0), updated_at = now()
  where id = target_cart_id returning * into result;
  return result;
end;
$$;

create or replace function public.add_offer_to_cart(target_offer_id uuid)
returns public.carts
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare target_cart public.carts; selected_offer record;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  select o.*,p.name product_name,p.course_id,c.title course_title
  into selected_offer
  from public.offers o
  join public.products p on p.id = o.product_id and p.status = 'active'
  join public.courses c on c.id = p.course_id and c.status = 'published'
  where o.id = target_offer_id and o.is_active
    and (o.starts_at is null or o.starts_at <= now())
    and (o.ends_at is null or o.ends_at > now());
  if selected_offer.id is null then raise exception 'Offer not available'; end if;

  select * into target_cart from public.carts
  where user_id = (select auth.uid()) and status = 'active' for update;
  if target_cart.id is null then
    insert into public.carts(user_id,currency)
    values ((select auth.uid()),selected_offer.currency)
    returning * into target_cart;
  end if;
  if target_cart.currency <> selected_offer.currency then raise exception 'Mixed currencies are not supported'; end if;

  insert into public.cart_items(cart_id,offer_id,unit_amount_cents,total_amount_cents,offer_snapshot)
  values (target_cart.id,selected_offer.id,selected_offer.amount_cents,selected_offer.amount_cents,
    jsonb_build_object('offer_id',selected_offer.id,'offer_name',selected_offer.name,'product_id',selected_offer.product_id,
      'product_name',selected_offer.product_name,'course_id',selected_offer.course_id,'course_title',selected_offer.course_title,
      'amount_cents',selected_offer.amount_cents,'currency',selected_offer.currency,'lifetime_access',selected_offer.lifetime_access,
      'access_days',selected_offer.access_days))
  on conflict (cart_id,offer_id) do update set updated_at = now();

  return private.recalculate_cart(target_cart.id);
end;
$$;

create or replace function public.remove_cart_item(target_cart_item_id uuid)
returns public.carts
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target_cart_id uuid;
begin
  delete from public.cart_items ci using public.carts c
  where ci.id = target_cart_item_id and c.id = ci.cart_id and c.user_id = (select auth.uid()) and c.status = 'active'
  returning ci.cart_id into target_cart_id;
  if target_cart_id is null then raise exception 'Cart item not found'; end if;
  return private.recalculate_cart(target_cart_id);
end;
$$;

create or replace function public.apply_coupon_to_cart(target_code text)
returns public.carts
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target_cart public.carts; selected_coupon public.coupons; user_uses integer;
begin
  select * into target_cart from public.carts where user_id = (select auth.uid()) and status = 'active' for update;
  if target_cart.id is null then raise exception 'Active cart not found'; end if;

  select * into selected_coupon from public.coupons
  where upper(code) = upper(trim(target_code)) and is_active
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
  if selected_coupon.id is null then raise exception 'Coupon is invalid or expired'; end if;
  if selected_coupon.max_redemptions is not null and selected_coupon.redeemed_count >= selected_coupon.max_redemptions then raise exception 'Coupon limit reached'; end if;
  select count(*) into user_uses from public.coupon_redemptions where coupon_id = selected_coupon.id and user_id = (select auth.uid());
  if user_uses >= selected_coupon.max_redemptions_per_user then raise exception 'Coupon already used'; end if;

  if exists (
    select 1 from public.coupon_products cp
    where cp.coupon_id = selected_coupon.id
  ) and not exists (
    select 1 from public.cart_items ci
    join public.offers o on o.id = ci.offer_id
    join public.coupon_products cp on cp.product_id = o.product_id and cp.coupon_id = selected_coupon.id
    where ci.cart_id = target_cart.id
  ) then raise exception 'Coupon does not apply to this cart'; end if;

  update public.carts set coupon_id = selected_coupon.id, updated_at = now() where id = target_cart.id;
  return private.recalculate_cart(target_cart.id);
end;
$$;

create or replace function public.create_order_from_cart(target_cart_id uuid)
returns public.orders
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare target_cart public.carts; created_order public.orders; profile_record public.profiles;
begin
  select * into target_cart from public.carts
  where id = target_cart_id and user_id = (select auth.uid()) and status = 'active' for update;
  if target_cart.id is null then raise exception 'Active cart not found'; end if;
  target_cart := private.recalculate_cart(target_cart.id);
  if target_cart.total_cents < 0 or not exists (select 1 from public.cart_items where cart_id = target_cart.id) then raise exception 'Cart is empty'; end if;
  select * into profile_record from public.profiles where id = (select auth.uid());

  insert into public.orders(user_id,cart_id,status,currency,subtotal_cents,discount_cents,total_cents,coupon_code,customer_snapshot)
  select target_cart.user_id,target_cart.id,'awaiting_payment',target_cart.currency,target_cart.subtotal_cents,target_cart.discount_cents,target_cart.total_cents,
    cp.code,jsonb_build_object('full_name',profile_record.full_name,'phone',profile_record.phone)
  from (select 1) seed left join public.coupons cp on cp.id = target_cart.coupon_id
  returning * into created_order;

  insert into public.order_items(order_id,product_id,offer_id,course_id,product_name,offer_name,course_title,unit_amount_cents,discount_cents,total_amount_cents,access_days,lifetime_access,snapshot)
  select created_order.id,p.id,o.id,p.course_id,p.name,o.name,c.title,ci.unit_amount_cents,
    case when target_cart.subtotal_cents > 0 then round(target_cart.discount_cents * ci.total_amount_cents::numeric / target_cart.subtotal_cents) else 0 end,
    greatest(ci.total_amount_cents - case when target_cart.subtotal_cents > 0 then round(target_cart.discount_cents * ci.total_amount_cents::numeric / target_cart.subtotal_cents) else 0 end,0),
    o.access_days,o.lifetime_access,ci.offer_snapshot
  from public.cart_items ci
  join public.offers o on o.id = ci.offer_id
  join public.products p on p.id = o.product_id
  join public.courses c on c.id = p.course_id
  where ci.cart_id = target_cart.id;

  update public.carts set status = 'converted',converted_order_id = created_order.id,updated_at = now() where id = target_cart.id;
  return created_order;
end;
$$;

create or replace function private.fulfill_approved_payment()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status <> 'approved' or (tg_op = 'UPDATE' and old.status = 'approved') then return new; end if;

  update public.orders set status = 'paid',paid_at = coalesce(new.approved_at,now()),updated_at = now()
  where id = new.order_id and status <> 'paid';

  insert into public.enrollments(user_id,course_id,order_item_id,status,enrolled_at,access_starts_at,access_expires_at)
  select o.user_id,oi.course_id,oi.id,'active',now(),now(),
    case when oi.lifetime_access then null else now() + make_interval(days => oi.access_days) end
  from public.orders o join public.order_items oi on oi.order_id = o.id
  where o.id = new.order_id
  on conflict (user_id,course_id) do update set
    order_item_id = excluded.order_item_id,status = 'active',access_starts_at = least(public.enrollments.access_starts_at,excluded.access_starts_at),
    access_expires_at = case when excluded.access_expires_at is null then null else greatest(public.enrollments.access_expires_at,excluded.access_expires_at) end,
    updated_at = now();

  return new;
end;
$$;

create or replace function private.apply_approved_refund()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare paid_total integer; refunded_total integer;
begin
  if new.status <> 'approved' or (tg_op = 'UPDATE' and old.status = 'approved') then return new; end if;
  select amount_cents into paid_total from public.payments where id = new.payment_id;
  select coalesce(sum(amount_cents),0) into refunded_total from public.refunds where payment_id = new.payment_id and status = 'approved';

  if refunded_total >= paid_total then
    update public.orders set status = 'refunded',updated_at = now() where id = new.order_id;
    update public.enrollments e set status = 'refunded',updated_at = now()
    from public.order_items oi where oi.order_id = new.order_id and e.order_item_id = oi.id;
    update public.payments set status = 'refunded',updated_at = now() where id = new.payment_id;
  else
    update public.orders set status = 'partially_refunded',updated_at = now() where id = new.order_id;
    update public.payments set status = 'partially_refunded',updated_at = now() where id = new.payment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_fulfill_order on public.payments;
create trigger payments_fulfill_order after insert or update of status on public.payments
for each row execute function private.fulfill_approved_payment();
drop trigger if exists refunds_apply_access on public.refunds;
create trigger refunds_apply_access after insert or update of status on public.refunds
for each row execute function private.apply_approved_refund();

do $$ declare table_name text;
begin
  foreach table_name in array array['products','offers','coupons','carts','cart_items','orders','payment_attempts','payments','refunds'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I',table_name,table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()',table_name,table_name);
  end loop;
end $$;

revoke all on function private.recalculate_cart(uuid) from public,anon,authenticated;
revoke all on function private.fulfill_approved_payment() from public,anon,authenticated;
revoke all on function private.apply_approved_refund() from public,anon,authenticated;
revoke all on function public.add_offer_to_cart(uuid) from public,anon;
revoke all on function public.remove_cart_item(uuid) from public,anon;
revoke all on function public.apply_coupon_to_cart(text) from public,anon;
revoke all on function public.create_order_from_cart(uuid) from public,anon;
grant execute on function public.add_offer_to_cart(uuid),public.remove_cart_item(uuid),public.apply_coupon_to_cart(text),public.create_order_from_cart(uuid) to authenticated;

alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_products enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy products_public_select on public.products for select to anon,authenticated using (status = 'active');
create policy products_manage on public.products for all to authenticated
using (private.can_manage_course(course_id)) with check (private.can_manage_course(course_id));
create policy offers_public_select on public.offers for select to anon,authenticated
using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy offers_manage on public.offers for all to authenticated
using (exists (select 1 from public.products p where p.id = product_id and private.can_manage_course(p.course_id)))
with check (exists (select 1 from public.products p where p.id = product_id and private.can_manage_course(p.course_id)));
create policy coupons_staff_manage on public.coupons for all to authenticated
using (private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]))
with check (private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]));
create policy coupon_products_staff_manage on public.coupon_products for all to authenticated
using (private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]))
with check (private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]));

create policy carts_own_select on public.carts for select to authenticated using (user_id = (select auth.uid()));
create policy cart_items_own_select on public.cart_items for select to authenticated
using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));
create policy orders_select on public.orders for select to authenticated
using (user_id = (select auth.uid()) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]) or exists (
  select 1 from public.order_items oi where oi.order_id = orders.id and private.can_manage_course(oi.course_id)
));
create policy order_items_select on public.order_items for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())) or private.can_manage_course(course_id) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]));
create policy payment_attempts_select on public.payment_attempts for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]))));
create policy payments_select on public.payments for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]))) or exists (
  select 1 from public.order_items oi where oi.order_id = payments.order_id and private.can_manage_course(oi.course_id)
));
create policy refunds_select on public.refunds for select to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]))) or exists (
  select 1 from public.order_items oi where oi.order_id = refunds.order_id and private.can_manage_course(oi.course_id)
));
create policy webhook_events_admin_select on public.webhook_events for select to authenticated
using (private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]));
create policy coupon_redemptions_select on public.coupon_redemptions for select to authenticated
using (user_id = (select auth.uid()) or private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]));

create index if not exists offers_product_active_idx on public.offers(product_id,is_active,starts_at,ends_at);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);
create index if not exists orders_user_created_idx on public.orders(user_id,created_at desc);
create index if not exists orders_status_created_idx on public.orders(status,created_at desc);
create index if not exists order_items_course_idx on public.order_items(course_id,order_id);
create index if not exists payments_order_status_idx on public.payments(order_id,status);
create index if not exists payment_attempts_order_idx on public.payment_attempts(order_id,created_at desc);
create index if not exists webhook_events_status_idx on public.webhook_events(processing_status,received_at);

grant select on public.products,public.offers to anon,authenticated;
grant select,insert,update,delete on public.products,public.offers,public.coupons,public.coupon_products to authenticated;
grant select on public.carts,public.cart_items,public.orders,public.order_items,public.payment_attempts,public.payments,public.refunds,public.coupon_redemptions to authenticated;

commit;
