-- FASE B13: canonical assessment schema, private answer keys and read boundaries.

create type public.assessment_status as enum ('draft', 'published', 'archived');
create type public.assessment_scope as enum ('course', 'module', 'lesson');
create type public.assessment_question_type as enum ('single_choice', 'multiple_choice', 'true_false');
create type public.assessment_attempt_status as enum ('in_progress', 'graded', 'expired', 'cancelled');
create type public.assessment_event_type as enum (
  'created',
  'updated',
  'published',
  'unpublished',
  'archived',
  'deleted',
  'question_created',
  'question_updated',
  'question_archived',
  'question_deleted',
  'options_replaced',
  'questions_reordered',
  'attempt_started',
  'answer_saved',
  'attempt_graded',
  'attempt_expired',
  'attempt_cancelled'
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modulos(id) on delete cascade,
  lesson_id uuid references public.aulas(id) on delete cascade,
  scope public.assessment_scope not null default 'course'::public.assessment_scope,
  title text not null,
  description text,
  status public.assessment_status not null default 'draft'::public.assessment_status,
  passing_score numeric(5,2) not null default 70,
  max_attempts smallint not null default 3,
  time_limit_minutes integer,
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  show_correct_answers boolean not null default false,
  required boolean not null default true,
  availability_starts_at timestamptz,
  availability_ends_at timestamptz,
  version integer not null default 1,
  created_by_user_id uuid references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint assessments_title_length check (char_length(btrim(title)) between 3 and 200),
  constraint assessments_description_length check (description is null or char_length(description) between 1 and 5000),
  constraint assessments_passing_score_range check (passing_score between 0 and 100),
  constraint assessments_max_attempts_range check (max_attempts between 1 and 100),
  constraint assessments_time_limit_range check (time_limit_minutes is null or time_limit_minutes between 1 and 1440),
  constraint assessments_availability_window check (
    availability_starts_at is null or availability_ends_at is null or availability_ends_at > availability_starts_at
  ),
  constraint assessments_scope_shape check (
    (scope = 'course'::public.assessment_scope and module_id is null and lesson_id is null)
    or (scope = 'module'::public.assessment_scope and module_id is not null and lesson_id is null)
    or (scope = 'lesson'::public.assessment_scope and lesson_id is not null)
  ),
  constraint assessments_version_positive check (version > 0),
  constraint assessments_deleted_archived check (deleted_at is null or status = 'archived'::public.assessment_status)
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_type public.assessment_question_type not null,
  prompt text not null,
  explanation text,
  ordem integer not null default 0,
  points numeric(8,2) not null default 1,
  required boolean not null default true,
  status public.assessment_status not null default 'draft'::public.assessment_status,
  version integer not null default 1,
  created_by_user_id uuid references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  constraint assessment_questions_prompt_length check (char_length(btrim(prompt)) between 3 and 5000),
  constraint assessment_questions_explanation_length check (explanation is null or char_length(explanation) between 1 and 5000),
  constraint assessment_questions_order_nonnegative check (ordem >= 0),
  constraint assessment_questions_points_positive check (points > 0 and points <= 10000),
  constraint assessment_questions_version_positive check (version > 0),
  constraint assessment_questions_deleted_archived check (deleted_at is null or status = 'archived'::public.assessment_status)
);

create table public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  option_text text not null,
  ordem integer not null default 0,
  is_correct boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  constraint assessment_options_text_length check (char_length(btrim(option_text)) between 1 and 2000),
  constraint assessment_options_order_nonnegative check (ordem >= 0),
  unique (question_id, ordem)
);

create unique index assessment_options_question_text_uidx
  on public.assessment_options (question_id, lower(btrim(option_text)));

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  attempt_number smallint not null,
  status public.assessment_attempt_status not null default 'in_progress'::public.assessment_attempt_status,
  assessment_version integer not null,
  question_snapshot jsonb not null,
  passing_score numeric(5,2) not null,
  started_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz,
  submitted_at timestamptz,
  graded_at timestamptz,
  total_points numeric(10,2),
  earned_points numeric(10,2),
  score_percent numeric(5,2),
  passed boolean,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint assessment_attempts_number_positive check (attempt_number > 0),
  constraint assessment_attempts_version_positive check (assessment_version > 0),
  constraint assessment_attempts_snapshot_array check (jsonb_typeof(question_snapshot) = 'array'),
  constraint assessment_attempts_passing_score_range check (passing_score between 0 and 100),
  constraint assessment_attempts_expiration_after_start check (expires_at is null or expires_at > started_at),
  constraint assessment_attempts_score_range check (score_percent is null or score_percent between 0 and 100),
  constraint assessment_attempts_points_contract check (
    (total_points is null and earned_points is null)
    or (total_points > 0 and earned_points between 0 and total_points)
  ),
  constraint assessment_attempts_grade_contract check (
    (status = 'graded'::public.assessment_attempt_status and submitted_at is not null and graded_at is not null and total_points is not null and earned_points is not null and score_percent is not null and passed is not null)
    or (status <> 'graded'::public.assessment_attempt_status and graded_at is null and total_points is null and earned_points is null and score_percent is null and passed is null)
  ),
  unique (assessment_id, user_id, attempt_number)
);

create unique index assessment_attempts_one_active_uidx
  on public.assessment_attempts (assessment_id, user_id)
  where status = 'in_progress'::public.assessment_attempt_status;

create table public.assessment_answers (
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete restrict,
  selected_option_ids uuid[] not null,
  answered_at timestamptz not null default statement_timestamp(),
  primary key (attempt_id, question_id),
  constraint assessment_answers_nonempty check (cardinality(selected_option_ids) > 0)
);

create table public.assessment_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id uuid references public.assessment_questions(id) on delete set null,
  attempt_id uuid references public.assessment_attempts(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.assessment_event_type not null,
  version integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint assessment_events_version_positive check (version is null or version > 0),
  constraint assessment_events_details_object check (jsonb_typeof(details) = 'object')
);

create table private.assessment_attempt_keys (
  attempt_id uuid primary key references public.assessment_attempts(id) on delete cascade,
  answer_key jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint assessment_attempt_keys_array check (jsonb_typeof(answer_key) = 'array')
);

create index assessments_course_status_idx on public.assessments (course_id, status, created_at desc) where deleted_at is null;
create index assessments_module_idx on public.assessments (module_id) where module_id is not null and deleted_at is null;
create index assessments_lesson_idx on public.assessments (lesson_id) where lesson_id is not null and deleted_at is null;
create index assessments_created_by_idx on public.assessments (created_by_user_id) where created_by_user_id is not null;
create index assessments_updated_by_idx on public.assessments (updated_by_user_id) where updated_by_user_id is not null;
create index assessment_questions_assessment_order_idx on public.assessment_questions (assessment_id, status, ordem) where deleted_at is null;
create index assessment_questions_created_by_idx on public.assessment_questions (created_by_user_id) where created_by_user_id is not null;
create index assessment_questions_updated_by_idx on public.assessment_questions (updated_by_user_id) where updated_by_user_id is not null;
create index assessment_options_question_order_idx on public.assessment_options (question_id, ordem);
create index assessment_attempts_user_idx on public.assessment_attempts (user_id, started_at desc);
create index assessment_attempts_assessment_idx on public.assessment_attempts (assessment_id, started_at desc);
create index assessment_attempts_enrollment_idx on public.assessment_attempts (enrollment_id);
create index assessment_answers_question_idx on public.assessment_answers (question_id);
create index assessment_events_assessment_idx on public.assessment_events (assessment_id, created_at desc);
create index assessment_events_question_idx on public.assessment_events (question_id, created_at desc) where question_id is not null;
create index assessment_events_attempt_idx on public.assessment_events (attempt_id, created_at desc) where attempt_id is not null;
create index assessment_events_actor_idx on public.assessment_events (actor_user_id, created_at desc) where actor_user_id is not null;

create or replace function private.set_assessment_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'::public.assessment_status and new.published_at is null then
    new.published_at := statement_timestamp();
  end if;
  if new.status = 'draft'::public.assessment_status then
    new.published_at := null;
  end if;
  if new.status = 'archived'::public.assessment_status and new.archived_at is null then
    new.archived_at := statement_timestamp();
  end if;
  return new;
end;
$$;

create trigger assessments_set_lifecycle
before insert or update of status on public.assessments
for each row execute function private.set_assessment_lifecycle_timestamps();

create trigger assessment_questions_set_lifecycle
before insert or update of status on public.assessment_questions
for each row execute function private.set_assessment_lifecycle_timestamps();

create trigger assessments_set_updated_at
before update on public.assessments
for each row execute function public.set_updated_at();

create trigger assessment_questions_set_updated_at
before update on public.assessment_questions
for each row execute function public.set_updated_at();

create trigger assessment_attempts_set_updated_at
before update on public.assessment_attempts
for each row execute function public.set_updated_at();

create or replace function private.assessment_available_to_user(p_user_id uuid, p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assessments a
    where a.id = p_assessment_id
      and a.status = 'published'::public.assessment_status
      and a.deleted_at is null
      and (a.availability_starts_at is null or a.availability_starts_at <= statement_timestamp())
      and (a.availability_ends_at is null or a.availability_ends_at > statement_timestamp())
      and private.has_active_course_access(p_user_id, a.course_id)
      and (
        a.scope = 'course'::public.assessment_scope
        or (a.scope = 'module'::public.assessment_scope and private.module_available_to_user(p_user_id, a.module_id))
        or (a.scope = 'lesson'::public.assessment_scope and private.lesson_available_to_user(p_user_id, a.lesson_id))
      )
  )
$$;

revoke all on function private.set_assessment_lifecycle_timestamps() from public, anon, authenticated;
revoke all on function private.assessment_available_to_user(uuid, uuid) from public, anon;
grant execute on function private.assessment_available_to_user(uuid, uuid) to authenticated, service_role;

alter table public.assessments enable row level security;
alter table public.assessments force row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_questions force row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_options force row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_attempts force row level security;
alter table public.assessment_answers enable row level security;
alter table public.assessment_answers force row level security;
alter table public.assessment_events enable row level security;
alter table public.assessment_events force row level security;

revoke all on table public.assessments from public, anon, authenticated;
revoke all on table public.assessment_questions from public, anon, authenticated;
revoke all on table public.assessment_options from public, anon, authenticated;
revoke all on table public.assessment_attempts from public, anon, authenticated;
revoke all on table public.assessment_answers from public, anon, authenticated;
revoke all on table public.assessment_events from public, anon, authenticated;
revoke all on table private.assessment_attempt_keys from public, anon, authenticated, service_role;

grant select on table public.assessments to authenticated, service_role;
grant select on table public.assessment_questions to authenticated, service_role;
grant select on table public.assessment_options to authenticated, service_role;
grant select on table public.assessment_attempts to authenticated, service_role;
grant select on table public.assessment_answers to authenticated, service_role;
grant select on table public.assessment_events to authenticated, service_role;
grant insert, update, delete on table public.assessments to service_role;
grant insert, update, delete on table public.assessment_questions to service_role;
grant insert, update, delete on table public.assessment_options to service_role;
grant insert, update, delete on table public.assessment_attempts to service_role;
grant insert, update, delete on table public.assessment_answers to service_role;
grant insert, update, delete on table public.assessment_events to service_role;

create policy assessments_select
on public.assessments for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and private.assessment_available_to_user((select auth.uid()), id)
  )
);

create policy assessment_questions_admin_select
on public.assessment_questions for select to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy assessment_options_admin_select
on public.assessment_options for select to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy assessment_attempts_select
on public.assessment_attempts for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and user_id = (select auth.uid())
  )
);

create policy assessment_answers_select
on public.assessment_answers for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_answers.attempt_id
        and a.user_id = (select auth.uid())
    )
  )
);

create policy assessment_events_admin_select
on public.assessment_events for select to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
