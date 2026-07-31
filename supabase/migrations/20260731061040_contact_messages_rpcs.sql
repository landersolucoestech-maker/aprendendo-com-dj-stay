-- FASE B22: submissão idempotente e tratamento administrativo de contatos.

create function private.submit_contact_message(
  p_name text,
  p_email text,
  p_subject text,
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
  v_name text := btrim(p_name);
  v_email text := lower(btrim(p_email));
  v_subject text := btrim(p_subject);
  v_message text := btrim(p_message);
  v_record public.contact_messages%rowtype;
  v_reference text;
  v_attempt integer;
begin
  if p_idempotency_key is null then
    raise exception 'CONTACT_IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;
  if v_name is null or char_length(v_name) not between 2 and 150 then
    raise exception 'CONTACT_NAME_INVALID' using errcode = '22023';
  end if;
  if v_email is null
    or char_length(v_email) not between 5 and 320
    or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  then
    raise exception 'CONTACT_EMAIL_INVALID' using errcode = '22023';
  end if;
  if v_subject is null or char_length(v_subject) not between 3 and 200 then
    raise exception 'CONTACT_SUBJECT_INVALID' using errcode = '22023';
  end if;
  if v_message is null or char_length(v_message) not between 10 and 5000 then
    raise exception 'CONTACT_MESSAGE_INVALID' using errcode = '22023';
  end if;

  select * into v_record
  from public.contact_messages
  where idempotency_key = p_idempotency_key;

  if found then
    if v_record.name <> v_name
      or v_record.email <> v_email
      or v_record.subject <> v_subject
      or v_record.message <> v_message
      or v_record.user_id is distinct from v_user_id
    then
      raise exception 'CONTACT_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;

    return jsonb_build_object(
      'id', v_record.id,
      'reference_code', v_record.reference_code,
      'status', v_record.status,
      'submitted_at', v_record.submitted_at,
      'persisted', true,
      'duplicate', true
    );
  end if;

  for v_attempt in 1..10 loop
    v_reference := 'CONTATO-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 16));
    exit when not exists (
      select 1 from public.contact_messages where reference_code = v_reference
    );
  end loop;

  if exists (select 1 from public.contact_messages where reference_code = v_reference) then
    raise exception 'CONTACT_REFERENCE_GENERATION_FAILED' using errcode = 'P0001';
  end if;

  insert into public.contact_messages (
    reference_code,
    user_id,
    name,
    email,
    subject,
    message,
    idempotency_key,
    metadata
  ) values (
    v_reference,
    v_user_id,
    v_name,
    v_email,
    v_subject,
    v_message,
    p_idempotency_key,
    jsonb_build_object('authenticated', v_user_id is not null)
  )
  returning * into v_record;

  insert into public.contact_message_events (
    contact_message_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    details
  ) values (
    v_record.id,
    'submitted'::public.contact_message_event_type,
    null,
    'new'::public.contact_message_status,
    v_user_id,
    jsonb_build_object('reference_code', v_record.reference_code)
  );

  return jsonb_build_object(
    'id', v_record.id,
    'reference_code', v_record.reference_code,
    'status', v_record.status,
    'submitted_at', v_record.submitted_at,
    'persisted', true,
    'duplicate', false
  );
end;
$$;

create function private.get_contact_messages_admin(
  p_status public.contact_message_status default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'new', (select count(*) from public.contact_messages where status = 'new'),
      'in_progress', (select count(*) from public.contact_messages where status = 'in_progress'),
      'resolved', (select count(*) from public.contact_messages where status = 'resolved'),
      'spam', (select count(*) from public.contact_messages where status = 'spam')
    ),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', message_record.id,
        'reference_code', message_record.reference_code,
        'user_id', message_record.user_id,
        'name', message_record.name,
        'email', message_record.email,
        'subject', message_record.subject,
        'message', message_record.message,
        'status', message_record.status,
        'submitted_at', message_record.submitted_at,
        'handled_at', message_record.handled_at,
        'handled_by_user_id', message_record.handled_by_user_id,
        'resolution_note', message_record.resolution_note,
        'event_count', (
          select count(*)
          from public.contact_message_events event_record
          where event_record.contact_message_id = message_record.id
        )
      ) order by message_record.submitted_at desc)
      from (
        select *
        from public.contact_messages
        where (p_status is null or status = p_status)
          and (
            v_search is null
            or reference_code ilike '%' || v_search || '%'
            or name ilike '%' || v_search || '%'
            or email ilike '%' || v_search || '%'
            or subject ilike '%' || v_search || '%'
          )
        order by submitted_at desc
        limit v_limit offset v_offset
      ) message_record
    ), '[]'::jsonb)
  );
end;
$$;

create function private.update_contact_message_status(
  p_contact_message_id uuid,
  p_status public.contact_message_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_record public.contact_messages%rowtype;
  v_from_status public.contact_message_status;
  v_note text := nullif(btrim(p_note), '');
  v_event_type public.contact_message_event_type;
begin
  if v_actor is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_status is null then
    raise exception 'CONTACT_STATUS_REQUIRED' using errcode = '22023';
  end if;

  select * into v_record
  from public.contact_messages
  where id = p_contact_message_id
  for update;

  if not found then
    raise exception 'CONTACT_MESSAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_record.status = p_status then
    return jsonb_build_object(
      'id', v_record.id,
      'reference_code', v_record.reference_code,
      'status', v_record.status,
      'handled_at', v_record.handled_at,
      'duplicate', true
    );
  end if;

  if p_status in ('resolved'::public.contact_message_status, 'spam'::public.contact_message_status)
    and (v_note is null or char_length(v_note) not between 3 and 2000)
  then
    raise exception 'CONTACT_RESOLUTION_NOTE_REQUIRED' using errcode = '22023';
  end if;

  v_from_status := v_record.status;
  v_event_type := case p_status
    when 'resolved'::public.contact_message_status then 'resolved'::public.contact_message_event_type
    when 'spam'::public.contact_message_status then 'marked_spam'::public.contact_message_event_type
    else 'status_changed'::public.contact_message_event_type
  end;

  update public.contact_messages
  set status = p_status,
      handled_at = case
        when p_status in ('resolved'::public.contact_message_status, 'spam'::public.contact_message_status)
          then statement_timestamp()
        else null
      end,
      handled_by_user_id = case
        when p_status in ('resolved'::public.contact_message_status, 'spam'::public.contact_message_status)
          then v_actor
        else null
      end,
      resolution_note = case
        when p_status in ('resolved'::public.contact_message_status, 'spam'::public.contact_message_status)
          then v_note
        else null
      end
  where id = v_record.id
  returning * into v_record;

  insert into public.contact_message_events (
    contact_message_id,
    event_type,
    from_status,
    to_status,
    actor_user_id,
    details
  ) values (
    v_record.id,
    v_event_type,
    v_from_status,
    v_record.status,
    v_actor,
    jsonb_build_object('note', v_note)
  );

  return jsonb_build_object(
    'id', v_record.id,
    'reference_code', v_record.reference_code,
    'status', v_record.status,
    'handled_at', v_record.handled_at,
    'duplicate', false
  );
end;
$$;

create function public.submit_contact_message(
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_idempotency_key uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.submit_contact_message(
    p_name,
    p_email,
    p_subject,
    p_message,
    p_idempotency_key
  )
$$;

create function public.get_contact_messages_admin(
  p_status public.contact_message_status default null,
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_contact_messages_admin(p_status, p_search, p_limit, p_offset)
$$;

create function public.update_contact_message_status(
  p_contact_message_id uuid,
  p_status public.contact_message_status,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_contact_message_status(p_contact_message_id, p_status, p_note)
$$;

revoke all on function private.submit_contact_message(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function private.get_contact_messages_admin(public.contact_message_status, text, integer, integer) from public, anon, authenticated;
revoke all on function private.update_contact_message_status(uuid, public.contact_message_status, text) from public, anon, authenticated;

grant execute on function private.submit_contact_message(text, text, text, text, uuid) to anon, authenticated;
grant execute on function private.get_contact_messages_admin(public.contact_message_status, text, integer, integer) to authenticated;
grant execute on function private.update_contact_message_status(uuid, public.contact_message_status, text) to authenticated;

revoke all on function public.submit_contact_message(text, text, text, text, uuid) from public;
revoke all on function public.get_contact_messages_admin(public.contact_message_status, text, integer, integer) from public, anon;
revoke all on function public.update_contact_message_status(uuid, public.contact_message_status, text) from public, anon;

grant execute on function public.submit_contact_message(text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.get_contact_messages_admin(public.contact_message_status, text, integer, integer) to authenticated;
grant execute on function public.update_contact_message_status(uuid, public.contact_message_status, text) to authenticated;
