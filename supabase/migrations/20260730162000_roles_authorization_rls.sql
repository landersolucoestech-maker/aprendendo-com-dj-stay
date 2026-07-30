create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create type public.app_role as enum (
  'aluno',
  'afiliado',
  'administrador_proprietario'
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'aluno'::public.app_role,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp()
);

create trigger user_roles_set_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

revoke all on table public.user_roles from public, anon, authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;
grant select, insert, update, delete on table public.user_roles to service_role;

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select user_roles.role
  from public.user_roles
  where user_roles.user_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'false'
  limit 1
$$;

revoke all on function private.current_user_role() from public, anon;
grant execute on function private.current_user_role() to authenticated, service_role;

create or replace function private.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'aluno'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user_role() from public, anon, authenticated;

drop trigger if exists on_auth_user_role_created on auth.users;
create trigger on_auth_user_role_created
after insert on auth.users
for each row execute function private.handle_new_user_role();

insert into public.user_roles (user_id, role)
select users.id, 'aluno'::public.app_role
from auth.users as users
on conflict (user_id) do nothing;

create policy user_roles_owner_select
on public.user_roles
for select
to authenticated
using (
  (select private.current_user_role()) is not null
  and (select auth.uid()) = user_id
);

create policy user_roles_admin_all
on public.user_roles
for all
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

drop policy if exists modulos_authenticated_read on public.modulos;
drop policy if exists aulas_authenticated_read on public.aulas;
drop policy if exists lesson_files_authenticated_read on public.lesson_files;

grant select, insert, update, delete on table public.modulos to authenticated, service_role;
grant select, insert, update, delete on table public.aulas to authenticated, service_role;
grant select, insert, update, delete on table public.lesson_files to authenticated, service_role;

create policy modulos_aluno_select
on public.modulos
for select
to authenticated
using (
  (select private.current_user_role()) = 'aluno'::public.app_role
);

create policy modulos_admin_all
on public.modulos
for all
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy aulas_aluno_select
on public.aulas
for select
to authenticated
using (
  (select private.current_user_role()) = 'aluno'::public.app_role
);

create policy aulas_admin_all
on public.aulas
for all
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

create policy lesson_files_aluno_select
on public.lesson_files
for select
to authenticated
using (
  (select private.current_user_role()) = 'aluno'::public.app_role
);

create policy lesson_files_admin_all
on public.lesson_files
for all
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

drop policy if exists progresso_aulas_owner_select on public.progresso_aulas;
drop policy if exists progresso_aulas_owner_insert on public.progresso_aulas;
drop policy if exists progresso_aulas_owner_update on public.progresso_aulas;
drop policy if exists progresso_aulas_owner_delete on public.progresso_aulas;

grant select, insert, update, delete on table public.progresso_aulas to authenticated, service_role;

create policy progresso_aulas_aluno_owner_select
on public.progresso_aulas
for select
to authenticated
using (
  (select private.current_user_role()) = 'aluno'::public.app_role
  and (select auth.uid()) = user_id
);

create policy progresso_aulas_aluno_owner_insert
on public.progresso_aulas
for insert
to authenticated
with check (
  (select private.current_user_role()) = 'aluno'::public.app_role
  and (select auth.uid()) = user_id
);

create policy progresso_aulas_aluno_owner_update
on public.progresso_aulas
for update
to authenticated
using (
  (select private.current_user_role()) = 'aluno'::public.app_role
  and (select auth.uid()) = user_id
)
with check (
  (select private.current_user_role()) = 'aluno'::public.app_role
  and (select auth.uid()) = user_id
);

create policy progresso_aulas_aluno_owner_delete
on public.progresso_aulas
for delete
to authenticated
using (
  (select private.current_user_role()) = 'aluno'::public.app_role
  and (select auth.uid()) = user_id
);

create policy progresso_aulas_admin_all
on public.progresso_aulas
for all
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

drop policy if exists user_profiles_owner_select on public.user_profiles;
drop policy if exists user_profiles_owner_insert on public.user_profiles;
drop policy if exists user_profiles_owner_update on public.user_profiles;
drop policy if exists user_profiles_owner_delete on public.user_profiles;

grant select, insert, update, delete on table public.user_profiles to authenticated, service_role;

create policy user_profiles_owner_select
on public.user_profiles
for select
to authenticated
using (
  (select private.current_user_role()) is not null
  and (select auth.uid()) = user_id
);

create policy user_profiles_owner_insert
on public.user_profiles
for insert
to authenticated
with check (
  (select private.current_user_role()) is not null
  and (select auth.uid()) = user_id
);

create policy user_profiles_owner_update
on public.user_profiles
for update
to authenticated
using (
  (select private.current_user_role()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select private.current_user_role()) is not null
  and (select auth.uid()) = user_id
);

create policy user_profiles_owner_delete
on public.user_profiles
for delete
to authenticated
using (
  (select private.current_user_role()) is not null
  and (select auth.uid()) = user_id
);

create policy user_profiles_admin_all
on public.user_profiles
for all
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
)
with check (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke all on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
revoke all on sequences from anon, authenticated, service_role;
