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

  v_reference := 'SUP-' || upper(substr(encode(extensions.digest(gen_random_uuid()::text, 'sha256'), 'hex'), 1, 16));

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
