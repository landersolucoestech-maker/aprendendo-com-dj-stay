create type public.course_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('pending', 'active', 'suspended', 'revoked');
create type public.enrollment_source as enum ('manual_grant', 'purchase');
create type public.enrollment_event_type as enum (
  'created',
  'payment_confirmed',
  'activated',
  'renewed',
  'suspended',
  'revoked',
  'access_denied'
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status public.course_status not null default 'draft'::public.course_status,
  access_duration_days integer,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint courses_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint courses_access_duration_positive check (access_duration_days is null or access_duration_days between 1 and 3650)
);

alter table public.modulos add column course_id uuid references public.courses(id) on delete cascade;
alter table public.modulos drop constraint modulos_ordem_unique;
alter table public.modulos alter column course_id set not null;
alter table public.modulos add constraint modulos_course_ordem_unique unique (course_id, ordem);
create index modulos_course_id_idx on public.modulos (course_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null,
  source public.enrollment_source not null,
  source_reference text,
  payment_confirmed_at timestamptz,
  starts_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  granted_by_user_id uuid references auth.users(id) on delete restrict,
  status_reason text,
  suspended_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint enrollments_unique_user_course unique (user_id, course_id),
  constraint enrollments_time_window check (expires_at is null or expires_at > starts_at),
  constraint enrollments_reference_length check (source_reference is null or char_length(source_reference) between 8 and 200),
  constraint enrollments_reason_length check (status_reason is null or char_length(status_reason) between 1 and 500),
  constraint enrollments_purchase_contract check (
    source <> 'purchase'::public.enrollment_source
    or source_reference is not null
  ),
  constraint enrollments_active_purchase_confirmed check (
    not (source = 'purchase'::public.enrollment_source and status = 'active'::public.enrollment_status)
    or payment_confirmed_at is not null
  ),
  constraint enrollments_manual_is_not_pending check (
    source <> 'manual_grant'::public.enrollment_source
    or status <> 'pending'::public.enrollment_status
  )
);

create table public.enrollment_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.enrollment_event_type not null,
  from_status public.enrollment_status,
  to_status public.enrollment_status,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp()
);

create index enrollments_user_status_idx on public.enrollments (user_id, status, starts_at, expires_at);
create index enrollments_course_status_idx on public.enrollments (course_id, status, starts_at, expires_at);
create index enrollments_granted_by_idx on public.enrollments (granted_by_user_id);
create index enrollment_events_enrollment_created_idx on public.enrollment_events (enrollment_id, created_at desc);
create index enrollment_events_actor_idx on public.enrollment_events (actor_user_id);

create trigger courses_set_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.courses force row level security;
alter table public.enrollments enable row level security;
alter table public.enrollments force row level security;
alter table public.enrollment_events enable row level security;
alter table public.enrollment_events force row level security;

revoke all on table public.courses from public, anon, authenticated;
revoke all on table public.enrollments from public, anon, authenticated;
revoke all on table public.enrollment_events from public, anon, authenticated;
grant select, insert, update, delete on table public.courses to authenticated, service_role;
grant select on table public.enrollments to authenticated, service_role;
grant select on table public.enrollment_events to authenticated, service_role;
grant insert, update, delete on table public.enrollments to service_role;
grant insert, update, delete on table public.enrollment_events to service_role;

create or replace function private.is_service_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
$$;

create or replace function private.has_active_course_access(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.enrollments
    join public.courses on courses.id = enrollments.course_id
    where enrollments.user_id = p_user_id
      and enrollments.course_id = p_course_id
      and courses.status = 'published'::public.course_status
      and enrollments.status = 'active'::public.enrollment_status
      and enrollments.starts_at <= statement_timestamp()
      and (enrollments.expires_at is null or enrollments.expires_at > statement_timestamp())
  )
$$;

create or replace function private.lesson_course_id(p_lesson_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select modulos.course_id
  from public.aulas
  join public.modulos on modulos.id = aulas.modulo_id
  where aulas.id = p_lesson_id
  limit 1
$$;

create or replace function private.log_enrollment_event(
  p_enrollment_id uuid,
  p_event_type public.enrollment_event_type,
  p_from_status public.enrollment_status,
  p_to_status public.enrollment_status,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.enrollment_events (
    enrollment_id,
    actor_user_id,
    event_type,
    from_status,
    to_status,
    details
  ) values (
    p_enrollment_id,
    (select auth.uid()),
    p_event_type,
    p_from_status,
    p_to_status,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.is_service_role() from public, anon;
revoke all on function private.has_active_course_access(uuid, uuid) from public, anon;
revoke all on function private.lesson_course_id(uuid) from public, anon;
revoke all on function private.log_enrollment_event(uuid, public.enrollment_event_type, public.enrollment_status, public.enrollment_status, jsonb) from public, anon, authenticated;
grant execute on function private.is_service_role() to authenticated, service_role;
grant execute on function private.has_active_course_access(uuid, uuid) to authenticated, service_role;
grant execute on function private.lesson_course_id(uuid) to authenticated, service_role;

create policy courses_select
on public.courses for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select private.has_active_course_access((select auth.uid()), courses.id))
  )
);
create policy courses_admin_insert on public.courses for insert to authenticated
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy courses_admin_update on public.courses for update to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role)
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy courses_admin_delete on public.courses for delete to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy enrollments_select
on public.enrollments for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or ((select auth.uid()) = user_id and (select private.current_user_role()) = 'aluno'::public.app_role)
);

create policy enrollment_events_select
on public.enrollment_events for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or exists (
    select 1 from public.enrollments
    where enrollments.id = enrollment_events.enrollment_id
      and enrollments.user_id = (select auth.uid())
      and (select private.current_user_role()) = 'aluno'::public.app_role
  )
);

alter table public.asset_access_grants add column id uuid default gen_random_uuid();
alter table public.asset_access_grants add column enrollment_id uuid references public.enrollments(id) on delete cascade;
alter table public.asset_access_grants drop constraint asset_access_grants_pkey;
alter table public.asset_access_grants alter column id set not null;
alter table public.asset_access_grants add constraint asset_access_grants_pkey primary key (id);
create unique index asset_access_grants_manual_unique
on public.asset_access_grants (asset_id, user_id)
where enrollment_id is null;
create unique index asset_access_grants_enrollment_unique
on public.asset_access_grants (asset_id, user_id, enrollment_id)
where enrollment_id is not null;
create index asset_access_grants_enrollment_id_idx on public.asset_access_grants (enrollment_id);
