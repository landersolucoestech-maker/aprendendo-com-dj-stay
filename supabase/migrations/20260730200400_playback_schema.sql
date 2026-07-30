-- FASE B10: opaque, short-lived playback tokens and immutable audit events.

create type public.playback_event_type as enum (
  'issued',
  'resolved',
  'denied',
  'expired',
  'revoked'
);

create table public.playback_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null,
  lesson_media_id uuid not null references public.lesson_media(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  fingerprint_hash text not null,
  watermark_text text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  constraint playback_tokens_hash_format check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint playback_tokens_fingerprint_format check (fingerprint_hash ~ '^[a-f0-9]{64}$'),
  constraint playback_tokens_expiry_window check (
    expires_at > created_at
    and expires_at <= created_at + interval '10 minutes'
  ),
  constraint playback_tokens_use_count_nonnegative check (use_count >= 0),
  constraint playback_tokens_watermark_length check (watermark_text is null or char_length(watermark_text) between 1 and 120)
);

create table public.playback_events (
  id uuid primary key default gen_random_uuid(),
  playback_token_id uuid references public.playback_tokens(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  lesson_media_id uuid references public.lesson_media(id) on delete set null,
  event_type public.playback_event_type not null,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint playback_events_reason_length check (reason is null or char_length(reason) between 1 and 200)
);

create index playback_tokens_user_session_idx
on public.playback_tokens (user_id, auth_session_id, expires_at desc);
create index playback_tokens_media_idx
on public.playback_tokens (lesson_media_id, expires_at desc);
create index playback_tokens_enrollment_idx
on public.playback_tokens (enrollment_id) where enrollment_id is not null;
create index playback_events_token_created_idx
on public.playback_events (playback_token_id, created_at desc) where playback_token_id is not null;
create index playback_events_user_created_idx
on public.playback_events (user_id, created_at desc) where user_id is not null;
create index playback_events_media_created_idx
on public.playback_events (lesson_media_id, created_at desc) where lesson_media_id is not null;

alter table public.playback_tokens enable row level security;
alter table public.playback_tokens force row level security;
alter table public.playback_events enable row level security;
alter table public.playback_events force row level security;

revoke all on table public.playback_tokens from public, anon, authenticated;
revoke all on table public.playback_events from public, anon, authenticated;
grant select on table public.playback_tokens to authenticated, service_role;
grant select on table public.playback_events to authenticated, service_role;
grant insert, update, delete on table public.playback_tokens to service_role;
grant insert, update, delete on table public.playback_events to service_role;

create policy playback_tokens_select
on public.playback_tokens for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and user_id = (select auth.uid())
  )
);

create policy playback_events_select
on public.playback_events for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and user_id = (select auth.uid())
  )
);

create or replace function private.revoke_enrollment_playback_tokens()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active'::public.enrollment_status
    or new.starts_at > statement_timestamp()
    or (new.expires_at is not null and new.expires_at <= statement_timestamp()) then
    with revoked as (
      update public.playback_tokens
      set revoked_at = coalesce(revoked_at, statement_timestamp())
      where enrollment_id = new.id
        and revoked_at is null
      returning id, user_id, lesson_media_id
    )
    insert into public.playback_events (
      playback_token_id,
      user_id,
      lesson_media_id,
      event_type,
      reason,
      details
    )
    select
      revoked.id,
      revoked.user_id,
      revoked.lesson_media_id,
      'revoked'::public.playback_event_type,
      'ENROLLMENT_NOT_ACTIVE',
      jsonb_build_object('enrollment_id', new.id, 'status', new.status)
    from revoked;
  end if;

  return new;
end;
$$;

revoke all on function private.revoke_enrollment_playback_tokens() from public, anon, authenticated;

drop trigger if exists enrollments_revoke_playback_tokens on public.enrollments;
create trigger enrollments_revoke_playback_tokens
after update of status, starts_at, expires_at on public.enrollments
for each row execute function private.revoke_enrollment_playback_tokens();
