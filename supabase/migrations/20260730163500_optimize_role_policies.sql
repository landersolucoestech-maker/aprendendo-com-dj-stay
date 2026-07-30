drop policy if exists user_roles_owner_select on public.user_roles;
drop policy if exists user_roles_admin_all on public.user_roles;
drop policy if exists modulos_aluno_select on public.modulos;
drop policy if exists modulos_admin_all on public.modulos;
drop policy if exists aulas_aluno_select on public.aulas;
drop policy if exists aulas_admin_all on public.aulas;
drop policy if exists lesson_files_aluno_select on public.lesson_files;
drop policy if exists lesson_files_admin_all on public.lesson_files;
drop policy if exists progresso_aulas_aluno_owner_select on public.progresso_aulas;
drop policy if exists progresso_aulas_aluno_owner_insert on public.progresso_aulas;
drop policy if exists progresso_aulas_aluno_owner_update on public.progresso_aulas;
drop policy if exists progresso_aulas_aluno_owner_delete on public.progresso_aulas;
drop policy if exists progresso_aulas_admin_all on public.progresso_aulas;
drop policy if exists user_profiles_owner_select on public.user_profiles;
drop policy if exists user_profiles_owner_insert on public.user_profiles;
drop policy if exists user_profiles_owner_update on public.user_profiles;
drop policy if exists user_profiles_owner_delete on public.user_profiles;
drop policy if exists user_profiles_admin_all on public.user_profiles;

create policy user_roles_select
on public.user_roles for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) is not null
    and (select auth.uid()) = user_id
  )
);

create policy user_roles_admin_insert
on public.user_roles for insert to authenticated
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy user_roles_admin_update
on public.user_roles for update to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role)
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy user_roles_admin_delete
on public.user_roles for delete to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy modulos_select
on public.modulos for select to authenticated
using ((select private.current_user_role()) in ('aluno'::public.app_role, 'administrador_proprietario'::public.app_role));
create policy modulos_admin_insert
on public.modulos for insert to authenticated
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy modulos_admin_update
on public.modulos for update to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role)
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy modulos_admin_delete
on public.modulos for delete to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy aulas_select
on public.aulas for select to authenticated
using ((select private.current_user_role()) in ('aluno'::public.app_role, 'administrador_proprietario'::public.app_role));
create policy aulas_admin_insert
on public.aulas for insert to authenticated
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy aulas_admin_update
on public.aulas for update to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role)
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy aulas_admin_delete
on public.aulas for delete to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy lesson_files_select
on public.lesson_files for select to authenticated
using ((select private.current_user_role()) in ('aluno'::public.app_role, 'administrador_proprietario'::public.app_role));
create policy lesson_files_admin_insert
on public.lesson_files for insert to authenticated
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy lesson_files_admin_update
on public.lesson_files for update to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role)
with check ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);
create policy lesson_files_admin_delete
on public.lesson_files for delete to authenticated
using ((select private.current_user_role()) = 'administrador_proprietario'::public.app_role);

create policy progresso_aulas_select
on public.progresso_aulas for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
  )
);
create policy progresso_aulas_insert
on public.progresso_aulas for insert to authenticated
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
  )
);
create policy progresso_aulas_update
on public.progresso_aulas for update to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
  )
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
  )
);
create policy progresso_aulas_delete
on public.progresso_aulas for delete to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and (select auth.uid()) = user_id
  )
);

create policy user_profiles_select
on public.user_profiles for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) is not null
    and (select auth.uid()) = user_id
  )
);
create policy user_profiles_insert
on public.user_profiles for insert to authenticated
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) is not null
    and (select auth.uid()) = user_id
  )
);
create policy user_profiles_update
on public.user_profiles for update to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) is not null
    and (select auth.uid()) = user_id
  )
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) is not null
    and (select auth.uid()) = user_id
  )
);
create policy user_profiles_delete
on public.user_profiles for delete to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    (select private.current_user_role()) is not null
    and (select auth.uid()) = user_id
  )
);
