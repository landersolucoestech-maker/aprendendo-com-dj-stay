create or replace function public.grant_asset_access(
  p_asset_id uuid,
  p_user_id uuid,
  p_expires_at timestamptz default null
)
returns public.asset_access_grants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := (select private.current_user_role());
  v_grant public.asset_access_grants;
begin
  if v_role <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.assets
    where id = p_asset_id
      and state = 'published'::public.asset_state
      and deleted_at is null
  ) then
    raise exception 'PUBLISHED_ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.user_roles
    where user_id = p_user_id
      and role = 'aluno'::public.app_role
  ) then
    raise exception 'STUDENT_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if p_expires_at is not null and p_expires_at <= statement_timestamp() then
    raise exception 'INVALID_GRANT_EXPIRY' using errcode = '22023';
  end if;

  insert into public.asset_access_grants (asset_id, user_id, granted_by_user_id, expires_at)
  values (p_asset_id, p_user_id, (select auth.uid()), p_expires_at)
  on conflict (asset_id, user_id) do update
  set granted_by_user_id = excluded.granted_by_user_id,
      expires_at = excluded.expires_at,
      created_at = statement_timestamp()
  returning * into v_grant;

  return v_grant;
end;
$$;

create or replace function public.revoke_asset_access(
  p_asset_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  delete from public.asset_access_grants
  where asset_id = p_asset_id and user_id = p_user_id;

  return found;
end;
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
