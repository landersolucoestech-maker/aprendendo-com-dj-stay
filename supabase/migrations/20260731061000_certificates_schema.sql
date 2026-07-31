-- FASE B21: domínio auditável de certificados.

create type public.certificate_status as enum ('issued', 'revoked');
create type public.certificate_event_type as enum ('issued', 'revoked');

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status public.certificate_status not null default 'issued',
  student_name_snapshot text not null,
  course_title_snapshot text not null,
  completion_percent_snapshot smallint not null,
  issued_at timestamptz not null default now(),
  issued_by_user_id uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete restrict,
  revocation_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificates_code_format_chk check (code ~ '^DJSTAY-[A-F0-9]{20}$'),
  constraint certificates_student_name_chk check (char_length(btrim(student_name_snapshot)) between 2 and 200),
  constraint certificates_course_title_chk check (char_length(btrim(course_title_snapshot)) between 2 and 200),
  constraint certificates_completion_chk check (completion_percent_snapshot between 0 and 100),
  constraint certificates_revocation_state_chk check (
    (status = 'issued' and revoked_at is null and revoked_by_user_id is null and revocation_reason is null)
    or
    (status = 'revoked' and revoked_at is not null and revoked_by_user_id is not null and char_length(btrim(revocation_reason)) between 3 and 1000)
  )
);

create unique index certificates_one_issued_per_enrollment_uidx
  on public.certificates (enrollment_id)
  where status = 'issued';
create index certificates_user_issued_idx
  on public.certificates (user_id, issued_at desc);
create index certificates_course_issued_idx
  on public.certificates (course_id, issued_at desc);
create index certificates_status_issued_idx
  on public.certificates (status, issued_at desc);
create index certificates_issued_by_idx
  on public.certificates (issued_by_user_id);
create index certificates_revoked_by_idx
  on public.certificates (revoked_by_user_id);

create table public.certificate_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete restrict,
  event_type public.certificate_event_type not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index certificate_events_certificate_created_idx
  on public.certificate_events (certificate_id, created_at desc);
create index certificate_events_actor_idx
  on public.certificate_events (actor_user_id);

create function private.freeze_certificate_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.code is distinct from old.code
    or new.enrollment_id is distinct from old.enrollment_id
    or new.user_id is distinct from old.user_id
    or new.course_id is distinct from old.course_id
    or new.student_name_snapshot is distinct from old.student_name_snapshot
    or new.course_title_snapshot is distinct from old.course_title_snapshot
    or new.completion_percent_snapshot is distinct from old.completion_percent_snapshot
    or new.issued_at is distinct from old.issued_at
    or new.issued_by_user_id is distinct from old.issued_by_user_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'CERTIFICATE_IDENTITY_IMMUTABLE' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger certificates_freeze_identity
before update on public.certificates
for each row execute function private.freeze_certificate_identity();

create trigger certificates_set_updated_at
before update on public.certificates
for each row execute function public.set_updated_at();

alter table public.certificates enable row level security;
alter table public.certificates force row level security;
alter table public.certificate_events enable row level security;
alter table public.certificate_events force row level security;

create policy certificates_select
on public.certificates
for select
to authenticated
using (
  private.current_user_role() = 'administrador_proprietario'::public.app_role
  or (private.current_user_role() = 'aluno'::public.app_role and user_id = auth.uid())
);

create policy certificate_events_select
on public.certificate_events
for select
to authenticated
using (
  private.current_user_role() = 'administrador_proprietario'::public.app_role
  or exists (
    select 1
    from public.certificates certificate_record
    where certificate_record.id = certificate_events.certificate_id
      and certificate_record.user_id = auth.uid()
      and private.current_user_role() = 'aluno'::public.app_role
  )
);

revoke all on public.certificates from public, anon, authenticated;
revoke all on public.certificate_events from public, anon, authenticated;
grant select on public.certificates to authenticated;
grant select on public.certificate_events to authenticated;
grant all on public.certificates to service_role;
grant all on public.certificate_events to service_role;

revoke all on function private.freeze_certificate_identity() from public, anon, authenticated;
