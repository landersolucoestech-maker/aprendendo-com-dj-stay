create type public.student_notification_type as enum (
  'support_reply',
  'payment_confirmed',
  'access_granted',
  'certificate_issued',
  'system'
);

create table public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.student_notification_type not null,
  title text not null,
  message text not null,
  action_path text,
  source_entity_type text,
  source_entity_id uuid,
  idempotency_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint student_notifications_title_chk check (char_length(btrim(title)) between 3 and 160),
  constraint student_notifications_message_chk check (char_length(btrim(message)) between 3 and 1000),
  constraint student_notifications_action_path_chk check (action_path is null or action_path ~ '^/'),
  constraint student_notifications_idempotency_chk check (char_length(btrim(idempotency_key)) between 8 and 300),
  unique (user_id, idempotency_key)
);

create index student_notifications_user_created_idx
  on public.student_notifications (user_id, created_at desc, id desc);
create index student_notifications_user_unread_idx
  on public.student_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.student_notifications enable row level security;
alter table public.student_notifications force row level security;
revoke all on public.student_notifications from public, anon, authenticated;
grant all on public.student_notifications to service_role;

create policy student_notifications_direct_access_denied
on public.student_notifications
as restrictive
for all
to public
using (false)
with check (false);

create or replace function private.create_student_notification(
  p_user_id uuid,
  p_type public.student_notification_type,
  p_title text,
  p_message text,
  p_action_path text,
  p_source_entity_type text,
  p_source_entity_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.student_notifications (
    user_id,
    type,
    title,
    message,
    action_path,
    source_entity_type,
    source_entity_id,
    idempotency_key
  ) values (
    p_user_id,
    p_type,
    btrim(p_title),
    btrim(p_message),
    nullif(btrim(p_action_path), ''),
    nullif(btrim(p_source_entity_type), ''),
    p_source_entity_id,
    btrim(p_idempotency_key)
  )
  on conflict (user_id, idempotency_key)
  do update set idempotency_key = excluded.idempotency_key
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function private.create_student_notification(uuid, public.student_notification_type, text, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function private.create_student_notification(uuid, public.student_notification_type, text, text, text, text, uuid, text) to service_role;

create or replace function private.get_my_student_notifications(
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 100));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (select count(*) from public.student_notifications where user_id = v_user_id),
    'unread_count', (select count(*) from public.student_notifications where user_id = v_user_id and read_at is null),
    'notifications', coalesce((
      select jsonb_agg(notification_payload order by created_at desc, id desc)
      from (
        select id, type, title, message, action_path, source_entity_type,
               source_entity_id, read_at, created_at
        from public.student_notifications
        where user_id = v_user_id
        order by created_at desc, id desc
        limit v_limit offset v_offset
      ) notification_payload
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.mark_my_student_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_read_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.student_notifications
  set read_at = coalesce(read_at, statement_timestamp())
  where id = p_notification_id and user_id = v_user_id
  returning read_at into v_read_at;

  if not found then
    raise exception 'NOTIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object('id', p_notification_id, 'read_at', v_read_at);
end;
$$;

create or replace function private.mark_all_my_student_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.student_notifications
  set read_at = statement_timestamp()
  where user_id = v_user_id and read_at is null;
  get diagnostics v_count = row_count;

  return jsonb_build_object('updated', v_count);
end;
$$;

create or replace function public.get_my_student_notifications(p_limit integer default 30, p_offset integer default 0)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_student_notifications(p_limit, p_offset);
$$;

create or replace function public.mark_my_student_notification_read(p_notification_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.mark_my_student_notification_read(p_notification_id);
$$;

create or replace function public.mark_all_my_student_notifications_read()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.mark_all_my_student_notifications_read();
$$;

revoke all on function public.get_my_student_notifications(integer, integer) from public, anon;
revoke all on function public.mark_my_student_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_my_student_notifications_read() from public, anon;
grant execute on function public.get_my_student_notifications(integer, integer) to authenticated, service_role;
grant execute on function public.mark_my_student_notification_read(uuid) to authenticated, service_role;
grant execute on function public.mark_all_my_student_notifications_read() to authenticated, service_role;
grant usage on schema private to authenticated, service_role;
grant execute on function private.get_my_student_notifications(integer, integer) to authenticated, service_role;
grant execute on function private.mark_my_student_notification_read(uuid) to authenticated, service_role;
grant execute on function private.mark_all_my_student_notifications_read() to authenticated, service_role;

create or replace function private.notify_support_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.support_tickets;
begin
  if new.author_role <> 'support'::public.support_message_author_role then
    return new;
  end if;

  select * into v_ticket from public.support_tickets where id = new.ticket_id;

  perform private.create_student_notification(
    v_ticket.user_id,
    'support_reply'::public.student_notification_type,
    'Nova resposta do suporte',
    'O suporte respondeu ao ticket ' || v_ticket.reference_code || '.',
    '/aluno/suporte',
    'support_ticket',
    v_ticket.id,
    'support-reply:' || new.id::text
  );

  return new;
end;
$$;

create trigger support_message_create_student_notification
after insert on public.support_ticket_messages
for each row execute function private.notify_support_reply();
