alter function public.prepare_asset_upload(public.asset_purpose, text, text, bigint, text, uuid) set schema private;
alter function public.confirm_asset_upload(uuid) set schema private;
alter function public.transition_asset_state(uuid, public.asset_state) set schema private;
alter function public.fail_asset_upload(uuid, text, boolean) set schema private;
alter function public.grant_asset_access(uuid, uuid, timestamptz) set schema private;
alter function public.revoke_asset_access(uuid, uuid) set schema private;

revoke all on function private.prepare_asset_upload(public.asset_purpose, text, text, bigint, text, uuid) from public, anon;
revoke all on function private.confirm_asset_upload(uuid) from public, anon;
revoke all on function private.transition_asset_state(uuid, public.asset_state) from public, anon;
revoke all on function private.fail_asset_upload(uuid, text, boolean) from public, anon;
revoke all on function private.grant_asset_access(uuid, uuid, timestamptz) from public, anon;
revoke all on function private.revoke_asset_access(uuid, uuid) from public, anon;
grant execute on function private.prepare_asset_upload(public.asset_purpose, text, text, bigint, text, uuid) to authenticated, service_role;
grant execute on function private.confirm_asset_upload(uuid) to authenticated, service_role;
grant execute on function private.transition_asset_state(uuid, public.asset_state) to authenticated, service_role;
grant execute on function private.fail_asset_upload(uuid, text, boolean) to authenticated, service_role;
grant execute on function private.grant_asset_access(uuid, uuid, timestamptz) to authenticated, service_role;
grant execute on function private.revoke_asset_access(uuid, uuid) to authenticated, service_role;

create function public.prepare_asset_upload(
  p_purpose public.asset_purpose,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_idempotency_key text,
  p_lesson_id uuid default null
)
returns public.assets
language sql
security invoker
set search_path = ''
as $$
  select private.prepare_asset_upload(
    p_purpose,
    p_original_name,
    p_mime_type,
    p_size_bytes,
    p_idempotency_key,
    p_lesson_id
  )
$$;

create function public.confirm_asset_upload(p_asset_id uuid)
returns public.assets
language sql
security invoker
set search_path = ''
as $$
  select private.confirm_asset_upload(p_asset_id)
$$;

create function public.transition_asset_state(
  p_asset_id uuid,
  p_target_state public.asset_state
)
returns public.assets
language sql
security invoker
set search_path = ''
as $$
  select private.transition_asset_state(p_asset_id, p_target_state)
$$;

create function public.fail_asset_upload(
  p_asset_id uuid,
  p_reason text,
  p_object_removed boolean default false
)
returns public.assets
language sql
security invoker
set search_path = ''
as $$
  select private.fail_asset_upload(p_asset_id, p_reason, p_object_removed)
$$;

create function public.grant_asset_access(
  p_asset_id uuid,
  p_user_id uuid,
  p_expires_at timestamptz default null
)
returns public.asset_access_grants
language sql
security invoker
set search_path = ''
as $$
  select private.grant_asset_access(p_asset_id, p_user_id, p_expires_at)
$$;

create function public.revoke_asset_access(
  p_asset_id uuid,
  p_user_id uuid
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_asset_access(p_asset_id, p_user_id)
$$;

revoke all on function public.prepare_asset_upload(public.asset_purpose, text, text, bigint, text, uuid) from public, anon;
revoke all on function public.confirm_asset_upload(uuid) from public, anon;
revoke all on function public.transition_asset_state(uuid, public.asset_state) from public, anon;
revoke all on function public.fail_asset_upload(uuid, text, boolean) from public, anon;
revoke all on function public.grant_asset_access(uuid, uuid, timestamptz) from public, anon;
revoke all on function public.revoke_asset_access(uuid, uuid) from public, anon;
grant execute on function public.prepare_asset_upload(public.asset_purpose, text, text, bigint, text, uuid) to authenticated, service_role;
grant execute on function public.confirm_asset_upload(uuid) to authenticated, service_role;
grant execute on function public.transition_asset_state(uuid, public.asset_state) to authenticated, service_role;
grant execute on function public.fail_asset_upload(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.grant_asset_access(uuid, uuid, timestamptz) to authenticated, service_role;
grant execute on function public.revoke_asset_access(uuid, uuid) to authenticated, service_role;
