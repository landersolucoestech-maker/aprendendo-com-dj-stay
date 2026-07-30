create or replace function private.sync_enrollment_asset_grants(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments;
begin
  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  delete from public.asset_access_grants
  where enrollment_id = v_enrollment.id;

  if v_enrollment.status = 'active'::public.enrollment_status
    and v_enrollment.starts_at <= statement_timestamp()
    and (v_enrollment.expires_at is null or v_enrollment.expires_at > statement_timestamp()) then
    insert into public.asset_access_grants (
      asset_id,
      user_id,
      granted_by_user_id,
      enrollment_id,
      expires_at
    )
    select
      assets.id,
      v_enrollment.user_id,
      coalesce(v_enrollment.granted_by_user_id, assets.created_by_user_id),
      v_enrollment.id,
      v_enrollment.expires_at
    from public.assets
    join public.aulas on aulas.id = assets.lesson_id
    join public.modulos on modulos.id = aulas.modulo_id
    where modulos.course_id = v_enrollment.course_id
      and assets.state = 'published'::public.asset_state
      and assets.deleted_at is null
    on conflict (asset_id, user_id, enrollment_id) where enrollment_id is not null
    do update set
      expires_at = excluded.expires_at,
      granted_by_user_id = excluded.granted_by_user_id,
      created_at = statement_timestamp();
  end if;
end;
$$;

revoke all on function private.sync_enrollment_asset_grants(uuid) from public, anon, authenticated;

create or replace function private.grant_course_enrollment(
  p_user_id uuid,
  p_course_id uuid,
  p_starts_at timestamptz default statement_timestamp(),
  p_expires_at timestamptz default null,
  p_reason text default null
)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_enrollment public.enrollments;
  v_previous_status public.enrollment_status;
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.user_roles where user_id = p_user_id and role = 'aluno'::public.app_role) then
    raise exception 'STUDENT_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'COURSE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_starts_at is null or (p_expires_at is not null and p_expires_at <= p_starts_at) then
    raise exception 'INVALID_ACCESS_WINDOW' using errcode = '22023';
  end if;

  if p_reason is not null and char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'INVALID_REASON' using errcode = '22023';
  end if;

  select status into v_previous_status
  from public.enrollments
  where user_id = p_user_id and course_id = p_course_id;

  insert into public.enrollments (
    user_id,
    course_id,
    status,
    source,
    starts_at,
    expires_at,
    granted_by_user_id,
    status_reason,
    suspended_at,
    revoked_at
  ) values (
    p_user_id,
    p_course_id,
    'active'::public.enrollment_status,
    'manual_grant'::public.enrollment_source,
    p_starts_at,
    p_expires_at,
    v_actor,
    nullif(btrim(p_reason), ''),
    null,
    null
  )
  on conflict (user_id, course_id) do update set
    status = 'active'::public.enrollment_status,
    source = 'manual_grant'::public.enrollment_source,
    source_reference = null,
    payment_confirmed_at = null,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    granted_by_user_id = excluded.granted_by_user_id,
    status_reason = excluded.status_reason,
    suspended_at = null,
    revoked_at = null
  returning * into v_enrollment;

  perform private.log_enrollment_event(
    v_enrollment.id,
    case when v_previous_status is null then 'created'::public.enrollment_event_type else 'activated'::public.enrollment_event_type end,
    v_previous_status,
    'active'::public.enrollment_status,
    jsonb_build_object('source', 'manual_grant', 'reason', p_reason)
  );
  perform private.sync_enrollment_asset_grants(v_enrollment.id);
  return v_enrollment;
end;
$$;

create or replace function private.confirm_course_purchase(
  p_user_id uuid,
  p_course_id uuid,
  p_source_reference text,
  p_confirmed_at timestamptz,
  p_starts_at timestamptz default statement_timestamp(),
  p_expires_at timestamptz default null
)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments;
  v_previous_status public.enrollment_status;
begin
  if not (select private.is_service_role()) then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.user_roles where user_id = p_user_id and role = 'aluno'::public.app_role) then
    raise exception 'STUDENT_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'COURSE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_source_reference is null or char_length(btrim(p_source_reference)) not between 8 and 200 then
    raise exception 'INVALID_PAYMENT_REFERENCE' using errcode = '22023';
  end if;

  if p_confirmed_at is null or p_confirmed_at > statement_timestamp() + interval '5 minutes' then
    raise exception 'INVALID_PAYMENT_CONFIRMATION_TIME' using errcode = '22023';
  end if;

  if p_starts_at is null or (p_expires_at is not null and p_expires_at <= p_starts_at) then
    raise exception 'INVALID_ACCESS_WINDOW' using errcode = '22023';
  end if;

  select status into v_previous_status
  from public.enrollments
  where user_id = p_user_id and course_id = p_course_id;

  insert into public.enrollments (
    user_id,
    course_id,
    status,
    source,
    source_reference,
    payment_confirmed_at,
    starts_at,
    expires_at,
    granted_by_user_id,
    status_reason,
    suspended_at,
    revoked_at
  ) values (
    p_user_id,
    p_course_id,
    'active'::public.enrollment_status,
    'purchase'::public.enrollment_source,
    btrim(p_source_reference),
    p_confirmed_at,
    p_starts_at,
    p_expires_at,
    null,
    null,
    null,
    null
  )
  on conflict (user_id, course_id) do update set
    status = 'active'::public.enrollment_status,
    source = 'purchase'::public.enrollment_source,
    source_reference = excluded.source_reference,
    payment_confirmed_at = excluded.payment_confirmed_at,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at,
    granted_by_user_id = null,
    status_reason = null,
    suspended_at = null,
    revoked_at = null
  returning * into v_enrollment;

  perform private.log_enrollment_event(
    v_enrollment.id,
    'payment_confirmed'::public.enrollment_event_type,
    v_previous_status,
    'active'::public.enrollment_status,
    jsonb_build_object('source_reference', p_source_reference, 'confirmed_at', p_confirmed_at)
  );
  perform private.sync_enrollment_asset_grants(v_enrollment.id);
  return v_enrollment;
end;
$$;

create or replace function private.renew_course_enrollment(
  p_enrollment_id uuid,
  p_expires_at timestamptz
)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments;
  v_from public.enrollment_status;
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role
    and not (select private.is_service_role()) then
    raise exception 'TRUSTED_ACTOR_REQUIRED' using errcode = '42501';
  end if;

  select * into v_enrollment from public.enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expires_at is null or p_expires_at <= greatest(statement_timestamp(), v_enrollment.starts_at) then
    raise exception 'INVALID_ACCESS_EXPIRY' using errcode = '22023';
  end if;
  if v_enrollment.status = 'revoked'::public.enrollment_status then
    raise exception 'REVOKED_ENROLLMENT_CANNOT_RENEW' using errcode = '22023';
  end if;

  v_from := v_enrollment.status;
  update public.enrollments
  set status = 'active'::public.enrollment_status,
      expires_at = p_expires_at,
      suspended_at = null,
      status_reason = null
  where id = v_enrollment.id
  returning * into v_enrollment;

  perform private.log_enrollment_event(v_enrollment.id, 'renewed'::public.enrollment_event_type, v_from, 'active'::public.enrollment_status, jsonb_build_object('expires_at', p_expires_at));
  perform private.sync_enrollment_asset_grants(v_enrollment.id);
  return v_enrollment;
end;
$$;

create or replace function private.suspend_course_enrollment(p_enrollment_id uuid, p_reason text)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare v_enrollment public.enrollments; v_from public.enrollment_status;
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role
    and not (select private.is_service_role()) then
    raise exception 'TRUSTED_ACTOR_REQUIRED' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'INVALID_REASON' using errcode = '22023'; end if;
  select * into v_enrollment from public.enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_enrollment.status = 'revoked'::public.enrollment_status then raise exception 'REVOKED_ENROLLMENT_CANNOT_SUSPEND' using errcode = '22023'; end if;
  v_from := v_enrollment.status;
  update public.enrollments set status='suspended', status_reason=btrim(p_reason), suspended_at=statement_timestamp() where id=p_enrollment_id returning * into v_enrollment;
  perform private.log_enrollment_event(v_enrollment.id, 'suspended', v_from, 'suspended', jsonb_build_object('reason', p_reason));
  perform private.sync_enrollment_asset_grants(v_enrollment.id);
  return v_enrollment;
end;
$$;

create or replace function private.revoke_course_enrollment(p_enrollment_id uuid, p_reason text)
returns public.enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare v_enrollment public.enrollments; v_from public.enrollment_status;
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role
    and not (select private.is_service_role()) then
    raise exception 'TRUSTED_ACTOR_REQUIRED' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'INVALID_REASON' using errcode = '22023'; end if;
  select * into v_enrollment from public.enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  v_from := v_enrollment.status;
  update public.enrollments set status='revoked', status_reason=btrim(p_reason), revoked_at=statement_timestamp(), suspended_at=null where id=p_enrollment_id returning * into v_enrollment;
  perform private.log_enrollment_event(v_enrollment.id, 'revoked', v_from, 'revoked', jsonb_build_object('reason', p_reason));
  perform private.sync_enrollment_asset_grants(v_enrollment.id);
  return v_enrollment;
end;
$$;

create or replace function private.grant_asset_access(
  p_asset_id uuid,
  p_user_id uuid,
  p_expires_at timestamptz default null
)
returns public.asset_access_grants
language plpgsql
security definer
set search_path = ''
as $$
declare v_grant public.asset_access_grants;
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if not exists (select 1 from public.assets where id=p_asset_id and state='published' and deleted_at is null) then
    raise exception 'PUBLISHED_ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.user_roles where user_id=p_user_id and role='aluno') then
    raise exception 'STUDENT_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_expires_at is not null and p_expires_at <= statement_timestamp() then raise exception 'INVALID_GRANT_EXPIRY' using errcode='22023'; end if;
  insert into public.asset_access_grants (asset_id,user_id,granted_by_user_id,enrollment_id,expires_at)
  values (p_asset_id,p_user_id,(select auth.uid()),null,p_expires_at)
  on conflict (asset_id,user_id) where enrollment_id is null do update
  set granted_by_user_id=excluded.granted_by_user_id, expires_at=excluded.expires_at, created_at=statement_timestamp()
  returning * into v_grant;
  return v_grant;
end;
$$;

create or replace function private.revoke_asset_access(
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
  where asset_id = p_asset_id and user_id = p_user_id and enrollment_id is null;
  return found;
end;
$$;

grant execute on function private.grant_course_enrollment(uuid,uuid,timestamptz,timestamptz,text) to authenticated, service_role;
grant execute on function private.confirm_course_purchase(uuid,uuid,text,timestamptz,timestamptz,timestamptz) to service_role;
grant execute on function private.renew_course_enrollment(uuid,timestamptz) to authenticated, service_role;
grant execute on function private.suspend_course_enrollment(uuid,text) to authenticated, service_role;
grant execute on function private.revoke_course_enrollment(uuid,text) to authenticated, service_role;

create function public.grant_course_enrollment(
  p_user_id uuid,
  p_course_id uuid,
  p_starts_at timestamptz default statement_timestamp(),
  p_expires_at timestamptz default null,
  p_reason text default null
)
returns public.enrollments language sql security invoker set search_path=''
as $$ select private.grant_course_enrollment(p_user_id,p_course_id,p_starts_at,p_expires_at,p_reason) $$;

create function public.confirm_course_purchase(
  p_user_id uuid,
  p_course_id uuid,
  p_source_reference text,
  p_confirmed_at timestamptz,
  p_starts_at timestamptz default statement_timestamp(),
  p_expires_at timestamptz default null
)
returns public.enrollments language sql security invoker set search_path=''
as $$ select private.confirm_course_purchase(p_user_id,p_course_id,p_source_reference,p_confirmed_at,p_starts_at,p_expires_at) $$;

create function public.renew_course_enrollment(p_enrollment_id uuid, p_expires_at timestamptz)
returns public.enrollments language sql security invoker set search_path=''
as $$ select private.renew_course_enrollment(p_enrollment_id,p_expires_at) $$;

create function public.suspend_course_enrollment(p_enrollment_id uuid, p_reason text)
returns public.enrollments language sql security invoker set search_path=''
as $$ select private.suspend_course_enrollment(p_enrollment_id,p_reason) $$;

create function public.revoke_course_enrollment(p_enrollment_id uuid, p_reason text)
returns public.enrollments language sql security invoker set search_path=''
as $$ select private.revoke_course_enrollment(p_enrollment_id,p_reason) $$;

revoke all on function public.grant_course_enrollment(uuid,uuid,timestamptz,timestamptz,text) from public, anon;
revoke all on function public.confirm_course_purchase(uuid,uuid,text,timestamptz,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.renew_course_enrollment(uuid,timestamptz) from public, anon;
revoke all on function public.suspend_course_enrollment(uuid,text) from public, anon;
revoke all on function public.revoke_course_enrollment(uuid,text) from public, anon;
grant execute on function public.grant_course_enrollment(uuid,uuid,timestamptz,timestamptz,text) to authenticated, service_role;
grant execute on function public.confirm_course_purchase(uuid,uuid,text,timestamptz,timestamptz,timestamptz) to service_role;
grant execute on function public.renew_course_enrollment(uuid,timestamptz) to authenticated, service_role;
grant execute on function public.suspend_course_enrollment(uuid,text) to authenticated, service_role;
grant execute on function public.revoke_course_enrollment(uuid,text) to authenticated, service_role;
