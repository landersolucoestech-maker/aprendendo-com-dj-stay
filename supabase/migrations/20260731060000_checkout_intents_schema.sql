-- FASE B18: provider-neutral checkout intents. No payment confirmation or fulfillment occurs here.

create type public.checkout_subject_type as enum ('course', 'digital_product');
create type public.checkout_intent_status as enum (
  'prepared',
  'provider_creating',
  'checkout_created',
  'provider_failed',
  'expired',
  'cancelled'
);
create type public.checkout_intent_event_type as enum (
  'prepared',
  'provider_claimed',
  'provider_created',
  'provider_failed',
  'expired',
  'cancelled'
);

create table public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  subject_type public.checkout_subject_type not null,
  subject_id uuid not null,
  license_id uuid references public.digital_product_licenses(id) on delete restrict,
  status public.checkout_intent_status not null default 'prepared'::public.checkout_intent_status,
  provider text not null default 'asaas',
  provider_checkout_id text,
  provider_checkout_url text,
  provider_request_token uuid,
  provider_request_started_at timestamptz,
  amount_cents integer not null,
  currency_code text not null,
  title_snapshot text not null,
  item_snapshot jsonb not null,
  idempotency_key uuid not null,
  expires_at timestamptz,
  failure_code text,
  failure_reason text,
  version integer not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint checkout_intents_provider check (provider = 'asaas'),
  constraint checkout_intents_provider_checkout_id_length check (
    provider_checkout_id is null or char_length(provider_checkout_id) between 1 and 200
  ),
  constraint checkout_intents_provider_checkout_url_https check (
    provider_checkout_url is null or provider_checkout_url ~ '^https://'
  ),
  constraint checkout_intents_amount_positive check (amount_cents > 0),
  constraint checkout_intents_currency_brl check (currency_code = 'BRL'),
  constraint checkout_intents_title_length check (char_length(btrim(title_snapshot)) between 3 and 200),
  constraint checkout_intents_snapshot_object check (jsonb_typeof(item_snapshot) = 'object'),
  constraint checkout_intents_version_positive check (version > 0),
  constraint checkout_intents_failure_code_length check (
    failure_code is null or char_length(failure_code) between 1 and 100
  ),
  constraint checkout_intents_failure_reason_length check (
    failure_reason is null or char_length(failure_reason) between 1 and 1000
  ),
  constraint checkout_intents_subject_license_contract check (
    (subject_type = 'course'::public.checkout_subject_type and license_id is null)
    or (subject_type = 'digital_product'::public.checkout_subject_type and license_id is not null)
  ),
  constraint checkout_intents_provider_state_contract check (
    (
      status in ('prepared'::public.checkout_intent_status, 'provider_failed'::public.checkout_intent_status)
      and provider_checkout_id is null
      and provider_checkout_url is null
    )
    or (
      status = 'provider_creating'::public.checkout_intent_status
      and provider_request_token is not null
      and provider_request_started_at is not null
      and provider_checkout_id is null
      and provider_checkout_url is null
    )
    or (
      status = 'checkout_created'::public.checkout_intent_status
      and provider_checkout_id is not null
      and provider_checkout_url is not null
      and expires_at is not null
    )
    or status in ('expired'::public.checkout_intent_status, 'cancelled'::public.checkout_intent_status)
  )
);

create unique index checkout_intents_user_idempotency_uidx
  on public.checkout_intents (user_id, idempotency_key);
create unique index checkout_intents_provider_checkout_uidx
  on public.checkout_intents (provider, provider_checkout_id)
  where provider_checkout_id is not null;
create index checkout_intents_user_created_idx
  on public.checkout_intents (user_id, created_at desc);
create index checkout_intents_status_expiry_idx
  on public.checkout_intents (status, expires_at)
  where status in ('provider_creating'::public.checkout_intent_status, 'checkout_created'::public.checkout_intent_status);
create index checkout_intents_subject_idx
  on public.checkout_intents (subject_type, subject_id, created_at desc);
create index checkout_intents_license_idx
  on public.checkout_intents (license_id)
  where license_id is not null;

create table public.checkout_intent_events (
  id uuid primary key default gen_random_uuid(),
  checkout_intent_id uuid not null references public.checkout_intents(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.checkout_intent_event_type not null,
  from_status public.checkout_intent_status,
  to_status public.checkout_intent_status not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint checkout_intent_events_details_object check (jsonb_typeof(details) = 'object')
);

create index checkout_intent_events_intent_created_idx
  on public.checkout_intent_events (checkout_intent_id, created_at desc);
create index checkout_intent_events_actor_idx
  on public.checkout_intent_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

create trigger checkout_intents_set_updated_at
before update on public.checkout_intents
for each row execute function public.set_updated_at();

alter table public.checkout_intents enable row level security;
alter table public.checkout_intents force row level security;
alter table public.checkout_intent_events enable row level security;
alter table public.checkout_intent_events force row level security;

revoke all on table public.checkout_intents from public, anon, authenticated;
revoke all on table public.checkout_intent_events from public, anon, authenticated;
grant select on table public.checkout_intents to authenticated, service_role;
grant select on table public.checkout_intent_events to authenticated, service_role;
grant insert, update, delete on table public.checkout_intents to service_role;
grant insert, update, delete on table public.checkout_intent_events to service_role;

create policy checkout_intents_select
on public.checkout_intents
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy checkout_intent_events_select
on public.checkout_intent_events
for select
to authenticated
using (
  exists (
    select 1
    from public.checkout_intents i
    where i.id = checkout_intent_events.checkout_intent_id
      and (
        i.user_id = (select auth.uid())
        or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
      )
  )
);
