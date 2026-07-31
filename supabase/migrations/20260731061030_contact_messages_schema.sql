-- FASE B22: solicitações de contato persistentes e auditáveis.

create type public.contact_message_status as enum ('new', 'in_progress', 'resolved', 'spam');
create type public.contact_message_event_type as enum ('submitted', 'status_changed', 'resolved', 'marked_spam');

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status public.contact_message_status not null default 'new',
  idempotency_key uuid not null unique,
  submitted_at timestamptz not null default statement_timestamp(),
  handled_at timestamptz,
  handled_by_user_id uuid references auth.users(id) on delete restrict,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint contact_messages_reference_format_chk check (reference_code ~ '^CONTATO-[A-F0-9]{16}$'),
  constraint contact_messages_name_chk check (char_length(btrim(name)) between 2 and 150),
  constraint contact_messages_email_chk check (
    char_length(btrim(email)) between 5 and 320
    and btrim(email) ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  constraint contact_messages_subject_chk check (char_length(btrim(subject)) between 3 and 200),
  constraint contact_messages_body_chk check (char_length(btrim(message)) between 10 and 5000),
  constraint contact_messages_resolution_state_chk check (
    (status in ('new'::public.contact_message_status, 'in_progress'::public.contact_message_status)
      and handled_at is null
      and handled_by_user_id is null)
    or
    (status in ('resolved'::public.contact_message_status, 'spam'::public.contact_message_status)
      and handled_at is not null
      and handled_by_user_id is not null
      and char_length(btrim(resolution_note)) between 3 and 2000)
  )
);

create index contact_messages_status_submitted_idx
  on public.contact_messages (status, submitted_at desc);
create index contact_messages_user_submitted_idx
  on public.contact_messages (user_id, submitted_at desc);
create index contact_messages_handled_by_idx
  on public.contact_messages (handled_by_user_id);
create index contact_messages_email_submitted_idx
  on public.contact_messages (lower(email), submitted_at desc);

create table public.contact_message_events (
  id uuid primary key default gen_random_uuid(),
  contact_message_id uuid not null references public.contact_messages(id) on delete restrict,
  event_type public.contact_message_event_type not null,
  from_status public.contact_message_status,
  to_status public.contact_message_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp()
);

create index contact_message_events_message_created_idx
  on public.contact_message_events (contact_message_id, created_at desc);
create index contact_message_events_actor_idx
  on public.contact_message_events (actor_user_id);

create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;
alter table public.contact_messages force row level security;
alter table public.contact_message_events enable row level security;
alter table public.contact_message_events force row level security;

revoke all on public.contact_messages from public, anon, authenticated;
revoke all on public.contact_message_events from public, anon, authenticated;
grant all on public.contact_messages to service_role;
grant all on public.contact_message_events to service_role;
