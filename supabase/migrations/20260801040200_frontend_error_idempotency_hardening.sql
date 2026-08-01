-- FASE B31: impede colisão de event_id entre usuários autenticados distintos.

create or replace function private.capture_frontend_error(
  p_event_id uuid,
  p_source public.frontend_error_source,
  p_route text,
  p_error_name text,
  p_error_message text,
  p_component_stack text default null,
  p_release text default 'unknown',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_route text := split_part(split_part(coalesce(nullif(btrim(p_route), ''), '/'), '?', 1), '#', 1);
  v_error_name text := nullif(btrim(p_error_name), '');
  v_error_message text := nullif(btrim(p_error_message), '');
  v_component_stack text := nullif(btrim(p_component_stack), '');
  v_release text := coalesce(nullif(btrim(p_release), ''), 'unknown');
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_record public.frontend_error_events%rowtype;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_event_id is null or p_source is null then
    raise exception 'FRONTEND_ERROR_ID_OR_SOURCE_REQUIRED' using errcode = '22023';
  end if;

  if char_length(v_route) not between 1 and 500 or left(v_route, 1) <> '/' then
    raise exception 'FRONTEND_ERROR_ROUTE_INVALID' using errcode = '22023';
  end if;

  if v_error_name is null or char_length(v_error_name) not between 1 and 150 then
    raise exception 'FRONTEND_ERROR_NAME_INVALID' using errcode = '22023';
  end if;

  if v_error_message is null then
    raise exception 'FRONTEND_ERROR_MESSAGE_INVALID' using errcode = '22023';
  end if;

  v_error_message := regexp_replace(
    v_error_message,
    '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}',
    '[EMAIL_REDACTED]',
    'gi'
  );
  v_error_message := regexp_replace(
    v_error_message,
    'eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}',
    '[JWT_REDACTED]',
    'g'
  );
  v_error_message := regexp_replace(
    v_error_message,
    '(bearer[[:space:]]+)[A-Za-z0-9._~+\-/=]{16,}',
    E'\\1[TOKEN_REDACTED]',
    'gi'
  );
  v_error_message := left(v_error_message, 2000);

  if v_component_stack is not null then
    v_component_stack := regexp_replace(
      v_component_stack,
      '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}',
      '[EMAIL_REDACTED]',
      'gi'
    );
    v_component_stack := regexp_replace(
      v_component_stack,
      'eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}',
      '[JWT_REDACTED]',
      'g'
    );
    v_component_stack := left(v_component_stack, 8000);
  end if;

  if char_length(v_release) > 150 then
    raise exception 'FRONTEND_ERROR_RELEASE_INVALID' using errcode = '22023';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' or octet_length(v_metadata::text) > 4096 then
    raise exception 'FRONTEND_ERROR_METADATA_INVALID' using errcode = '22023';
  end if;

  insert into public.frontend_error_events (
    event_id,
    user_id,
    source,
    route,
    error_name,
    error_message,
    component_stack,
    release,
    metadata
  ) values (
    p_event_id,
    v_user_id,
    p_source,
    v_route,
    v_error_name,
    v_error_message,
    v_component_stack,
    v_release,
    v_metadata
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;

  select * into v_record
  from public.frontend_error_events
  where event_id = p_event_id
    and user_id = v_user_id;

  if not found then
    raise exception 'FRONTEND_ERROR_EVENT_ID_CONFLICT' using errcode = '23505';
  end if;

  return jsonb_build_object(
    'id', v_record.id,
    'event_id', v_record.event_id,
    'persisted', true,
    'duplicate', v_inserted = 0,
    'occurred_at', v_record.occurred_at
  );
end;
$$;
