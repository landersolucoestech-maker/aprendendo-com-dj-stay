create type public.course_level as enum ('beginner', 'intermediate', 'advanced', 'all_levels');
create type public.course_release_mode as enum ('immediate', 'scheduled', 'drip');
create type public.course_completion_mode as enum ('all_required_lessons', 'percentage', 'manual');
create type public.course_editor_event_type as enum (
  'created',
  'updated',
  'duplicated',
  'published',
  'unpublished',
  'archived',
  'deleted'
);

alter table public.courses
  add column short_description text,
  add column description text,
  add column category text,
  add column language_code text not null default 'pt-BR',
  add column level public.course_level not null default 'all_levels'::public.course_level,
  add column objectives text[] not null default '{}'::text[],
  add column prerequisites text[] not null default '{}'::text[],
  add column cover_asset_id uuid references public.assets(id) on delete set null,
  add column thumbnail_asset_id uuid references public.assets(id) on delete set null,
  add column price_amount numeric(12,2) not null default 0,
  add column currency_code text not null default 'BRL',
  add column promotional_price_amount numeric(12,2),
  add column promotion_starts_at timestamptz,
  add column promotion_ends_at timestamptz,
  add column availability_starts_at timestamptz,
  add column availability_ends_at timestamptz,
  add column completion_mode public.course_completion_mode not null default 'all_required_lessons'::public.course_completion_mode,
  add column completion_required_percent smallint not null default 100,
  add column certificate_enabled boolean not null default false,
  add column certificate_min_completion_percent smallint not null default 100,
  add column release_mode public.course_release_mode not null default 'immediate'::public.course_release_mode,
  add column release_at timestamptz,
  add column drip_interval_days integer,
  add column affiliate_eligible boolean not null default false,
  add column preview_enabled boolean not null default true,
  add column published_at timestamptz,
  add column unpublished_at timestamptz,
  add column archived_at timestamptz,
  add column deleted_at timestamptz,
  add column duplicated_from_course_id uuid references public.courses(id) on delete set null,
  add column created_by_user_id uuid references auth.users(id) on delete restrict,
  add column updated_by_user_id uuid references auth.users(id) on delete restrict,
  add column version integer not null default 1,
  add constraint courses_short_description_length check (
    short_description is null or char_length(btrim(short_description)) between 1 and 500
  ),
  add constraint courses_description_length check (
    description is null or char_length(btrim(description)) between 1 and 20000
  ),
  add constraint courses_category_length check (
    category is null or char_length(btrim(category)) between 1 and 120
  ),
  add constraint courses_language_code_format check (
    language_code ~ '^[a-z]{2}(?:-[A-Z]{2})?$'
  ),
  add constraint courses_price_nonnegative check (price_amount >= 0),
  add constraint courses_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  add constraint courses_promotional_price_valid check (
    promotional_price_amount is null
    or (promotional_price_amount >= 0 and promotional_price_amount < price_amount)
  ),
  add constraint courses_promotion_window_valid check (
    promotion_ends_at is null or promotion_starts_at is not null
  ),
  add constraint courses_promotion_window_order check (
    promotion_starts_at is null or promotion_ends_at is null or promotion_ends_at > promotion_starts_at
  ),
  add constraint courses_availability_window_order check (
    availability_starts_at is null or availability_ends_at is null or availability_ends_at > availability_starts_at
  ),
  add constraint courses_completion_percent_range check (completion_required_percent between 1 and 100),
  add constraint courses_certificate_percent_range check (certificate_min_completion_percent between 1 and 100),
  add constraint courses_release_contract check (
    (release_mode = 'immediate'::public.course_release_mode and release_at is null and drip_interval_days is null)
    or (release_mode = 'scheduled'::public.course_release_mode and release_at is not null and drip_interval_days is null)
    or (release_mode = 'drip'::public.course_release_mode and release_at is null and drip_interval_days between 1 and 365)
  ),
  add constraint courses_version_positive check (version > 0),
  add constraint courses_deleted_archived check (deleted_at is null or status = 'archived'::public.course_status),
  add constraint courses_published_timestamp check (
    status <> 'published'::public.course_status or published_at is not null
  );

create or replace function private.set_course_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status='published'::public.course_status and new.published_at is null then
    new.published_at := statement_timestamp();
  end if;
  if new.status='archived'::public.course_status and new.archived_at is null then
    new.archived_at := statement_timestamp();
  end if;
  return new;
end;
$$;

create trigger courses_set_lifecycle_timestamps
before insert or update of status on public.courses
for each row execute function private.set_course_lifecycle_timestamps();
revoke all on function private.set_course_lifecycle_timestamps() from public,anon,authenticated;

create table public.course_editor_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.course_editor_event_type not null,
  version integer not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint course_editor_events_version_positive check (version > 0)
);

create index courses_status_updated_idx on public.courses (status, updated_at desc) where deleted_at is null;
create index courses_category_idx on public.courses (category) where deleted_at is null;
create index courses_availability_idx on public.courses (availability_starts_at, availability_ends_at) where status='published' and deleted_at is null;
create index courses_cover_asset_idx on public.courses (cover_asset_id) where cover_asset_id is not null;
create index courses_thumbnail_asset_idx on public.courses (thumbnail_asset_id) where thumbnail_asset_id is not null;
create index courses_created_by_idx on public.courses (created_by_user_id) where created_by_user_id is not null;
create index courses_updated_by_idx on public.courses (updated_by_user_id) where updated_by_user_id is not null;
create index course_editor_events_course_created_idx on public.course_editor_events (course_id, created_at desc);
create index course_editor_events_actor_idx on public.course_editor_events (actor_user_id) where actor_user_id is not null;

alter table public.course_editor_events enable row level security;
alter table public.course_editor_events force row level security;
revoke all on table public.course_editor_events from public, anon, authenticated;
grant select on table public.course_editor_events to authenticated, service_role;
grant insert, update, delete on table public.course_editor_events to service_role;

revoke insert, update, delete on table public.courses from authenticated;
drop policy if exists courses_admin_insert on public.courses;
drop policy if exists courses_admin_update on public.courses;
drop policy if exists courses_admin_delete on public.courses;

create policy course_editor_events_admin_select
on public.course_editor_events
for select
to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create or replace function private.course_text_array(p_value jsonb, p_field text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare v_result text[];
begin
  if p_value is null or p_value = 'null'::jsonb then return '{}'::text[]; end if;
  if jsonb_typeof(p_value) <> 'array' then raise exception '%_MUST_BE_ARRAY', upper(p_field) using errcode='22023'; end if;
  select coalesce(array_agg(btrim(value) order by ordinal), '{}'::text[]) into v_result
  from jsonb_array_elements_text(p_value) with ordinality as item(value, ordinal);
  if cardinality(v_result) > 50
    or exists (select 1 from unnest(v_result) as value where value is null or char_length(value) not between 1 and 500) then
    raise exception '%_INVALID_ITEMS', upper(p_field) using errcode='22023';
  end if;
  return v_result;
end;
$$;

create or replace function private.assert_course_asset(p_asset_id uuid, p_label text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_asset_id is null then return; end if;
  if not exists (
    select 1 from public.assets
    where id=p_asset_id and purpose='image'::public.asset_purpose
      and state='published'::public.asset_state and deleted_at is null
  ) then raise exception '%_ASSET_INVALID', upper(p_label) using errcode='22023'; end if;
end;
$$;

create or replace function private.course_snapshot(p_course_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(c) - 'created_by_user_id' - 'updated_by_user_id'
  from public.courses c where c.id=p_course_id
$$;

create or replace function private.log_course_editor_event(
  p_course_id uuid,
  p_event_type public.course_editor_event_type,
  p_version integer,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.course_editor_events(course_id,actor_user_id,event_type,version,details)
  values (p_course_id,(select auth.uid()),p_event_type,p_version,coalesce(p_details,'{}'::jsonb));
end;
$$;

create or replace function private.assert_course_publishable(p_course_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_course public.courses;
begin
  select * into v_course from public.courses where id=p_course_id;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode='P0002'; end if;
  if v_course.deleted_at is not null then raise exception 'COURSE_DELETED' using errcode='22023'; end if;
  if v_course.status='archived'::public.course_status then raise exception 'ARCHIVED_COURSE_CANNOT_PUBLISH' using errcode='22023'; end if;
  if v_course.short_description is null or v_course.description is null or v_course.category is null then
    raise exception 'COURSE_DESCRIPTIONS_AND_CATEGORY_REQUIRED' using errcode='22023';
  end if;
  if cardinality(v_course.objectives)=0 then raise exception 'COURSE_OBJECTIVES_REQUIRED' using errcode='22023'; end if;
  if v_course.cover_asset_id is null or v_course.thumbnail_asset_id is null then raise exception 'COURSE_IMAGES_REQUIRED' using errcode='22023'; end if;
  perform private.assert_course_asset(v_course.cover_asset_id,'cover');
  perform private.assert_course_asset(v_course.thumbnail_asset_id,'thumbnail');
  if v_course.release_mode='scheduled' and v_course.release_at <= statement_timestamp() then
    raise exception 'SCHEDULED_RELEASE_MUST_BE_FUTURE' using errcode='22023';
  end if;
end;
$$;

revoke all on function private.course_text_array(jsonb,text) from public, anon, authenticated;
revoke all on function private.assert_course_asset(uuid,text) from public, anon, authenticated;
revoke all on function private.course_snapshot(uuid) from public, anon, authenticated;
revoke all on function private.log_course_editor_event(uuid,public.course_editor_event_type,integer,jsonb) from public, anon, authenticated;
revoke all on function private.assert_course_publishable(uuid) from public, anon, authenticated;
