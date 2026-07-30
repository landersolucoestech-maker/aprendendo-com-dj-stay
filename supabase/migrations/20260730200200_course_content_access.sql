-- FASE B10: enrollment-aware learning content and asset grants.

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
    and (v_enrollment.expires_at is null or v_enrollment.expires_at > statement_timestamp())
    and exists (
      select 1
      from public.courses
      where courses.id = v_enrollment.course_id
        and courses.status = 'published'::public.course_status
    ) then
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
grant execute on function private.sync_enrollment_asset_grants(uuid) to service_role;

create or replace function private.sync_asset_enrollment_grants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.asset_access_grants
  where asset_id = new.id
    and enrollment_id is not null;

  if new.lesson_id is not null
    and new.state = 'published'::public.asset_state
    and new.deleted_at is null then
    insert into public.asset_access_grants (
      asset_id,
      user_id,
      granted_by_user_id,
      enrollment_id,
      expires_at
    )
    select
      new.id,
      enrollments.user_id,
      coalesce(enrollments.granted_by_user_id, new.created_by_user_id),
      enrollments.id,
      enrollments.expires_at
    from public.enrollments
    join public.modulos on modulos.course_id = enrollments.course_id
    join public.aulas on aulas.modulo_id = modulos.id
    join public.courses on courses.id = enrollments.course_id
    where aulas.id = new.lesson_id
      and courses.status = 'published'::public.course_status
      and enrollments.status = 'active'::public.enrollment_status
      and enrollments.starts_at <= statement_timestamp()
      and (enrollments.expires_at is null or enrollments.expires_at > statement_timestamp())
    on conflict (asset_id, user_id, enrollment_id) where enrollment_id is not null
    do update set
      expires_at = excluded.expires_at,
      granted_by_user_id = excluded.granted_by_user_id,
      created_at = statement_timestamp();
  end if;

  return new;
end;
$$;

revoke all on function private.sync_asset_enrollment_grants() from public, anon, authenticated;

drop trigger if exists assets_sync_enrollment_grants on public.assets;
create trigger assets_sync_enrollment_grants
after insert or update of state, deleted_at, lesson_id on public.assets
for each row execute function private.sync_asset_enrollment_grants();

-- Replace broad role-only content policies with enrollment-aware policies.
drop policy if exists modulos_select on public.modulos;
drop policy if exists aulas_select on public.aulas;
drop policy if exists progresso_aulas_select on public.progresso_aulas;
drop policy if exists progresso_aulas_insert on public.progresso_aulas;
drop policy if exists progresso_aulas_update on public.progresso_aulas;
drop policy if exists progresso_aulas_delete on public.progresso_aulas;

create policy modulos_select
on public.modulos for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select private.has_active_course_access((select auth.uid()), modulos.course_id))
  )
);

create policy aulas_select
on public.aulas for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select modulos.course_id from public.modulos where modulos.id = aulas.modulo_id)
    ))
  )
);

create policy progresso_aulas_select
on public.progresso_aulas for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select private.lesson_course_id(progresso_aulas.aula_id))
    ))
  )
);

create policy progresso_aulas_insert
on public.progresso_aulas for insert to authenticated
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select private.lesson_course_id(progresso_aulas.aula_id))
    ))
  )
);

create policy progresso_aulas_update
on public.progresso_aulas for update to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select private.lesson_course_id(progresso_aulas.aula_id))
    ))
  )
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select private.lesson_course_id(progresso_aulas.aula_id))
    ))
  )
);

create policy progresso_aulas_delete
on public.progresso_aulas for delete to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select private.lesson_course_id(progresso_aulas.aula_id))
    ))
  )
);
