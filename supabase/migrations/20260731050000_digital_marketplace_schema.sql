-- FASE B16: canonical marketplace entities, licenses, deliverables and access history.

create type public.digital_product_status as enum ('draft', 'published', 'archived');
create type public.digital_license_status as enum ('draft', 'published', 'archived');
create type public.digital_license_kind as enum ('personal', 'commercial', 'extended', 'custom');
create type public.digital_product_access_status as enum ('active', 'revoked');
create type public.digital_product_access_source as enum ('manual_grant', 'complimentary', 'purchase');
create type public.digital_product_event_type as enum (
  'created',
  'updated',
  'published',
  'unpublished',
  'archived',
  'deleted',
  'deliverable_attached',
  'deliverable_updated',
  'deliverable_removed',
  'license_created',
  'license_published',
  'license_archived',
  'access_granted',
  'access_revoked'
);

create table public.digital_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  short_description text,
  description text,
  category text,
  status public.digital_product_status not null default 'draft'::public.digital_product_status,
  cover_asset_id uuid references public.assets(id) on delete set null,
  thumbnail_asset_id uuid references public.assets(id) on delete set null,
  price_amount numeric(12,2) not null default 0,
  currency_code text not null default 'BRL',
  promotional_price_amount numeric(12,2),
  promotion_starts_at timestamptz,
  promotion_ends_at timestamptz,
  availability_starts_at timestamptz,
  availability_ends_at timestamptz,
  affiliate_eligible boolean not null default false,
  version integer not null default 1,
  created_by_user_id uuid references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  unpublished_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint digital_products_title_length check (char_length(btrim(title)) between 3 and 200),
  constraint digital_products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 3 and 160),
  constraint digital_products_short_description_length check (short_description is null or char_length(short_description) between 1 and 500),
  constraint digital_products_description_length check (description is null or char_length(description) between 1 and 20000),
  constraint digital_products_category_length check (category is null or char_length(category) between 1 and 120),
  constraint digital_products_price_nonnegative check (price_amount >= 0),
  constraint digital_products_currency_code check (currency_code ~ '^[A-Z]{3}$'),
  constraint digital_products_promotional_price check (
    promotional_price_amount is null
    or (promotional_price_amount >= 0 and promotional_price_amount < price_amount)
  ),
  constraint digital_products_promotion_window check (
    promotion_starts_at is null or promotion_ends_at is null or promotion_ends_at > promotion_starts_at
  ),
  constraint digital_products_availability_window check (
    availability_starts_at is null or availability_ends_at is null or availability_ends_at > availability_starts_at
  ),
  constraint digital_products_version_positive check (version > 0),
  constraint digital_products_deleted_archived check (
    deleted_at is null or status = 'archived'::public.digital_product_status
  )
);

create unique index digital_products_slug_uidx
  on public.digital_products (lower(slug))
  where deleted_at is null;

create table public.digital_product_licenses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.digital_products(id) on delete cascade,
  kind public.digital_license_kind not null,
  title text not null,
  summary text,
  terms_text text not null,
  version integer not null,
  status public.digital_license_status not null default 'draft'::public.digital_license_status,
  is_default boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  archived_at timestamptz,
  constraint digital_product_licenses_title_length check (char_length(btrim(title)) between 3 and 200),
  constraint digital_product_licenses_summary_length check (summary is null or char_length(summary) between 1 and 1000),
  constraint digital_product_licenses_terms_length check (char_length(btrim(terms_text)) between 20 and 50000),
  constraint digital_product_licenses_version_positive check (version > 0),
  unique (product_id, kind, version)
);

create unique index digital_product_licenses_one_published_kind_uidx
  on public.digital_product_licenses (product_id, kind)
  where status = 'published'::public.digital_license_status;

create unique index digital_product_licenses_one_default_uidx
  on public.digital_product_licenses (product_id)
  where status = 'published'::public.digital_license_status and is_default;

create table public.digital_product_deliverables (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.digital_products(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  title text not null,
  description text,
  position integer not null default 0,
  required boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  deleted_at timestamptz,
  constraint digital_product_deliverables_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint digital_product_deliverables_description_length check (description is null or char_length(description) between 1 and 2000),
  constraint digital_product_deliverables_position_nonnegative check (position >= 0)
);

create unique index digital_product_deliverables_asset_uidx
  on public.digital_product_deliverables (product_id, asset_id)
  where deleted_at is null;

create unique index digital_product_deliverables_position_uidx
  on public.digital_product_deliverables (product_id, position)
  where deleted_at is null;

create table public.digital_product_accesses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.digital_products(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  license_id uuid not null references public.digital_product_licenses(id) on delete restrict,
  status public.digital_product_access_status not null default 'active'::public.digital_product_access_status,
  source public.digital_product_access_source not null,
  source_reference text,
  license_snapshot jsonb not null,
  granted_by_user_id uuid references auth.users(id) on delete restrict,
  granted_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint digital_product_accesses_source_reference_length check (
    source_reference is null or char_length(source_reference) between 1 and 200
  ),
  constraint digital_product_accesses_license_snapshot_object check (jsonb_typeof(license_snapshot) = 'object'),
  constraint digital_product_accesses_expiry_after_grant check (expires_at is null or expires_at > granted_at),
  constraint digital_product_accesses_revocation_reason_length check (
    revocation_reason is null or char_length(revocation_reason) between 3 and 1000
  ),
  constraint digital_product_accesses_status_contract check (
    (status = 'active'::public.digital_product_access_status and revoked_at is null and revocation_reason is null)
    or (status = 'revoked'::public.digital_product_access_status and revoked_at is not null and revocation_reason is not null)
  )
);

create unique index digital_product_accesses_one_active_uidx
  on public.digital_product_accesses (product_id, user_id)
  where status = 'active'::public.digital_product_access_status;

create unique index digital_product_accesses_source_reference_uidx
  on public.digital_product_accesses (source, source_reference)
  where source_reference is not null;

create table public.digital_product_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.digital_products(id) on delete cascade,
  deliverable_id uuid references public.digital_product_deliverables(id) on delete set null,
  license_id uuid references public.digital_product_licenses(id) on delete set null,
  access_id uuid references public.digital_product_accesses(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.digital_product_event_type not null,
  version integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint digital_product_events_version_positive check (version is null or version > 0),
  constraint digital_product_events_details_object check (jsonb_typeof(details) = 'object')
);

create index digital_products_status_created_idx
  on public.digital_products (status, created_at desc)
  where deleted_at is null;
create index digital_products_created_by_idx
  on public.digital_products (created_by_user_id)
  where created_by_user_id is not null;
create index digital_products_updated_by_idx
  on public.digital_products (updated_by_user_id)
  where updated_by_user_id is not null;
create index digital_products_cover_asset_idx
  on public.digital_products (cover_asset_id)
  where cover_asset_id is not null;
create index digital_products_thumbnail_asset_idx
  on public.digital_products (thumbnail_asset_id)
  where thumbnail_asset_id is not null;
create index digital_product_licenses_product_idx
  on public.digital_product_licenses (product_id, status, kind, version desc);
create index digital_product_licenses_created_by_idx
  on public.digital_product_licenses (created_by_user_id)
  where created_by_user_id is not null;
create index digital_product_deliverables_product_idx
  on public.digital_product_deliverables (product_id, position)
  where deleted_at is null;
create index digital_product_deliverables_asset_idx
  on public.digital_product_deliverables (asset_id)
  where deleted_at is null;
create index digital_product_deliverables_created_by_idx
  on public.digital_product_deliverables (created_by_user_id)
  where created_by_user_id is not null;
create index digital_product_accesses_user_idx
  on public.digital_product_accesses (user_id, status, granted_at desc);
create index digital_product_accesses_product_idx
  on public.digital_product_accesses (product_id, status, granted_at desc);
create index digital_product_accesses_license_idx
  on public.digital_product_accesses (license_id);
create index digital_product_accesses_granted_by_idx
  on public.digital_product_accesses (granted_by_user_id)
  where granted_by_user_id is not null;
create index digital_product_events_product_idx
  on public.digital_product_events (product_id, created_at desc);
create index digital_product_events_deliverable_idx
  on public.digital_product_events (deliverable_id, created_at desc)
  where deliverable_id is not null;
create index digital_product_events_license_idx
  on public.digital_product_events (license_id, created_at desc)
  where license_id is not null;
create index digital_product_events_access_idx
  on public.digital_product_events (access_id, created_at desc)
  where access_id is not null;
create index digital_product_events_actor_idx
  on public.digital_product_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

create or replace function private.set_digital_product_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'::public.digital_product_status and new.published_at is null then
    new.published_at := statement_timestamp();
  end if;
  if new.status = 'draft'::public.digital_product_status and old.status = 'published'::public.digital_product_status then
    new.unpublished_at := statement_timestamp();
  end if;
  if new.status = 'archived'::public.digital_product_status and new.archived_at is null then
    new.archived_at := statement_timestamp();
  end if;
  return new;
end;
$$;

create or replace function private.set_digital_license_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'::public.digital_license_status and new.published_at is null then
    new.published_at := statement_timestamp();
  end if;
  if new.status = 'archived'::public.digital_license_status and new.archived_at is null then
    new.archived_at := statement_timestamp();
  end if;
  return new;
end;
$$;

create trigger digital_products_set_lifecycle
before insert or update of status on public.digital_products
for each row execute function private.set_digital_product_lifecycle_timestamps();

create trigger digital_product_licenses_set_lifecycle
before insert or update of status on public.digital_product_licenses
for each row execute function private.set_digital_license_lifecycle_timestamps();

create trigger digital_products_set_updated_at
before update on public.digital_products
for each row execute function public.set_updated_at();

create trigger digital_product_deliverables_set_updated_at
before update on public.digital_product_deliverables
for each row execute function public.set_updated_at();

create trigger digital_product_accesses_set_updated_at
before update on public.digital_product_accesses
for each row execute function public.set_updated_at();

alter table public.digital_products enable row level security;
alter table public.digital_products force row level security;
alter table public.digital_product_licenses enable row level security;
alter table public.digital_product_licenses force row level security;
alter table public.digital_product_deliverables enable row level security;
alter table public.digital_product_deliverables force row level security;
alter table public.digital_product_accesses enable row level security;
alter table public.digital_product_accesses force row level security;
alter table public.digital_product_events enable row level security;
alter table public.digital_product_events force row level security;

revoke all on table public.digital_products from public, anon, authenticated;
revoke all on table public.digital_product_licenses from public, anon, authenticated;
revoke all on table public.digital_product_deliverables from public, anon, authenticated;
revoke all on table public.digital_product_accesses from public, anon, authenticated;
revoke all on table public.digital_product_events from public, anon, authenticated;

grant select on table public.digital_products to authenticated, service_role;
grant select on table public.digital_product_licenses to authenticated, service_role;
grant select on table public.digital_product_deliverables to authenticated, service_role;
grant select on table public.digital_product_accesses to authenticated, service_role;
grant select on table public.digital_product_events to authenticated, service_role;
grant insert, update, delete on table public.digital_products to service_role;
grant insert, update, delete on table public.digital_product_licenses to service_role;
grant insert, update, delete on table public.digital_product_deliverables to service_role;
grant insert, update, delete on table public.digital_product_accesses to service_role;
grant insert, update, delete on table public.digital_product_events to service_role;
