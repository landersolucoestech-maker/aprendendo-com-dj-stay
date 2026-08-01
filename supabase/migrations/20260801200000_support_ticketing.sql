create type public.support_ticket_status as enum (
  'open',
  'awaiting_support',
  'awaiting_student',
  'resolved',
  'closed'
);
create type public.support_ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.support_message_author_role as enum ('student', 'support');
create type public.support_ticket_event_type as enum ('created', 'message_added', 'status_changed');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  subject text not null,
  category text not null,
  priority public.support_ticket_priority not null default 'normal',
  status public.support_ticket_status not null default 'open',
  idempotency_key uuid not null unique,
  last_message_at timestamptz not null default statement_timestamp(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint support_ticket_reference_chk check (reference_code ~ '^SUP-[A-F0-9]{16}$'),
  constraint support_ticket_subject_chk check (char_length(btrim(subject)) between 5 and 200),
  constraint support_ticket_category_chk check (char_length(btrim(category)) between 2 and 80),
  constraint support_ticket_resolution_chk check (
    (status not in ('resolved'::public.support_ticket_status, 'closed'::public.support_ticket_status) and resolved_at is null)
    or (status in ('resolved'::public.support_ticket_status, 'closed'::public.support_ticket_status) and resolved_at is not null)
  ),
  constraint support_ticket_closed_chk check (
    (status <> 'closed'::public.support_ticket_status and closed_at is null)
    or (status = 'closed'::public.support_ticket_status and closed_at is not null)
  )
);

create index support_tickets_user_updated_idx on public.support_tickets (user_id, updated_at desc);
create index support_tickets_status_priority_idx on public.support_tickets (status, priority, updated_at desc);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  author_role public.support_message_author_role not null,
  body text not null,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default statement_timestamp(),
  constraint support_ticket_message_body_chk check (char_length(btrim(body)) between 2 and 5000)
);

create index support_ticket_messages_ticket_created_idx
  on public.support_ticket_messages (ticket_id, created_at asc, id asc);

create table public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete restrict,
  event_type public.support_ticket_event_type not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  from_status public.support_ticket_status,
  to_status public.support_ticket_status not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp()
);

create index support_ticket_events_ticket_created_idx
  on public.support_ticket_events (ticket_id, created_at desc);

create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;
alter table public.support_tickets force row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_messages force row level security;
alter table public.support_ticket_events enable row level security;
alter table public.support_ticket_events force row level security;

revoke all on public.support_tickets from public, anon, authenticated;
revoke all on public.support_ticket_messages from public, anon, authenticated;
revoke all on public.support_ticket_events from public, anon, authenticated;
grant all on public.support_tickets to service_role;
grant all on public.support_ticket_messages to service_role;
grant all on public.support_ticket_events to service_role;

create or replace function private.create_support_ticket(
  p_subject text,
  p_category text,
  p_priority public.support_ticket_priority,
  p_message text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.support_tickets;
  v_reference text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_ticket
  from public.support_tickets
  where idempotency_key = p_idempotency_key and user_id = v_user_id;

  if found then
    return jsonb_build_object('id', v_ticket.id, 'reference_code', v_ticket.reference_code);
  end if;

  v_reference := 'SUP-' || upper(substr(encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'), 1, 16));

  insert into public.support_tickets (
    reference_code, user_id, subject, category, priority, status, idempotency_key
  ) values (
    v_reference,
    v_user_id,
    btrim(p_subject),
    btrim(p_category),
    coalesce(p_priority, 'normal'::public.support_ticket_priority),
    'awaiting_support'::public.support_ticket_status,
    p_idempotency_key
  ) returning * into v_ticket;

  insert into public.support_ticket_messages (
    ticket_id, author_user_id, author_role, body, idempotency_key
  ) values (
    v_ticket.id, v_user_id, 'student'::public.support_message_author_role, btrim(p_message), gen_random_uuid()
  );

  insert into public.support_ticket_events (
    ticket_id, event_type, actor_user_id, to_status, details
  ) values (
    v_ticket.id,
    'created'::public.support_ticket_event_type,
    v_user_id,
    v_ticket.status,
    jsonb_build_object('priority', v_ticket.priority, 'category', v_ticket.category)
  );

  return jsonb_build_object('id', v_ticket.id, 'reference_code', v_ticket.reference_code);
end;
$$;

create or replace function private.add_my_support_message(
  p_ticket_id uuid,
  p_message text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.support_tickets;
  v_message public.support_ticket_messages;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_message
  from public.support_ticket_messages
  where idempotency_key = p_idempotency_key and author_user_id = v_user_id;
  if found then
    return jsonb_build_object('id', v_message.id, 'ticket_id', v_message.ticket_id);
  end if;

  select * into v_ticket
  from public.support_tickets
  where id = p_ticket_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'SUPPORT_TICKET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_ticket.status = 'closed'::public.support_ticket_status then
    raise exception 'SUPPORT_TICKET_CLOSED' using errcode = 'P0001';
  end if;

  insert into public.support_ticket_messages (
    ticket_id, author_user_id, author_role, body, idempotency_key
  ) values (
    v_ticket.id, v_user_id, 'student'::public.support_message_author_role, btrim(p_message), p_idempotency_key
  ) returning * into v_message;

  update public.support_tickets
  set status = 'awaiting_support'::public.support_ticket_status,
      resolved_at = null,
      closed_at = null,
      last_message_at = statement_timestamp()
  where id = v_ticket.id;

  insert into public.support_ticket_events (
    ticket_id, event_type, actor_user_id, from_status, to_status, details
  ) values (
    v_ticket.id,
    'message_added'::public.support_ticket_event_type,
    v_user_id,
    v_ticket.status,
    'awaiting_support'::public.support_ticket_status,
    jsonb_build_object('message_id', v_message.id)
  );

  return jsonb_build_object('id', v_message.id, 'ticket_id', v_ticket.id);
end;
$$;

create or replace function private.get_my_support_tickets(
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.support_tickets where user_id = v_user_id),
    'tickets', coalesce((
      select jsonb_agg(ticket_payload order by updated_at desc, id desc)
      from (
        select
          ticket.id,
          ticket.reference_code,
          ticket.subject,
          ticket.category,
          ticket.priority,
          ticket.status,
          ticket.last_message_at,
          ticket.created_at,
          ticket.updated_at,
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', message.id,
              'author_role', message.author_role,
              'body', message.body,
              'created_at', message.created_at
            ) order by message.created_at asc, message.id asc)
            from public.support_ticket_messages message
            where message.ticket_id = ticket.id
          ), '[]'::jsonb) as messages
        from public.support_tickets ticket
        where ticket.user_id = v_user_id
        order by ticket.updated_at desc, ticket.id desc
        limit v_limit offset v_offset
      ) ticket_payload
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.get_support_admin_dashboard(
  p_status public.support_ticket_status default null,
  p_priority public.support_ticket_priority default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(p_search), '');
begin
  if auth.uid() is null or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total', (select count(*) from public.support_tickets),
      'awaiting_support', (select count(*) from public.support_tickets where status = 'awaiting_support'),
      'awaiting_student', (select count(*) from public.support_tickets where status = 'awaiting_student'),
      'urgent', (select count(*) from public.support_tickets where priority = 'urgent' and status <> 'closed')
    ),
    'total', (
      select count(*)
      from public.support_tickets ticket
      left join auth.users account on account.id = ticket.user_id
      where (p_status is null or ticket.status = p_status)
        and (p_priority is null or ticket.priority = p_priority)
        and (v_search is null or ticket.reference_code ilike '%' || v_search || '%' or ticket.subject ilike '%' || v_search || '%' or coalesce(account.email, '') ilike '%' || v_search || '%')
    ),
    'tickets', coalesce((
      select jsonb_agg(ticket_payload order by updated_at desc, id desc)
      from (
        select
          ticket.id,
          ticket.reference_code,
          ticket.user_id,
          account.email as customer_email,
          ticket.subject,
          ticket.category,
          ticket.priority,
          ticket.status,
          ticket.last_message_at,
          ticket.created_at,
          ticket.updated_at,
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', message.id,
              'author_role', message.author_role,
              'body', message.body,
              'created_at', message.created_at
            ) order by message.created_at asc, message.id asc)
            from public.support_ticket_messages message
            where message.ticket_id = ticket.id
          ), '[]'::jsonb) as messages
        from public.support_tickets ticket
        left join auth.users account on account.id = ticket.user_id
        where (p_status is null or ticket.status = p_status)
          and (p_priority is null or ticket.priority = p_priority)
          and (v_search is null or ticket.reference_code ilike '%' || v_search || '%' or ticket.subject ilike '%' || v_search || '%' or coalesce(account.email, '') ilike '%' || v_search || '%')
        order by ticket.updated_at desc, ticket.id desc
        limit v_limit offset v_offset
      ) ticket_payload
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text,
  p_status public.support_ticket_status default 'awaiting_student',
  p_idempotency_key uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_ticket public.support_tickets;
  v_message public.support_ticket_messages;
  v_resolved_at timestamptz;
  v_closed_at timestamptz;
begin
  if v_actor is null or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_message from public.support_ticket_messages where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('id', v_message.id, 'ticket_id', v_message.ticket_id);
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found then
    raise exception 'SUPPORT_TICKET_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_resolved_at := case when p_status in ('resolved', 'closed') then coalesce(v_ticket.resolved_at, statement_timestamp()) else null end;
  v_closed_at := case when p_status = 'closed' then statement_timestamp() else null end;

  insert into public.support_ticket_messages (
    ticket_id, author_user_id, author_role, body, idempotency_key
  ) values (
    v_ticket.id, v_actor, 'support'::public.support_message_author_role, btrim(p_message), p_idempotency_key
  ) returning * into v_message;

  update public.support_tickets
  set status = p_status,
      resolved_at = v_resolved_at,
      closed_at = v_closed_at,
      last_message_at = statement_timestamp()
  where id = v_ticket.id;

  insert into public.support_ticket_events (
    ticket_id, event_type, actor_user_id, from_status, to_status, details
  ) values (
    v_ticket.id,
    case when v_ticket.status = p_status then 'message_added' else 'status_changed' end,
    v_actor,
    v_ticket.status,
    p_status,
    jsonb_build_object('message_id', v_message.id)
  );

  return jsonb_build_object('id', v_message.id, 'ticket_id', v_ticket.id, 'status', p_status);
end;
$$;

create or replace function public.create_support_ticket(
  p_subject text,
  p_category text,
  p_priority public.support_ticket_priority,
  p_message text,
  p_idempotency_key uuid
)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.create_support_ticket(p_subject, p_category, p_priority, p_message, p_idempotency_key);
$$;
create or replace function public.add_my_support_message(p_ticket_id uuid, p_message text, p_idempotency_key uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.add_my_support_message(p_ticket_id, p_message, p_idempotency_key);
$$;
create or replace function public.get_my_support_tickets(p_limit integer default 25, p_offset integer default 0)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.get_my_support_tickets(p_limit, p_offset);
$$;
create or replace function public.get_support_admin_dashboard(
  p_status public.support_ticket_status default null,
  p_priority public.support_ticket_priority default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.get_support_admin_dashboard(p_status, p_priority, p_search, p_limit, p_offset);
$$;
create or replace function public.admin_reply_support_ticket(
  p_ticket_id uuid,
  p_message text,
  p_status public.support_ticket_status default 'awaiting_student',
  p_idempotency_key uuid default gen_random_uuid()
)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.admin_reply_support_ticket(p_ticket_id, p_message, p_status, p_idempotency_key);
$$;

revoke all on function public.create_support_ticket(text,text,public.support_ticket_priority,text,uuid) from public, anon;
revoke all on function public.add_my_support_message(uuid,text,uuid) from public, anon;
revoke all on function public.get_my_support_tickets(integer,integer) from public, anon;
revoke all on function public.get_support_admin_dashboard(public.support_ticket_status,public.support_ticket_priority,text,integer,integer) from public, anon;
revoke all on function public.admin_reply_support_ticket(uuid,text,public.support_ticket_status,uuid) from public, anon;
grant execute on function public.create_support_ticket(text,text,public.support_ticket_priority,text,uuid) to authenticated, service_role;
grant execute on function public.add_my_support_message(uuid,text,uuid) to authenticated, service_role;
grant execute on function public.get_my_support_tickets(integer,integer) to authenticated, service_role;
grant execute on function public.get_support_admin_dashboard(public.support_ticket_status,public.support_ticket_priority,text,integer,integer) to authenticated, service_role;
grant execute on function public.admin_reply_support_ticket(uuid,text,public.support_ticket_status,uuid) to authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.create_support_ticket(text,text,public.support_ticket_priority,text,uuid) to authenticated;
grant execute on function private.add_my_support_message(uuid,text,uuid) to authenticated;
grant execute on function private.get_my_support_tickets(integer,integer) to authenticated;
grant execute on function private.get_support_admin_dashboard(public.support_ticket_status,public.support_ticket_priority,text,integer,integer) to authenticated;
grant execute on function private.admin_reply_support_ticket(uuid,text,public.support_ticket_status,uuid) to authenticated;
