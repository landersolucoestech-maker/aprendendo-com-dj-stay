-- FASE B19: vínculo imutável entre pedido pago, acesso concedido e ajustes financeiros.

alter table public.digital_product_accesses
  add column suspended_at timestamptz,
  add column suspension_reason text;

alter table public.digital_product_accesses
  drop constraint digital_product_accesses_status_contract;

alter table public.digital_product_accesses
  add constraint digital_product_accesses_status_contract check (
    (
      status = 'active'::public.digital_product_access_status
      and suspended_at is null
      and suspension_reason is null
      and revoked_at is null
      and revocation_reason is null
    )
    or (
      status = 'suspended'::public.digital_product_access_status
      and suspended_at is not null
      and suspension_reason is not null
      and revoked_at is null
      and revocation_reason is null
    )
    or (
      status = 'revoked'::public.digital_product_access_status
      and revoked_at is not null
      and revocation_reason is not null
    )
  );

alter table public.digital_product_accesses
  add constraint digital_product_accesses_suspension_reason_length check (
    suspension_reason is null
    or char_length(suspension_reason) between 3 and 1000
  );

create type public.payment_entitlement_status as enum (
  'active',
  'suspended',
  'revoked'
);

create type public.payment_entitlement_event_type as enum (
  'granted',
  'suspended',
  'revoked',
  'restored',
  'unchanged'
);

create type public.commission_adjustment_kind as enum (
  'accrue',
  'hold',
  'reverse',
  'restore'
);

create table public.payment_entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  subject_type public.checkout_subject_type not null,
  subject_id uuid not null,
  enrollment_id uuid references public.enrollments(id) on delete restrict,
  digital_product_access_id uuid references public.digital_product_accesses(id) on delete restrict,
  controls_access boolean not null default true,
  status public.payment_entitlement_status not null default 'active'::public.payment_entitlement_status,
  granted_at timestamptz not null default statement_timestamp(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint payment_entitlements_subject_link check (
    (
      subject_type = 'course'::public.checkout_subject_type
      and enrollment_id is not null
      and digital_product_access_id is null
    )
    or (
      subject_type = 'digital_product'::public.checkout_subject_type
      and enrollment_id is null
      and digital_product_access_id is not null
    )
  ),
  constraint payment_entitlements_status_contract check (
    (
      status = 'active'::public.payment_entitlement_status
      and suspended_at is null
      and revoked_at is null
    )
    or (
      status = 'suspended'::public.payment_entitlement_status
      and suspended_at is not null
      and revoked_at is null
    )
    or (
      status = 'revoked'::public.payment_entitlement_status
      and revoked_at is not null
    )
  )
);

create index payment_entitlements_user_status_idx
  on public.payment_entitlements (user_id, status, created_at desc);
create index payment_entitlements_subject_idx
  on public.payment_entitlements (subject_type, subject_id, status);
create index payment_entitlements_enrollment_idx
  on public.payment_entitlements (enrollment_id)
  where enrollment_id is not null;
create index payment_entitlements_product_access_idx
  on public.payment_entitlements (digital_product_access_id)
  where digital_product_access_id is not null;

create table public.payment_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.payment_entitlements(id) on delete restrict,
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_provider_event_id uuid references public.payment_provider_events(id) on delete restrict,
  event_type public.payment_entitlement_event_type not null,
  from_status public.payment_entitlement_status,
  to_status public.payment_entitlement_status not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint payment_entitlement_events_details_object check (jsonb_typeof(details) = 'object')
);

create unique index payment_entitlement_events_provider_uidx
  on public.payment_entitlement_events (
    entitlement_id,
    payment_provider_event_id,
    event_type
  )
  where payment_provider_event_id is not null;
create index payment_entitlement_events_order_created_idx
  on public.payment_entitlement_events (order_id, created_at desc);
create index payment_entitlement_events_provider_event_idx
  on public.payment_entitlement_events (payment_provider_event_id)
  where payment_provider_event_id is not null;

create table public.commission_adjustment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  payment_provider_event_id uuid references public.payment_provider_events(id) on delete restrict,
  kind public.commission_adjustment_kind not null,
  basis_amount_cents integer not null,
  currency_code text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint commission_adjustment_events_basis_positive check (basis_amount_cents > 0),
  constraint commission_adjustment_events_currency_brl check (currency_code = 'BRL'),
  constraint commission_adjustment_events_details_object check (jsonb_typeof(details) = 'object')
);

create unique index commission_adjustment_events_provider_uidx
  on public.commission_adjustment_events (
    order_id,
    payment_provider_event_id,
    kind
  )
  where payment_provider_event_id is not null;
create index commission_adjustment_events_order_created_idx
  on public.commission_adjustment_events (order_id, created_at desc);
create index commission_adjustment_events_provider_event_idx
  on public.commission_adjustment_events (payment_provider_event_id)
  where payment_provider_event_id is not null;

create or replace function private.freeze_payment_entitlement_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_id <> old.order_id
     or new.user_id <> old.user_id
     or new.subject_type <> old.subject_type
     or new.subject_id <> old.subject_id
     or new.enrollment_id is distinct from old.enrollment_id
     or new.digital_product_access_id is distinct from old.digital_product_access_id
     or new.controls_access <> old.controls_access
     or new.granted_at <> old.granted_at
     or new.created_at <> old.created_at then
    raise exception 'PAYMENT_ENTITLEMENT_IDENTITY_IMMUTABLE' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger payment_entitlements_freeze_identity
before update on public.payment_entitlements
for each row execute function private.freeze_payment_entitlement_identity();

create trigger payment_entitlements_set_updated_at
before update on public.payment_entitlements
for each row execute function public.set_updated_at();

alter table public.payment_entitlements enable row level security;
alter table public.payment_entitlements force row level security;
alter table public.payment_entitlement_events enable row level security;
alter table public.payment_entitlement_events force row level security;
alter table public.commission_adjustment_events enable row level security;
alter table public.commission_adjustment_events force row level security;

revoke all on table public.payment_entitlements from public, anon, authenticated;
revoke all on table public.payment_entitlement_events from public, anon, authenticated;
revoke all on table public.commission_adjustment_events from public, anon, authenticated;

grant select on table public.payment_entitlements to authenticated, service_role;
grant select on table public.payment_entitlement_events to authenticated, service_role;
grant select on table public.commission_adjustment_events to authenticated, service_role;
grant insert, update, delete on table public.payment_entitlements to service_role;
grant insert, update, delete on table public.payment_entitlement_events to service_role;
grant insert, update, delete on table public.commission_adjustment_events to service_role;

create policy payment_entitlements_select
on public.payment_entitlements
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy payment_entitlement_events_select
on public.payment_entitlement_events
for select
to authenticated
using (
  exists (
    select 1
    from public.payment_entitlements entitlement
    where entitlement.id = payment_entitlement_events.entitlement_id
      and (
        entitlement.user_id = (select auth.uid())
        or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
      )
  )
);

create policy commission_adjustment_events_admin_select
on public.commission_adjustment_events
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

revoke all on function private.freeze_payment_entitlement_identity() from public, anon, authenticated;
