-- FASE B18: pedido, tentativa e eventos de pagamento. Fulfillment permanece reservado à B19.

create type public.payment_order_status as enum (
  'checkout_pending',
  'payment_pending',
  'paid',
  'cancelled',
  'expired',
  'refund_pending',
  'refunded',
  'chargeback_pending',
  'chargeback_won',
  'chargeback_lost'
);

create type public.payment_attempt_status as enum (
  'checkout_created',
  'pending',
  'confirmed',
  'received',
  'failed',
  'expired',
  'cancelled',
  'refund_pending',
  'refunded',
  'chargeback_pending',
  'chargeback_dispute',
  'chargeback_won',
  'chargeback_lost'
);

create type public.payment_billing_type as enum (
  'unknown',
  'pix',
  'credit_card'
);

create type public.payment_provider_event_status as enum (
  'received',
  'processed',
  'ignored',
  'failed'
);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  checkout_intent_id uuid not null unique references public.checkout_intents(id) on delete restrict,
  subject_type public.checkout_subject_type not null,
  subject_id uuid not null,
  license_id uuid references public.digital_product_licenses(id) on delete restrict,
  status public.payment_order_status not null default 'checkout_pending'::public.payment_order_status,
  amount_cents integer not null,
  currency_code text not null,
  title_snapshot text not null,
  item_snapshot jsonb not null,
  payment_confirmed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint payment_orders_amount_positive check (amount_cents > 0),
  constraint payment_orders_currency_brl check (currency_code = 'BRL'),
  constraint payment_orders_title_length check (char_length(btrim(title_snapshot)) between 3 and 200),
  constraint payment_orders_snapshot_object check (jsonb_typeof(item_snapshot) = 'object'),
  constraint payment_orders_version_positive check (version > 0),
  constraint payment_orders_subject_license_contract check (
    (subject_type = 'course'::public.checkout_subject_type and license_id is null)
    or (subject_type = 'digital_product'::public.checkout_subject_type and license_id is not null)
  )
);

create index payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);
create index payment_orders_status_created_idx
  on public.payment_orders (status, created_at desc);
create index payment_orders_subject_idx
  on public.payment_orders (subject_type, subject_id, created_at desc);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders(id) on delete restrict,
  checkout_intent_id uuid not null unique references public.checkout_intents(id) on delete restrict,
  provider text not null default 'asaas',
  provider_checkout_id text not null,
  provider_payment_id text,
  status public.payment_attempt_status not null default 'checkout_created'::public.payment_attempt_status,
  billing_type public.payment_billing_type not null default 'unknown'::public.payment_billing_type,
  amount_cents integer not null,
  currency_code text not null,
  provider_status text,
  last_provider_event_id text,
  last_provider_event_at timestamptz,
  confirmed_at timestamptz,
  received_at timestamptz,
  failure_code text,
  version integer not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint payment_attempts_provider check (provider = 'asaas'),
  constraint payment_attempts_provider_checkout_id_length check (
    char_length(provider_checkout_id) between 1 and 200
  ),
  constraint payment_attempts_provider_payment_id_length check (
    provider_payment_id is null or char_length(provider_payment_id) between 1 and 200
  ),
  constraint payment_attempts_amount_positive check (amount_cents > 0),
  constraint payment_attempts_currency_brl check (currency_code = 'BRL'),
  constraint payment_attempts_provider_status_length check (
    provider_status is null or char_length(provider_status) between 1 and 100
  ),
  constraint payment_attempts_event_id_length check (
    last_provider_event_id is null or char_length(last_provider_event_id) between 1 and 200
  ),
  constraint payment_attempts_failure_code_length check (
    failure_code is null or char_length(failure_code) between 1 and 100
  ),
  constraint payment_attempts_version_positive check (version > 0)
);

create unique index payment_attempts_provider_checkout_uidx
  on public.payment_attempts (provider, provider_checkout_id);
create unique index payment_attempts_provider_payment_uidx
  on public.payment_attempts (provider, provider_payment_id)
  where provider_payment_id is not null;
create index payment_attempts_order_created_idx
  on public.payment_attempts (order_id, created_at desc);
create index payment_attempts_status_created_idx
  on public.payment_attempts (status, created_at desc);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'asaas',
  provider_event_id text not null,
  event_type text not null,
  provider_payment_id text,
  external_reference text,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  status public.payment_provider_event_status not null default 'received'::public.payment_provider_event_status,
  payload jsonb not null,
  error_code text,
  received_at timestamptz not null default statement_timestamp(),
  processed_at timestamptz,
  constraint payment_provider_events_provider check (provider = 'asaas'),
  constraint payment_provider_events_event_id_length check (
    char_length(provider_event_id) between 1 and 200
  ),
  constraint payment_provider_events_event_type_length check (
    char_length(event_type) between 1 and 100
  ),
  constraint payment_provider_events_payment_id_length check (
    provider_payment_id is null or char_length(provider_payment_id) between 1 and 200
  ),
  constraint payment_provider_events_external_reference_length check (
    external_reference is null or char_length(external_reference) between 1 and 200
  ),
  constraint payment_provider_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint payment_provider_events_error_code_length check (
    error_code is null or char_length(error_code) between 1 and 100
  )
);

create unique index payment_provider_events_provider_event_uidx
  on public.payment_provider_events (provider, provider_event_id);
create index payment_provider_events_attempt_received_idx
  on public.payment_provider_events (payment_attempt_id, received_at desc)
  where payment_attempt_id is not null;
create index payment_provider_events_status_received_idx
  on public.payment_provider_events (status, received_at);

create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function public.set_updated_at();

create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

alter table public.payment_orders enable row level security;
alter table public.payment_orders force row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_attempts force row level security;
alter table public.payment_provider_events enable row level security;
alter table public.payment_provider_events force row level security;

revoke all on table public.payment_orders from public, anon, authenticated;
revoke all on table public.payment_attempts from public, anon, authenticated;
revoke all on table public.payment_provider_events from public, anon, authenticated;

grant select on table public.payment_orders to authenticated, service_role;
grant select on table public.payment_attempts to authenticated, service_role;
grant select on table public.payment_provider_events to authenticated, service_role;
grant insert, update, delete on table public.payment_orders to service_role;
grant insert, update, delete on table public.payment_attempts to service_role;
grant insert, update, delete on table public.payment_provider_events to service_role;

create policy payment_orders_select
on public.payment_orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy payment_attempts_select
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.payment_orders o
    where o.id = payment_attempts.order_id
      and (
        o.user_id = (select auth.uid())
        or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
      )
  )
);

create policy payment_provider_events_admin_select
on public.payment_provider_events
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);
