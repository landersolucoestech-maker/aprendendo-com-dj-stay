-- FASE B35: quota transacional e retenção auditável de incidentes do frontend.

create type public.frontend_error_maintenance_action as enum (
  'retention_purge'
);

create table public.frontend_error_maintenance_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action public.frontend_error_maintenance_action not null,
  retention_days smallint not null,
  cutoff_at timestamptz not null,
  affected_rows integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint frontend_error_maintenance_retention_chk check (
    retention_days between 30 and 3650
  ),
  constraint frontend_error_maintenance_affected_chk check (affected_rows >= 0),
  constraint frontend_error_maintenance_metadata_chk check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 4096
  )
);

create index frontend_error_maintenance_events_actor_idx
  on public.frontend_error_maintenance_events (actor_user_id);
create index frontend_error_maintenance_events_created_idx
  on public.frontend_error_maintenance_events (created_at desc);

alter table public.frontend_error_maintenance_events enable row level security;
alter table public.frontend_error_maintenance_events force row level security;

create policy frontend_error_maintenance_direct_access_denied
on public.frontend_error_maintenance_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

revoke all on public.frontend_error_maintenance_events from public, anon, authenticated;
grant all on public.frontend_error_maintenance_events to service_role;

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
  v_recent_count integer := 0;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0::bigint)
  );

  select * into v_record
  from public.frontend_error_events
  where event_id = p_event_id;

  if found then
    if v_record.user_id = v_user_id then
      return jsonb_build_object(
        'id', v_record.id,
        'event_id', v_record.event_id,
        'persisted', true,
        'duplicate', true,
        'occurred_at', v_record.occurred_at
      );
    end if;

    raise exception 'FRONTEND_ERROR_EVENT_ID_CONFLICT' using errcode = '23505';
  end if;

  select count(*)::integer
  into v_recent_count
  from public.frontend_error_events
  where user_id = v_user_id
    and occurred_at >= statement_timestamp() - interval '1 hour';

  if v_recent_count >= 120 then
    raise exception 'FRONTEND_ERROR_RATE_LIMITED' using errcode = '54000';
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

create function private.purge_frontend_error_events(
  p_retention_days integer default 90,
  p_limit integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_retention_days integer := coalesce(p_retention_days, 90);
  v_limit integer := coalesce(p_limit, 1000);
  v_cutoff timestamptz;
  v_affected_rows integer := 0;
  v_maintenance_id uuid;
begin
  if v_actor is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_retention_days not between 30 and 3650 then
    raise exception 'FRONTEND_ERROR_RETENTION_INVALID' using errcode = '22023';
  end if;

  if v_limit not between 1 and 5000 then
    raise exception 'FRONTEND_ERROR_PURGE_LIMIT_INVALID' using errcode = '22023';
  end if;

  v_cutoff := statement_timestamp() - pg_catalog.make_interval(days => v_retention_days);

  with candidates as (
    select event_record.id
    from public.frontend_error_events event_record
    where event_record.status in (
      'resolved'::public.frontend_error_status,
      'ignored'::public.frontend_error_status
    )
      and event_record.resolved_at < v_cutoff
    order by event_record.resolved_at, event_record.id
    limit v_limit
    for update skip locked
  ), deleted as (
    delete from public.frontend_error_events event_record
    using candidates
    where event_record.id = candidates.id
    returning event_record.id
  )
  select count(*)::integer into v_affected_rows from deleted;

  insert into public.frontend_error_maintenance_events (
    actor_user_id,
    action,
    retention_days,
    cutoff_at,
    affected_rows,
    metadata
  ) values (
    v_actor,
    'retention_purge'::public.frontend_error_maintenance_action,
    v_retention_days,
    v_cutoff,
    v_affected_rows,
    jsonb_build_object('batch_limit', v_limit)
  )
  returning id into v_maintenance_id;

  return jsonb_build_object(
    'maintenance_event_id', v_maintenance_id,
    'action', 'retention_purge',
    'retention_days', v_retention_days,
    'cutoff_at', v_cutoff,
    'affected_rows', v_affected_rows,
    'batch_limit', v_limit
  );
end;
$$;

create function public.purge_frontend_error_events(
  p_retention_days integer default 90,
  p_limit integer default 1000
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.purge_frontend_error_events(p_retention_days, p_limit)
$$;

revoke all on function private.purge_frontend_error_events(integer, integer)
from public, anon, authenticated;
grant execute on function private.purge_frontend_error_events(integer, integer)
to authenticated;

revoke all on function public.purge_frontend_error_events(integer, integer)
from public, anon;
grant execute on function public.purge_frontend_error_events(integer, integer)
to authenticated;
