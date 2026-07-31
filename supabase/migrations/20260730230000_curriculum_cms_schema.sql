-- FASE B12: versioned curriculum schema for modules and lessons.

create type public.curriculum_item_status as enum ('draft', 'published', 'archived');
create type public.curriculum_release_mode as enum ('immediate', 'scheduled', 'drip', 'after_prerequisites');
create type public.lesson_content_kind as enum ('text', 'video', 'audio', 'mixed');
create type public.lesson_completion_mode as enum ('manual', 'media_progress', 'reading_acknowledgement', 'any_activity');
create type public.curriculum_entity_type as enum ('module', 'lesson');
create type public.curriculum_editor_event_type as enum (
  'created',
  'updated',
  'duplicated',
  'reordered',
  'moved',
  'archived',
  'deleted',
  'prerequisites_updated',
  'media_updated',
  'material_archived'
);

alter table public.modulos
  add column status public.curriculum_item_status not null default 'draft'::public.curriculum_item_status,
  add column obrigatorio boolean not null default true,
  add column release_mode public.curriculum_release_mode not null default 'immediate'::public.curriculum_release_mode,
  add column release_at timestamptz,
  add column drip_delay_days integer,
  add column preview_enabled boolean not null default false,
  add column version integer not null default 1,
  add column duplicated_from_module_id uuid references public.modulos(id) on delete set null,
  add column created_by_user_id uuid references auth.users(id) on delete restrict,
  add column updated_by_user_id uuid references auth.users(id) on delete restrict,
  add column archived_at timestamptz,
  add column deleted_at timestamptz,
  add constraint modulos_release_contract check (
    (release_mode = 'immediate'::public.curriculum_release_mode and release_at is null and drip_delay_days is null)
    or (release_mode = 'scheduled'::public.curriculum_release_mode and release_at is not null and drip_delay_days is null)
    or (release_mode = 'drip'::public.curriculum_release_mode and release_at is null and drip_delay_days between 0 and 3650)
    or (release_mode = 'after_prerequisites'::public.curriculum_release_mode and release_at is null and drip_delay_days is null)
  ),
  add constraint modulos_version_positive check (version > 0),
  add constraint modulos_deleted_archived check (deleted_at is null or status = 'archived'::public.curriculum_item_status);

alter table public.aulas
  add column status public.curriculum_item_status not null default 'draft'::public.curriculum_item_status,
  add column conteudo_texto text,
  add column content_kind public.lesson_content_kind not null default 'video'::public.lesson_content_kind,
  add column audio_asset_id uuid references public.assets(id) on delete set null,
  add column obrigatoria boolean not null default true,
  add column completion_mode public.lesson_completion_mode not null default 'manual'::public.lesson_completion_mode,
  add column completion_percent smallint,
  add column preview_enabled boolean not null default false,
  add column release_mode public.curriculum_release_mode not null default 'immediate'::public.curriculum_release_mode,
  add column release_at timestamptz,
  add column drip_delay_days integer,
  add column availability_starts_at timestamptz,
  add column availability_ends_at timestamptz,
  add column version integer not null default 1,
  add column duplicated_from_lesson_id uuid references public.aulas(id) on delete set null,
  add column created_by_user_id uuid references auth.users(id) on delete restrict,
  add column updated_by_user_id uuid references auth.users(id) on delete restrict,
  add column archived_at timestamptz,
  add column deleted_at timestamptz,
  add constraint aulas_text_content_length check (conteudo_texto is null or char_length(conteudo_texto) between 1 and 50000),
  add constraint aulas_completion_contract check (
    (completion_mode = 'media_progress'::public.lesson_completion_mode and completion_percent between 1 and 100)
    or (completion_mode <> 'media_progress'::public.lesson_completion_mode and completion_percent is null)
  ),
  add constraint aulas_release_contract check (
    (release_mode = 'immediate'::public.curriculum_release_mode and release_at is null and drip_delay_days is null)
    or (release_mode = 'scheduled'::public.curriculum_release_mode and release_at is not null and drip_delay_days is null)
    or (release_mode = 'drip'::public.curriculum_release_mode and release_at is null and drip_delay_days between 0 and 3650)
    or (release_mode = 'after_prerequisites'::public.curriculum_release_mode and release_at is null and drip_delay_days is null)
  ),
  add constraint aulas_availability_window check (
    availability_starts_at is null or availability_ends_at is null or availability_ends_at > availability_starts_at
  ),
  add constraint aulas_version_positive check (version > 0),
  add constraint aulas_deleted_archived check (deleted_at is null or status = 'archived'::public.curriculum_item_status);

create table public.module_prerequisites (
  module_id uuid not null references public.modulos(id) on delete cascade,
  prerequisite_module_id uuid not null references public.modulos(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (module_id, prerequisite_module_id),
  constraint module_prerequisites_not_self check (module_id <> prerequisite_module_id)
);

create table public.lesson_prerequisites (
  lesson_id uuid not null references public.aulas(id) on delete cascade,
  prerequisite_lesson_id uuid not null references public.aulas(id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  primary key (lesson_id, prerequisite_lesson_id),
  constraint lesson_prerequisites_not_self check (lesson_id <> prerequisite_lesson_id)
);

create table public.curriculum_editor_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  entity_type public.curriculum_entity_type not null,
  entity_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.curriculum_editor_event_type not null,
  version integer not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint curriculum_editor_events_version_positive check (version > 0)
);

create index modulos_course_status_order_idx on public.modulos (course_id, status, ordem) where deleted_at is null;
create index modulos_duplicate_source_idx on public.modulos (duplicated_from_module_id) where duplicated_from_module_id is not null;
create index modulos_created_by_idx on public.modulos (created_by_user_id) where created_by_user_id is not null;
create index aulas_module_status_order_idx on public.aulas (modulo_id, status, ordem) where deleted_at is null;
create index aulas_audio_asset_idx on public.aulas (audio_asset_id) where audio_asset_id is not null;
create index aulas_duplicate_source_idx on public.aulas (duplicated_from_lesson_id) where duplicated_from_lesson_id is not null;
create index aulas_created_by_idx on public.aulas (created_by_user_id) where created_by_user_id is not null;
create index module_prerequisites_reverse_idx on public.module_prerequisites (prerequisite_module_id, module_id);
create index lesson_prerequisites_reverse_idx on public.lesson_prerequisites (prerequisite_lesson_id, lesson_id);
create index curriculum_editor_events_entity_idx on public.curriculum_editor_events (entity_type, entity_id, created_at desc);
create index curriculum_editor_events_course_idx on public.curriculum_editor_events (course_id, created_at desc);
create index curriculum_editor_events_actor_idx on public.curriculum_editor_events (actor_user_id) where actor_user_id is not null;

create or replace function private.set_curriculum_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'archived'::public.curriculum_item_status and new.archived_at is null then
    new.archived_at := statement_timestamp();
  end if;
  return new;
end;
$$;

create trigger modulos_set_curriculum_lifecycle
before insert or update of status on public.modulos
for each row execute function private.set_curriculum_lifecycle_timestamps();

create trigger aulas_set_curriculum_lifecycle
before insert or update of status on public.aulas
for each row execute function private.set_curriculum_lifecycle_timestamps();

revoke all on function private.set_curriculum_lifecycle_timestamps() from public, anon, authenticated;

alter table public.module_prerequisites enable row level security;
alter table public.module_prerequisites force row level security;
alter table public.lesson_prerequisites enable row level security;
alter table public.lesson_prerequisites force row level security;
alter table public.curriculum_editor_events enable row level security;
alter table public.curriculum_editor_events force row level security;

revoke all on table public.module_prerequisites from public, anon, authenticated;
revoke all on table public.lesson_prerequisites from public, anon, authenticated;
revoke all on table public.curriculum_editor_events from public, anon, authenticated;
grant select on table public.module_prerequisites to authenticated, service_role;
grant select on table public.lesson_prerequisites to authenticated, service_role;
grant select on table public.curriculum_editor_events to authenticated, service_role;
grant insert, update, delete on table public.module_prerequisites to service_role;
grant insert, update, delete on table public.lesson_prerequisites to service_role;
grant insert, update, delete on table public.curriculum_editor_events to service_role;

revoke insert, update, delete on table public.modulos from authenticated;
revoke insert, update, delete on table public.aulas from authenticated;

drop policy if exists modulos_admin_insert on public.modulos;
drop policy if exists modulos_admin_update on public.modulos;
drop policy if exists modulos_admin_delete on public.modulos;
drop policy if exists aulas_admin_insert on public.aulas;
drop policy if exists aulas_admin_update on public.aulas;
drop policy if exists aulas_admin_delete on public.aulas;

create policy curriculum_editor_events_admin_select
on public.curriculum_editor_events for select to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy module_prerequisites_admin_select
on public.module_prerequisites for select to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy lesson_prerequisites_admin_select
on public.lesson_prerequisites for select to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create or replace function private.assert_curriculum_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return v_actor;
end;
$$;

create or replace function private.log_curriculum_event(
  p_course_id uuid,
  p_entity_type public.curriculum_entity_type,
  p_entity_id uuid,
  p_event_type public.curriculum_editor_event_type,
  p_version integer,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.curriculum_editor_events (
    course_id, entity_type, entity_id, actor_user_id, event_type, version, details
  ) values (
    p_course_id, p_entity_type, p_entity_id, (select auth.uid()), p_event_type, p_version, coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function private.assert_lesson_asset(
  p_asset_id uuid,
  p_lesson_id uuid,
  p_purpose public.asset_purpose
)
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
    where id = p_asset_id
      and lesson_id = p_lesson_id
      and purpose = p_purpose
      and state = 'published'::public.asset_state
      and deleted_at is null
  ) then
    raise exception 'PUBLISHED_LESSON_ASSET_REQUIRED' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.assert_curriculum_admin() from public, anon, authenticated;
revoke all on function private.log_curriculum_event(uuid, public.curriculum_entity_type, uuid, public.curriculum_editor_event_type, integer, jsonb) from public, anon, authenticated;
revoke all on function private.assert_lesson_asset(uuid, uuid, public.asset_purpose) from public, anon, authenticated;
