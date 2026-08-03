-- FASE B99: paginação real da caixa administrativa de contatos.

create or replace function private.get_contact_messages_admin(
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
    'total', (
      select count(*)
      from public.contact_messages message_record
      where (p_status is null or message_record.status = p_status)
        and (
          v_search is null
          or message_record.reference_code ilike '%' || v_search || '%'
          or message_record.name ilike '%' || v_search || '%'
          or message_record.email ilike '%' || v_search || '%'
          or message_record.subject ilike '%' || v_search || '%'
        )
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
      ) order by message_record.submitted_at desc, message_record.id desc)
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
        order by submitted_at desc, id desc
        limit v_limit offset v_offset
      ) message_record
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.get_contact_messages_admin(
  public.contact_message_status,
  text,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function private.get_contact_messages_admin(
  public.contact_message_status,
  text,
  integer,
  integer
) to authenticated;
