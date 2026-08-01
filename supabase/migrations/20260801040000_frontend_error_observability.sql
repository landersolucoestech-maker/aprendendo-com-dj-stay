-- FASE B31: observabilidade persistente e restrita de falhas não tratadas do frontend.

create type public.frontend_error_source as enum (
  'route_boundary',
  'window_error',
  'unhandled_rejection'
);

create type public.frontend_error_status as enum (
  'open',
  'acknowledged',
  'resolved',
  'ignored'
);

create table public.frontend_error_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,
  user_id uuid references auth.users(id) on delete set null,
  source public.frontend_error_source not null,
  route text not null,
  error_name text not null,
  error_message text not null,
  component_stack text,
  release text not null,
  status public.frontend_error_status not null default 'open',
  occurred_at timestamptz not null default statement_timestamp(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  handled_by_user_id uuid references auth.users(id) on delete restrict,
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint frontend_error_route_chk check (
    char_length(route) between 1 and 500
    and left(route, 1) = '/'
    and position('?' in route) = 0
    and position('#' in route) = 0
  ),
  constraint frontend_error_name_chk check (char_length(btrim(error_name)) between 1 and 150),
  constraint frontend_error_message_chk check (char_length(btrim(error_message)) between 1 and 2000),
  constraint frontend_error_component_stack_chk check (
    component_stack is null or char_length(component_stack) between 1 and 8000
  ),
  constraint frontend_error_release_chk check (char_length(btrim(release)) between 1 and 150),
  constraint frontend_error_metadata_size_chk check (octet_length(metadata::text) <= 4096),
  constraint frontend_error_lifecycle_chk check (
    (
      status = 'open'::public.frontend_error_status
      and acknowledged_at is null
      and resolved_at is null
      and handled_by_user_id is null
      and resolution_note is null
    )
    or
    (
      status = 'acknowledged'::public.frontend_error_status
      and acknowledged_at is not null
      and resolved_at is null
      and handled_by_user_id is not null
    )
    or
    (
      status in ('resolved'::public.frontend_error_status, 'ignored'::public.frontend_error_status)
      and acknowledged_at is not null
      and resolved_at is not null
      and handled_by_user_id is not null
      and char_length(btrim(resolution_note)) between 3 and 2000
    )
  )
);

create index frontend_error_events_status_occurred_idx
  on public.frontend_error_events (status, occurred_at desc);
create index frontend_error_events_source_occurred_idx
  on public.frontend_error_events (source, occurred_at desc);
create index frontend_error_events_user_occurred_idx
  on public.frontend_error_events (user_id, occurred_at desc);
create index frontend_error_events_route_occurred_idx
  on public.frontend_error_events (route, occurred_at desc);
create index frontend_error_events_release_occurred_idx
  on public.frontend_error_events (release, occurred_at desc);

create trigger frontend_error_events_set_updated_at
before update on public.frontend_error_events
for each row execute function public.set_updated_at();

alter table public.frontend_error_events enable row level security;
alter table public.frontend_error_events force row level security;

create policy frontend_error_events_direct_access_denied
on public.frontend_error_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

revoke all on public.frontend_error_events from public, anon, authenticated;
grant all on public.frontend_error_events to service_role;

create function private.capture_frontend_error(
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

  if p_event_id is null then
    raise exception 'FRONTEND_ERROR_EVENT_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_source is null then
    raise exception 'FRONTEND_ERROR_SOURCE_REQUIRED' using errcode = '22023';
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
  where event_id = p_event_id;

  return jsonb_build_object(
    'id', v_record.id,
    'event_id', v_record.event_id,
    'persisted', true,
    'duplicate', v_inserted = 0,
    'occurred_at', v_record.occurred_at
  );
end;
$$;

create function private.get_frontend_error_dashboard(
  p_status public.frontend_error_status default null,
  p_source public.frontend_error_source default null,
  p_route text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_route text := nullif(btrim(p_route), '');
begin
  if auth.uid() is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'open', (select count(*) from public.frontend_error_events where status = 'open'),
      'acknowledged', (select count(*) from public.frontend_error_events where status = 'acknowledged'),
      'resolved', (select count(*) from public.frontend_error_events where status = 'resolved'),
      'ignored', (select count(*) from public.frontend_error_events where status = 'ignored')
    ),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event_record.id,
        'event_id', event_record.event_id,
        'user_id', event_record.user_id,
        'source', event_record.source,
        'route', event_record.route,
        'error_name', event_record.error_name,
        'error_message', event_record.error_message,
        'component_stack', event_record.component_stack,
        'release', event_record.release,
        'status', event_record.status,
        'occurred_at', event_record.occurred_at,
        'acknowledged_at', event_record.acknowledged_at,
        'resolved_at', event_record.resolved_at,
        'handled_by_user_id', event_record.handled_by_user_id,
        'resolution_note', event_record.resolution_note,
        'metadata', event_record.metadata
      ) order by event_record.occurred_at desc), '[]'::jsonb)
      from (
        select *
        from public.frontend_error_events
        where (p_status is null or status = p_status)
          and (p_source is null or source = p_source)
          and (v_route is null or route ilike '%' || v_route || '%')
        order by occurred_at desc
        limit v_limit offset v_offset
      ) event_record
    ), '[]'::jsonb)
  );
end;
$$;

create function private.update_frontend_error_status(
  p_frontend_error_id uuid,
  p_status public.frontend_error_status,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_note text := nullif(btrim(p_note), '');
  v_record public.frontend_error_events%rowtype;
begin
  if v_actor is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_frontend_error_id is null or p_status is null then
    raise exception 'FRONTEND_ERROR_STATUS_INPUT_INVALID' using errcode = '22023';
  end if;

  if p_status in ('resolved'::public.frontend_error_status, 'ignored'::public.frontend_error_status)
    and (v_note is null or char_length(v_note) not between 3 and 2000)
  then
    raise exception 'FRONTEND_ERROR_RESOLUTION_NOTE_REQUIRED' using errcode = '22023';
  end if;

  select * into v_record
  from public.frontend_error_events
  where id = p_frontend_error_id
  for update;

  if not found then
    raise exception 'FRONTEND_ERROR_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.frontend_error_events
  set status = p_status,
      acknowledged_at = case
        when p_status = 'open'::public.frontend_error_status then null
        else coalesce(v_record.acknowledged_at, statement_timestamp())
      end,
      resolved_at = case
        when p_status in ('resolved'::public.frontend_error_status, 'ignored'::public.frontend_error_status)
          then statement_timestamp()
        else null
      end,
      handled_by_user_id = case
        when p_status = 'open'::public.frontend_error_status then null
        else v_actor
      end,
      resolution_note = case
        when p_status in ('resolved'::public.frontend_error_status, 'ignored'::public.frontend_error_status)
          then v_note
        when p_status = 'acknowledged'::public.frontend_error_status
          then v_note
        else null
      end
  where id = p_frontend_error_id
  returning * into v_record;

  return jsonb_build_object(
    'id', v_record.id,
    'status', v_record.status,
    'acknowledged_at', v_record.acknowledged_at,
    'resolved_at', v_record.resolved_at,
    'handled_by_user_id', v_record.handled_by_user_id,
    'resolution_note', v_record.resolution_note
  );
end;
$$;

create function public.capture_frontend_error(
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
language sql
security invoker
set search_path = ''
as $$
  select private.capture_frontend_error(
    p_event_id,
    p_source,
    p_route,
    p_error_name,
    p_error_message,
    p_component_stack,
    p_release,
    p_metadata
  )
$$;

create function public.get_frontend_error_dashboard(
  p_status public.frontend_error_status default null,
  p_source public.frontend_error_source default null,
  p_route text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_frontend_error_dashboard(
    p_status,
    p_source,
    p_route,
    p_limit,
    p_offset
  )
$$;

create function public.update_frontend_error_status(
  p_frontend_error_id uuid,
  p_status public.frontend_error_status,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_frontend_error_status(
    p_frontend_error_id,
    p_status,
    p_note
  )
$$;

revoke all on function private.capture_frontend_error(uuid, public.frontend_error_source, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.get_frontend_error_dashboard(public.frontend_error_status, public.frontend_error_source, text, integer, integer) from public, anon, authenticated;
revoke all on function private.update_frontend_error_status(uuid, public.frontend_error_status, text) from public, anon, authenticated;

grant execute on function private.capture_frontend_error(uuid, public.frontend_error_source, text, text, text, text, text, jsonb) to authenticated;
grant execute on function private.get_frontend_error_dashboard(public.frontend_error_status, public.frontend_error_source, text, integer, integer) to authenticated;
grant execute on function private.update_frontend_error_status(uuid, public.frontend_error_status, text) to authenticated;

revoke all on function public.capture_frontend_error(uuid, public.frontend_error_source, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.get_frontend_error_dashboard(public.frontend_error_status, public.frontend_error_source, text, integer, integer) from public, anon;
revoke all on function public.update_frontend_error_status(uuid, public.frontend_error_status, text) from public, anon;

grant execute on function public.capture_frontend_error(uuid, public.frontend_error_source, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.get_frontend_error_dashboard(public.frontend_error_status, public.frontend_error_source, text, integer, integer) to authenticated;
grant execute on function public.update_frontend_error_status(uuid, public.frontend_error_status, text) to authenticated;
