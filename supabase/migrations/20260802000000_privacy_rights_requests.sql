create type public.privacy_rights_request_type as enum (
  'access_export',
  'correction',
  'deletion'
);

create type public.privacy_rights_request_status as enum (
  'submitted',
  'in_review',
  'completed',
  'rejected',
  'cancelled'
);

create table public.privacy_rights_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type public.privacy_rights_request_type not null,
  description text not null,
  status public.privacy_rights_request_status not null default 'submitted',
  admin_notes text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint privacy_rights_requests_description_check
    check (length(btrim(description)) between 10 and 4000),
  constraint privacy_rights_requests_admin_notes_check
    check (admin_notes is null or length(btrim(admin_notes)) between 1 and 4000),
  constraint privacy_rights_requests_handling_pair_check
    check ((handled_by is null) = (handled_at is null))
);

create unique index privacy_rights_requests_open_unique_idx
  on public.privacy_rights_requests (user_id, request_type)
  where status in ('submitted', 'in_review');
create index privacy_rights_requests_user_created_idx
  on public.privacy_rights_requests (user_id, created_at desc, id desc);
create index privacy_rights_requests_status_created_idx
  on public.privacy_rights_requests (status, created_at asc, id asc);
create index privacy_rights_requests_handled_by_idx
  on public.privacy_rights_requests (handled_by)
  where handled_by is not null;

create trigger privacy_rights_requests_set_updated_at
before update on public.privacy_rights_requests
for each row execute function public.set_updated_at();

create table public.privacy_rights_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.privacy_rights_requests(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  from_status public.privacy_rights_request_status,
  to_status public.privacy_rights_request_status,
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  constraint privacy_rights_request_events_action_check
    check (action in ('created', 'cancelled', 'status_changed')),
  constraint privacy_rights_request_events_notes_check
    check (notes is null or length(btrim(notes)) between 1 and 4000)
);

create index privacy_rights_request_events_request_created_idx
  on public.privacy_rights_request_events (request_id, created_at asc, id asc);
create index privacy_rights_request_events_actor_idx
  on public.privacy_rights_request_events (actor_user_id)
  where actor_user_id is not null;

alter table public.privacy_rights_requests enable row level security;
alter table public.privacy_rights_requests force row level security;
alter table public.privacy_rights_request_events enable row level security;
alter table public.privacy_rights_request_events force row level security;

revoke all on public.privacy_rights_requests from public, anon, authenticated;
revoke all on public.privacy_rights_request_events from public, anon, authenticated;
grant all on public.privacy_rights_requests to service_role;
grant all on public.privacy_rights_request_events to service_role;

create policy privacy_rights_requests_direct_access_denied
on public.privacy_rights_requests
as restrictive
for all
to public
using (false)
with check (false);

create policy privacy_rights_request_events_direct_access_denied
on public.privacy_rights_request_events
as restrictive
for all
to public
using (false)
with check (false);

create or replace function private.create_my_privacy_rights_request(
  p_request_type public.privacy_rights_request_type,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_description text := btrim(p_description);
  v_request public.privacy_rights_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if length(v_description) not between 10 and 4000 then
    raise exception 'PRIVACY_REQUEST_DESCRIPTION_INVALID' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.privacy_rights_requests
    where user_id = v_user_id
      and request_type = p_request_type
      and status in ('submitted', 'in_review')
  ) then
    raise exception 'OPEN_PRIVACY_REQUEST_ALREADY_EXISTS' using errcode = '23505';
  end if;

  insert into public.privacy_rights_requests (
    user_id,
    request_type,
    description
  ) values (
    v_user_id,
    p_request_type,
    v_description
  )
  returning * into v_request;

  insert into public.privacy_rights_request_events (
    request_id,
    actor_user_id,
    action,
    to_status
  ) values (
    v_request.id,
    v_user_id,
    'created',
    v_request.status
  );

  return to_jsonb(v_request);
exception
  when unique_violation then
    raise exception 'OPEN_PRIVACY_REQUEST_ALREADY_EXISTS' using errcode = '23505';
end;
$$;

create or replace function private.get_my_privacy_rights_requests(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (
      select count(*)
      from public.privacy_rights_requests request
      where request.user_id = v_user_id
    ),
    'requests', coalesce((
      select jsonb_agg(payload order by created_at desc, id desc)
      from (
        select
          request.id,
          request.request_type,
          request.description,
          request.status,
          request.admin_notes,
          request.handled_at,
          request.created_at,
          request.updated_at,
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', event.id,
              'action', event.action,
              'from_status', event.from_status,
              'to_status', event.to_status,
              'notes', event.notes,
              'created_at', event.created_at
            ) order by event.created_at asc, event.id asc)
            from public.privacy_rights_request_events event
            where event.request_id = request.id
          ), '[]'::jsonb) as events
        from public.privacy_rights_requests request
        where request.user_id = v_user_id
        order by request.created_at desc, request.id desc
        limit v_limit offset v_offset
      ) payload
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.cancel_my_privacy_rights_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.privacy_rights_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_request
  from public.privacy_rights_requests
  where id = p_request_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'PRIVACY_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_request.status <> 'submitted' then
    raise exception 'PRIVACY_REQUEST_CANNOT_BE_CANCELLED' using errcode = '22023';
  end if;

  update public.privacy_rights_requests
  set status = 'cancelled'
  where id = v_request.id
  returning * into v_request;

  insert into public.privacy_rights_request_events (
    request_id,
    actor_user_id,
    action,
    from_status,
    to_status
  ) values (
    v_request.id,
    v_user_id,
    'cancelled',
    'submitted',
    'cancelled'
  );

  return to_jsonb(v_request);
end;
$$;

create or replace function private.admin_get_privacy_rights_requests(
  p_status public.privacy_rights_request_status default null,
  p_request_type public.privacy_rights_request_type default null,
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
begin
  if auth.uid() is null or private.current_user_role() <> 'administrador_proprietario' then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (
      select count(*)
      from public.privacy_rights_requests request
      where (p_status is null or request.status = p_status)
        and (p_request_type is null or request.request_type = p_request_type)
    ),
    'requests', coalesce((
      select jsonb_agg(payload order by created_at asc, id asc)
      from (
        select
          request.id,
          request.user_id,
          profile.full_name as user_name,
          auth_user.email as user_email,
          request.request_type,
          request.description,
          request.status,
          request.admin_notes,
          request.handled_by,
          request.handled_at,
          request.created_at,
          request.updated_at,
          coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', event.id,
              'actor_user_id', event.actor_user_id,
              'action', event.action,
              'from_status', event.from_status,
              'to_status', event.to_status,
              'notes', event.notes,
              'created_at', event.created_at
            ) order by event.created_at asc, event.id asc)
            from public.privacy_rights_request_events event
            where event.request_id = request.id
          ), '[]'::jsonb) as events
        from public.privacy_rights_requests request
        join auth.users auth_user on auth_user.id = request.user_id
        left join public.user_profiles profile on profile.user_id = request.user_id
        where (p_status is null or request.status = p_status)
          and (p_request_type is null or request.request_type = p_request_type)
        order by request.created_at asc, request.id asc
        limit v_limit offset v_offset
      ) payload
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.admin_update_privacy_rights_request(
  p_request_id uuid,
  p_status public.privacy_rights_request_status,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_notes text := nullif(btrim(p_admin_notes), '');
  v_request public.privacy_rights_requests%rowtype;
  v_from_status public.privacy_rights_request_status;
begin
  if v_admin_id is null or private.current_user_role() <> 'administrador_proprietario' then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_status in ('submitted', 'cancelled') then
    raise exception 'PRIVACY_REQUEST_STATUS_INVALID' using errcode = '22023';
  end if;

  if p_status = 'rejected' and v_notes is null then
    raise exception 'ADMIN_NOTES_REQUIRED' using errcode = '22023';
  end if;

  if v_notes is not null and length(v_notes) > 4000 then
    raise exception 'ADMIN_NOTES_INVALID' using errcode = '22023';
  end if;

  select * into v_request
  from public.privacy_rights_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'PRIVACY_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_from_status := v_request.status;

  if v_from_status = 'submitted' and p_status not in ('in_review', 'completed', 'rejected') then
    raise exception 'PRIVACY_REQUEST_TRANSITION_INVALID' using errcode = '22023';
  elsif v_from_status = 'in_review' and p_status not in ('completed', 'rejected') then
    raise exception 'PRIVACY_REQUEST_TRANSITION_INVALID' using errcode = '22023';
  elsif v_from_status in ('completed', 'rejected', 'cancelled') then
    raise exception 'PRIVACY_REQUEST_ALREADY_FINAL' using errcode = '22023';
  end if;

  update public.privacy_rights_requests
  set
    status = p_status,
    admin_notes = v_notes,
    handled_by = case when p_status in ('completed', 'rejected') then v_admin_id else null end,
    handled_at = case when p_status in ('completed', 'rejected') then statement_timestamp() else null end
  where id = v_request.id
  returning * into v_request;

  insert into public.privacy_rights_request_events (
    request_id,
    actor_user_id,
    action,
    from_status,
    to_status,
    notes
  ) values (
    v_request.id,
    v_admin_id,
    'status_changed',
    v_from_status,
    p_status,
    v_notes
  );

  return to_jsonb(v_request);
end;
$$;

create or replace function public.create_my_privacy_rights_request(
  p_request_type public.privacy_rights_request_type,
  p_description text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_my_privacy_rights_request(p_request_type, p_description);
$$;

create or replace function public.get_my_privacy_rights_requests(
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_privacy_rights_requests(p_limit, p_offset);
$$;

create or replace function public.cancel_my_privacy_rights_request(p_request_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.cancel_my_privacy_rights_request(p_request_id);
$$;

create or replace function public.admin_get_privacy_rights_requests(
  p_status public.privacy_rights_request_status default null,
  p_request_type public.privacy_rights_request_type default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_get_privacy_rights_requests(
    p_status,
    p_request_type,
    p_limit,
    p_offset
  );
$$;

create or replace function public.admin_update_privacy_rights_request(
  p_request_id uuid,
  p_status public.privacy_rights_request_status,
  p_admin_notes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.admin_update_privacy_rights_request(
    p_request_id,
    p_status,
    p_admin_notes
  );
$$;

revoke all on function public.create_my_privacy_rights_request(public.privacy_rights_request_type, text) from public, anon;
revoke all on function public.get_my_privacy_rights_requests(integer, integer) from public, anon;
revoke all on function public.cancel_my_privacy_rights_request(uuid) from public, anon;
revoke all on function public.admin_get_privacy_rights_requests(public.privacy_rights_request_status, public.privacy_rights_request_type, integer, integer) from public, anon;
revoke all on function public.admin_update_privacy_rights_request(uuid, public.privacy_rights_request_status, text) from public, anon;

grant execute on function public.create_my_privacy_rights_request(public.privacy_rights_request_type, text) to authenticated, service_role;
grant execute on function public.get_my_privacy_rights_requests(integer, integer) to authenticated, service_role;
grant execute on function public.cancel_my_privacy_rights_request(uuid) to authenticated, service_role;
grant execute on function public.admin_get_privacy_rights_requests(public.privacy_rights_request_status, public.privacy_rights_request_type, integer, integer) to authenticated, service_role;
grant execute on function public.admin_update_privacy_rights_request(uuid, public.privacy_rights_request_status, text) to authenticated, service_role;

grant usage on schema private to authenticated, service_role;
grant execute on function private.create_my_privacy_rights_request(public.privacy_rights_request_type, text) to authenticated, service_role;
grant execute on function private.get_my_privacy_rights_requests(integer, integer) to authenticated, service_role;
grant execute on function private.cancel_my_privacy_rights_request(uuid) to authenticated, service_role;
grant execute on function private.admin_get_privacy_rights_requests(public.privacy_rights_request_status, public.privacy_rights_request_type, integer, integer) to authenticated, service_role;
grant execute on function private.admin_update_privacy_rights_request(uuid, public.privacy_rights_request_status, text) to authenticated, service_role;
