-- FASE B15: ordered, idempotent and auditable lesson progress events.

create type public.lesson_progress_event_type as enum (
  'heartbeat',
  'pause',
  'ended',
  'manual_complete',
  'reading_acknowledgement',
  'visibility_hidden'
);

alter table public.progresso_aulas
  add column revision bigint not null default 0,
  add column last_event_id uuid,
  add column last_event_received_at timestamptz,
  add column last_client_instance_id uuid,
  add constraint progresso_aulas_revision_nonnegative check (revision >= 0);

create table public.lesson_progress_streams (
  user_id uuid not null references auth.users(id) on delete cascade,
  aula_id uuid not null references public.aulas(id) on delete cascade,
  client_instance_id uuid not null,
  auth_session_id uuid not null,
  last_event_sequence bigint not null,
  last_event_id uuid not null,
  last_position_seconds integer not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, aula_id, client_instance_id),
  constraint lesson_progress_streams_sequence_positive check (last_event_sequence > 0),
  constraint lesson_progress_streams_position_nonnegative check (last_position_seconds >= 0)
);

create table public.lesson_progress_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  aula_id uuid not null references public.aulas(id) on delete cascade,
  client_instance_id uuid not null,
  auth_session_id uuid not null,
  event_sequence bigint not null,
  event_type public.lesson_progress_event_type not null,
  position_seconds integer not null,
  duration_seconds integer,
  calculated_progress_percent integer not null,
  resulting_completed boolean not null,
  accepted boolean not null,
  ignored_reason text,
  resulting_revision bigint not null,
  observed_at timestamptz not null,
  received_at timestamptz not null default statement_timestamp(),
  constraint lesson_progress_events_sequence_positive check (event_sequence > 0),
  constraint lesson_progress_events_position_range check (position_seconds between 0 and 604800),
  constraint lesson_progress_events_duration_range check (duration_seconds is null or duration_seconds between 1 and 604800),
  constraint lesson_progress_events_progress_range check (calculated_progress_percent between 0 and 100),
  constraint lesson_progress_events_revision_nonnegative check (resulting_revision >= 0),
  constraint lesson_progress_events_ignored_contract check (
    (accepted and ignored_reason is null)
    or (not accepted and ignored_reason is not null and char_length(ignored_reason) between 1 and 100)
  )
);

create index lesson_progress_streams_lesson_idx
  on public.lesson_progress_streams (aula_id);
create index lesson_progress_streams_session_idx
  on public.lesson_progress_streams (auth_session_id, updated_at desc);
create index lesson_progress_events_user_lesson_received_idx
  on public.lesson_progress_events (user_id, aula_id, received_at desc);
create index lesson_progress_events_lesson_idx
  on public.lesson_progress_events (aula_id);
create index lesson_progress_events_client_sequence_idx
  on public.lesson_progress_events (user_id, aula_id, client_instance_id, event_sequence desc);
create index lesson_progress_events_session_idx
  on public.lesson_progress_events (auth_session_id, received_at desc);

alter table public.lesson_progress_streams enable row level security;
alter table public.lesson_progress_streams force row level security;
alter table public.lesson_progress_events enable row level security;
alter table public.lesson_progress_events force row level security;

revoke all on table public.lesson_progress_streams from public, anon, authenticated;
revoke all on table public.lesson_progress_events from public, anon, authenticated;
revoke insert, update, delete on table public.progresso_aulas from authenticated;

grant select on table public.lesson_progress_streams to authenticated, service_role;
grant select on table public.lesson_progress_events to authenticated, service_role;
grant insert, update, delete on table public.lesson_progress_streams to service_role;
grant insert, update, delete on table public.lesson_progress_events to service_role;

create policy lesson_progress_streams_select
on public.lesson_progress_streams for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or user_id = (select auth.uid())
);

create policy lesson_progress_events_select
on public.lesson_progress_events for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or user_id = (select auth.uid())
);

drop policy if exists progresso_aulas_insert on public.progresso_aulas;
drop policy if exists progresso_aulas_update on public.progresso_aulas;
drop policy if exists progresso_aulas_delete on public.progresso_aulas;
