begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

do $$
begin
  create type public.app_role as enum ('student', 'instructor', 'support', 'admin', 'owner');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  document_number text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.instructor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  headline text,
  website_url text,
  social_links jsonb not null default '{}'::jsonb,
  payout_status text not null default 'not_configured' check (payout_status in ('not_configured', 'pending', 'active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = (select auth.uid())
       and ur.role = required_role
  );
$$;

create or replace function private.has_any_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.user_roles ur
     where ur.user_id = (select auth.uid())
       and ur.role = any(required_roles)
  );
$$;

revoke all on function private.has_role(public.app_role) from public, anon;
revoke all on function private.has_any_role(public.app_role[]) from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated, service_role;
grant execute on function private.has_any_role(public.app_role[]) to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.assign_user_role(target_user_id uuid, target_role public.app_role)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role]) then
    raise exception 'Insufficient permissions';
  end if;

  if target_role = 'owner' and not private.has_role('owner') then
    raise exception 'Only an owner can grant the owner role';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user_id, target_role, (select auth.uid()))
  on conflict (user_id, role) do nothing;
end;
$$;

create or replace function public.revoke_user_role(target_user_id uuid, target_role public.app_role)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role]) then
    raise exception 'Insufficient permissions';
  end if;

  if target_role = 'owner' and not private.has_role('owner') then
    raise exception 'Only an owner can revoke the owner role';
  end if;

  delete from public.user_roles
   where user_id = target_user_id
     and role = target_role;
end;
$$;

revoke all on function public.assign_user_role(uuid, public.app_role) from public, anon;
revoke all on function public.revoke_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.assign_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.revoke_user_role(uuid, public.app_role) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists instructor_profiles_set_updated_at on public.instructor_profiles;
create trigger instructor_profiles_set_updated_at
  before update on public.instructor_profiles
  for each row execute function private.set_updated_at();

insert into public.profiles (id, full_name, phone, created_at, updated_at)
select
  u.id,
  nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), ''),
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  u.created_at,
  now()
from auth.users u
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'student'::public.app_role
from auth.users u
on conflict do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'owner'::public.app_role
from auth.users u
where not exists (
  select 1 from public.user_roles where role = 'owner'
)
order by u.created_at asc
limit 1
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.instructor_profiles enable row level security;

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or private.has_any_role(array['support'::public.app_role, 'admin'::public.app_role, 'owner'::public.app_role])
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles for update
to authenticated
using (
  id = (select auth.uid())
  or private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role])
)
with check (
  id = (select auth.uid())
  or private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role])
);

drop policy if exists user_roles_select_own_or_admin on public.user_roles;
create policy user_roles_select_own_or_admin
on public.user_roles for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role])
);

drop policy if exists instructor_profiles_public_select on public.instructor_profiles;
create policy instructor_profiles_public_select
on public.instructor_profiles for select
to anon, authenticated
using (true);

drop policy if exists instructor_profiles_manage_own_or_admin on public.instructor_profiles;
create policy instructor_profiles_manage_own_or_admin
on public.instructor_profiles for all
to authenticated
using (
  user_id = (select auth.uid())
  or private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role])
)
with check (
  user_id = (select auth.uid())
  or private.has_any_role(array['admin'::public.app_role, 'owner'::public.app_role])
);

create index if not exists user_roles_role_user_idx on public.user_roles(role, user_id);
create index if not exists profiles_status_idx on public.profiles(status);

grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.instructor_profiles to anon, authenticated;
grant insert, update, delete on public.instructor_profiles to authenticated;

commit;
