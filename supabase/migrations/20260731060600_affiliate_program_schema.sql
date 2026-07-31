-- FASE B20: programa de afiliados first-party, atribuição e pagamento manual auditado.

create type public.affiliate_profile_status as enum (
  'pending',
  'active',
  'suspended'
);

create type public.affiliate_link_status as enum (
  'active',
  'inactive'
);

create type public.affiliate_attribution_status as enum (
  'active',
  'converted',
  'expired',
  'invalidated'
);

create type public.affiliate_commission_status as enum (
  'pending',
  'held',
  'available',
  'reversed',
  'paid'
);

create type public.affiliate_payout_status as enum (
  'draft',
  'paid',
  'cancelled'
);

create type public.affiliate_event_type as enum (
  'profile_created',
  'profile_activated',
  'profile_suspended',
  'terms_configured',
  'link_created',
  'link_deactivated',
  'click_recorded',
  'attribution_created',
  'attribution_replaced',
  'conversion_created',
  'commission_held',
  'commission_available',
  'commission_reversed',
  'commission_restored',
  'payout_created',
  'payout_paid',
  'payout_cancelled'
);

create table public.affiliate_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  code text not null,
  status public.affiliate_profile_status not null default 'pending'::public.affiliate_profile_status,
  display_name text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  activated_by_user_id uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint affiliate_profiles_code_format check (code ~ '^[a-z0-9]{8,32}$'),
  constraint affiliate_profiles_display_name_length check (
    display_name is null or char_length(btrim(display_name)) between 2 and 120
  ),
  constraint affiliate_profiles_status_contract check (
    (
      status = 'pending'::public.affiliate_profile_status
      and activated_at is null
      and suspended_at is null
      and suspension_reason is null
    )
    or (
      status = 'active'::public.affiliate_profile_status
      and activated_at is not null
      and suspended_at is null
      and suspension_reason is null
    )
    or (
      status = 'suspended'::public.affiliate_profile_status
      and activated_at is not null
      and suspended_at is not null
      and suspension_reason is not null
    )
  ),
  constraint affiliate_profiles_suspension_reason_length check (
    suspension_reason is null or char_length(btrim(suspension_reason)) between 3 and 1000
  )
);

create unique index affiliate_profiles_code_uidx
  on public.affiliate_profiles (code);
create index affiliate_profiles_status_created_idx
  on public.affiliate_profiles (status, created_at desc);

create table public.affiliate_subject_terms (
  id uuid primary key default gen_random_uuid(),
  subject_type public.checkout_subject_type not null,
  subject_id uuid not null,
  commission_bps integer not null,
  attribution_window_days integer not null,
  active boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint affiliate_subject_terms_commission_range check (
    commission_bps between 1 and 10000
  ),
  constraint affiliate_subject_terms_window_range check (
    attribution_window_days between 1 and 365
  ),
  unique (subject_type, subject_id)
);

create index affiliate_subject_terms_active_subject_idx
  on public.affiliate_subject_terms (active, subject_type, subject_id);

create table public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete restrict,
  subject_type public.checkout_subject_type not null,
  subject_id uuid not null,
  code text not null,
  status public.affiliate_link_status not null default 'active'::public.affiliate_link_status,
  destination_path text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  deactivated_at timestamptz,
  constraint affiliate_links_code_format check (code ~ '^[a-z0-9]{12,32}$'),
  constraint affiliate_links_destination_path check (
    destination_path ~ '^/[A-Za-z0-9/_?&=.-]{1,500}$'
    and destination_path !~ '^//'
  ),
  constraint affiliate_links_status_contract check (
    (status = 'active'::public.affiliate_link_status and deactivated_at is null)
    or (status = 'inactive'::public.affiliate_link_status and deactivated_at is not null)
  )
);

create unique index affiliate_links_code_uidx
  on public.affiliate_links (code);
create unique index affiliate_links_one_active_subject_uidx
  on public.affiliate_links (affiliate_user_id, subject_type, subject_id)
  where status = 'active'::public.affiliate_link_status;
create index affiliate_links_affiliate_status_idx
  on public.affiliate_links (affiliate_user_id, status, created_at desc);
create index affiliate_links_subject_status_idx
  on public.affiliate_links (subject_type, subject_id, status);

create table public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.affiliate_links(id) on delete restrict,
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete restrict,
  visitor_token_hash text not null,
  landing_path text not null,
  referrer_origin text,
  user_agent_hash text,
  clicked_at timestamptz not null default statement_timestamp(),
  constraint affiliate_clicks_visitor_hash_format check (visitor_token_hash ~ '^[0-9a-f]{64}$'),
  constraint affiliate_clicks_landing_path check (
    landing_path ~ '^/[A-Za-z0-9/_?&=.-]{1,500}$'
    and landing_path !~ '^//'
  ),
  constraint affiliate_clicks_referrer_origin_length check (
    referrer_origin is null or char_length(referrer_origin) between 3 and 300
  ),
  constraint affiliate_clicks_user_agent_hash_format check (
    user_agent_hash is null or user_agent_hash ~ '^[0-9a-f]{64}$'
  )
);

create index affiliate_clicks_link_clicked_idx
  on public.affiliate_clicks (link_id, clicked_at desc);
create index affiliate_clicks_affiliate_clicked_idx
  on public.affiliate_clicks (affiliate_user_id, clicked_at desc);
create index affiliate_clicks_visitor_clicked_idx
  on public.affiliate_clicks (visitor_token_hash, clicked_at desc);

create table public.affiliate_attributions (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete restrict,
  link_id uuid not null references public.affiliate_links(id) on delete restrict,
  click_id uuid not null references public.affiliate_clicks(id) on delete restrict,
  subject_type public.checkout_subject_type not null,
  subject_id uuid not null,
  visitor_token_hash text not null,
  status public.affiliate_attribution_status not null default 'active'::public.affiliate_attribution_status,
  attributed_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  converted_order_id uuid unique references public.payment_orders(id) on delete restrict,
  converted_at timestamptz,
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint affiliate_attributions_visitor_hash_format check (visitor_token_hash ~ '^[0-9a-f]{64}$'),
  constraint affiliate_attributions_expiration check (expires_at > attributed_at),
  constraint affiliate_attributions_status_contract check (
    (
      status = 'active'::public.affiliate_attribution_status
      and converted_order_id is null
      and converted_at is null
      and invalidated_at is null
      and invalidation_reason is null
    )
    or (
      status = 'converted'::public.affiliate_attribution_status
      and converted_order_id is not null
      and converted_at is not null
      and invalidated_at is null
      and invalidation_reason is null
    )
    or (
      status in (
        'expired'::public.affiliate_attribution_status,
        'invalidated'::public.affiliate_attribution_status
      )
      and converted_order_id is null
      and converted_at is null
      and invalidated_at is not null
      and invalidation_reason is not null
    )
  ),
  constraint affiliate_attributions_invalidation_reason_length check (
    invalidation_reason is null or char_length(btrim(invalidation_reason)) between 3 and 1000
  )
);

create unique index affiliate_attributions_active_visitor_subject_uidx
  on public.affiliate_attributions (visitor_token_hash, subject_type, subject_id)
  where status = 'active'::public.affiliate_attribution_status;
create index affiliate_attributions_affiliate_status_idx
  on public.affiliate_attributions (affiliate_user_id, status, attributed_at desc);
create index affiliate_attributions_expiration_idx
  on public.affiliate_attributions (status, expires_at)
  where status = 'active'::public.affiliate_attribution_status;
create index affiliate_attributions_link_idx
  on public.affiliate_attributions (link_id, attributed_at desc);
create index affiliate_attributions_click_idx
  on public.affiliate_attributions (click_id);

alter table public.checkout_intents
  add column affiliate_attribution_id uuid references public.affiliate_attributions(id) on delete restrict;

alter table public.payment_orders
  add column affiliate_attribution_id uuid references public.affiliate_attributions(id) on delete restrict;

create index checkout_intents_affiliate_attribution_idx
  on public.checkout_intents (affiliate_attribution_id)
  where affiliate_attribution_id is not null;
create index payment_orders_affiliate_attribution_idx
  on public.payment_orders (affiliate_attribution_id)
  where affiliate_attribution_id is not null;

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  attribution_id uuid not null unique references public.affiliate_attributions(id) on delete restrict,
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete restrict,
  link_id uuid not null references public.affiliate_links(id) on delete restrict,
  basis_amount_cents integer not null,
  commission_bps integer not null,
  commission_amount_cents integer not null,
  currency_code text not null,
  status public.affiliate_commission_status not null default 'pending'::public.affiliate_commission_status,
  available_at timestamptz,
  held_at timestamptz,
  reversed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint affiliate_commissions_basis_positive check (basis_amount_cents > 0),
  constraint affiliate_commissions_bps_range check (commission_bps between 1 and 10000),
  constraint affiliate_commissions_amount_positive check (
    commission_amount_cents > 0 and commission_amount_cents <= basis_amount_cents
  ),
  constraint affiliate_commissions_currency_brl check (currency_code = 'BRL'),
  constraint affiliate_commissions_status_contract check (
    (status = 'pending'::public.affiliate_commission_status and available_at is null and held_at is null and reversed_at is null and paid_at is null)
    or (status = 'held'::public.affiliate_commission_status and held_at is not null and reversed_at is null and paid_at is null)
    or (status = 'available'::public.affiliate_commission_status and available_at is not null and held_at is null and reversed_at is null and paid_at is null)
    or (status = 'reversed'::public.affiliate_commission_status and reversed_at is not null and paid_at is null)
    or (status = 'paid'::public.affiliate_commission_status and available_at is not null and paid_at is not null and reversed_at is null)
  )
);

create index affiliate_commissions_affiliate_status_idx
  on public.affiliate_commissions (affiliate_user_id, status, created_at desc);
create index affiliate_commissions_link_created_idx
  on public.affiliate_commissions (link_id, created_at desc);

create table public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid not null references public.affiliate_profiles(user_id) on delete restrict,
  status public.affiliate_payout_status not null default 'draft'::public.affiliate_payout_status,
  amount_cents integer not null,
  currency_code text not null,
  external_reference text,
  notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  paid_by_user_id uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint affiliate_payouts_amount_positive check (amount_cents > 0),
  constraint affiliate_payouts_currency_brl check (currency_code = 'BRL'),
  constraint affiliate_payouts_reference_length check (
    external_reference is null or char_length(btrim(external_reference)) between 3 and 200
  ),
  constraint affiliate_payouts_notes_length check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint affiliate_payouts_status_contract check (
    (status = 'draft'::public.affiliate_payout_status and paid_at is null and cancelled_at is null and cancellation_reason is null)
    or (status = 'paid'::public.affiliate_payout_status and paid_at is not null and paid_by_user_id is not null and external_reference is not null and cancelled_at is null and cancellation_reason is null)
    or (status = 'cancelled'::public.affiliate_payout_status and paid_at is null and cancelled_at is not null and cancellation_reason is not null)
  ),
  constraint affiliate_payouts_cancellation_reason_length check (
    cancellation_reason is null or char_length(btrim(cancellation_reason)) between 3 and 1000
  )
);

create index affiliate_payouts_affiliate_status_idx
  on public.affiliate_payouts (affiliate_user_id, status, created_at desc);

create table public.affiliate_payout_items (
  payout_id uuid not null references public.affiliate_payouts(id) on delete restrict,
  commission_id uuid not null unique references public.affiliate_commissions(id) on delete restrict,
  amount_cents integer not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (payout_id, commission_id),
  constraint affiliate_payout_items_amount_positive check (amount_cents > 0)
);

create index affiliate_payout_items_commission_idx
  on public.affiliate_payout_items (commission_id);

create table public.affiliate_events (
  id uuid primary key default gen_random_uuid(),
  affiliate_user_id uuid references public.affiliate_profiles(user_id) on delete restrict,
  event_type public.affiliate_event_type not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  profile_user_id uuid references public.affiliate_profiles(user_id) on delete restrict,
  link_id uuid references public.affiliate_links(id) on delete restrict,
  attribution_id uuid references public.affiliate_attributions(id) on delete restrict,
  commission_id uuid references public.affiliate_commissions(id) on delete restrict,
  payout_id uuid references public.affiliate_payouts(id) on delete restrict,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint affiliate_events_details_object check (jsonb_typeof(details) = 'object')
);

create index affiliate_events_affiliate_created_idx
  on public.affiliate_events (affiliate_user_id, created_at desc);
create index affiliate_events_link_idx
  on public.affiliate_events (link_id)
  where link_id is not null;
create index affiliate_events_attribution_idx
  on public.affiliate_events (attribution_id)
  where attribution_id is not null;
create index affiliate_events_commission_idx
  on public.affiliate_events (commission_id)
  where commission_id is not null;
create index affiliate_events_payout_idx
  on public.affiliate_events (payout_id)
  where payout_id is not null;

create trigger affiliate_profiles_set_updated_at
before update on public.affiliate_profiles
for each row execute function public.set_updated_at();
create trigger affiliate_subject_terms_set_updated_at
before update on public.affiliate_subject_terms
for each row execute function public.set_updated_at();
create trigger affiliate_links_set_updated_at
before update on public.affiliate_links
for each row execute function public.set_updated_at();
create trigger affiliate_attributions_set_updated_at
before update on public.affiliate_attributions
for each row execute function public.set_updated_at();
create trigger affiliate_commissions_set_updated_at
before update on public.affiliate_commissions
for each row execute function public.set_updated_at();
create trigger affiliate_payouts_set_updated_at
before update on public.affiliate_payouts
for each row execute function public.set_updated_at();

alter table public.affiliate_profiles enable row level security;
alter table public.affiliate_profiles force row level security;
alter table public.affiliate_subject_terms enable row level security;
alter table public.affiliate_subject_terms force row level security;
alter table public.affiliate_links enable row level security;
alter table public.affiliate_links force row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_clicks force row level security;
alter table public.affiliate_attributions enable row level security;
alter table public.affiliate_attributions force row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_commissions force row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.affiliate_payouts force row level security;
alter table public.affiliate_payout_items enable row level security;
alter table public.affiliate_payout_items force row level security;
alter table public.affiliate_events enable row level security;
alter table public.affiliate_events force row level security;

revoke all on table public.affiliate_profiles from public, anon, authenticated;
revoke all on table public.affiliate_subject_terms from public, anon, authenticated;
revoke all on table public.affiliate_links from public, anon, authenticated;
revoke all on table public.affiliate_clicks from public, anon, authenticated;
revoke all on table public.affiliate_attributions from public, anon, authenticated;
revoke all on table public.affiliate_commissions from public, anon, authenticated;
revoke all on table public.affiliate_payouts from public, anon, authenticated;
revoke all on table public.affiliate_payout_items from public, anon, authenticated;
revoke all on table public.affiliate_events from public, anon, authenticated;

grant select on table public.affiliate_profiles to authenticated, service_role;
grant select on table public.affiliate_subject_terms to authenticated, service_role;
grant select on table public.affiliate_links to authenticated, service_role;
grant select on table public.affiliate_clicks to authenticated, service_role;
grant select on table public.affiliate_attributions to authenticated, service_role;
grant select on table public.affiliate_commissions to authenticated, service_role;
grant select on table public.affiliate_payouts to authenticated, service_role;
grant select on table public.affiliate_payout_items to authenticated, service_role;
grant select on table public.affiliate_events to authenticated, service_role;

grant insert, update, delete on table public.affiliate_profiles to service_role;
grant insert, update, delete on table public.affiliate_subject_terms to service_role;
grant insert, update, delete on table public.affiliate_links to service_role;
grant insert, update, delete on table public.affiliate_clicks to service_role;
grant insert, update, delete on table public.affiliate_attributions to service_role;
grant insert, update, delete on table public.affiliate_commissions to service_role;
grant insert, update, delete on table public.affiliate_payouts to service_role;
grant insert, update, delete on table public.affiliate_payout_items to service_role;
grant insert, update, delete on table public.affiliate_events to service_role;

create policy affiliate_profiles_select
on public.affiliate_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_subject_terms_select
on public.affiliate_subject_terms for select to authenticated
using (
  active
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_links_select
on public.affiliate_links for select to authenticated
using (
  affiliate_user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_clicks_select
on public.affiliate_clicks for select to authenticated
using (
  affiliate_user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_attributions_select
on public.affiliate_attributions for select to authenticated
using (
  affiliate_user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_commissions_select
on public.affiliate_commissions for select to authenticated
using (
  affiliate_user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_payouts_select
on public.affiliate_payouts for select to authenticated
using (
  affiliate_user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy affiliate_payout_items_select
on public.affiliate_payout_items for select to authenticated
using (
  exists (
    select 1 from public.affiliate_payouts payout
    where payout.id = affiliate_payout_items.payout_id
      and (
        payout.affiliate_user_id = (select auth.uid())
        or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
      )
  )
);

create policy affiliate_events_select
on public.affiliate_events for select to authenticated
using (
  affiliate_user_id = (select auth.uid())
  or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);
