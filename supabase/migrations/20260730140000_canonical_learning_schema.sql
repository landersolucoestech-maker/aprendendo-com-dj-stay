-- Canonical baseline for the learning domain.
-- Storage, payments, affiliates and administration are intentionally deferred.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create table public.modulos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  ordem integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint modulos_titulo_length check (char_length(btrim(titulo)) between 1 and 200),
  constraint modulos_ordem_nonnegative check (ordem >= 0),
  constraint modulos_ordem_unique unique (ordem)
);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  titulo text not null,
  descricao text,
  video text,
  ordem integer not null default 0,
  duracao integer,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint aulas_titulo_length check (char_length(btrim(titulo)) between 1 and 200),
  constraint aulas_ordem_nonnegative check (ordem >= 0),
  constraint aulas_duracao_range check (duracao is null or duracao between 1 and 1440),
  constraint aulas_video_https check (video is null or video ~ '^https://[^[:space:]]+$'),
  constraint aulas_modulo_ordem_unique unique (modulo_id, ordem)
);

create table public.progresso_aulas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aula_id uuid not null references public.aulas(id) on delete cascade,
  completada boolean not null default false,
  progresso_percentual integer not null default 0,
  tempo_assistido integer not null default 0,
  ultima_visualizacao timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint progresso_percentual_range check (progresso_percentual between 0 and 100),
  constraint progresso_tempo_nonnegative check (tempo_assistido >= 0),
  constraint progresso_user_aula_unique unique (user_id, aula_id)
);

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint user_profiles_user_unique unique (user_id),
  constraint user_profiles_avatar_https check (avatar_url is null or avatar_url ~ '^https://[^[:space:]]+$')
);

create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas(id) on delete cascade,
  samples_file_path text,
  project_file_path text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint lesson_files_aula_unique unique (aula_id),
  constraint lesson_files_has_file check (samples_file_path is not null or project_file_path is not null),
  constraint lesson_files_samples_safe check (
    samples_file_path is null or (
      char_length(samples_file_path) between 1 and 1024
      and samples_file_path !~ '(^/|(^|/)\.\.(/|$))'
    )
  ),
  constraint lesson_files_project_safe check (
    project_file_path is null or (
      char_length(project_file_path) between 1 and 1024
      and project_file_path !~ '(^/|(^|/)\.\.(/|$))'
    )
  )
);

create index aulas_modulo_id_idx on public.aulas (modulo_id);
create index progresso_aulas_user_updated_idx on public.progresso_aulas (user_id, updated_at desc);
create index progresso_aulas_aula_id_idx on public.progresso_aulas (aula_id);

create trigger modulos_set_updated_at
before update on public.modulos
for each row execute function public.set_updated_at();

create trigger aulas_set_updated_at
before update on public.aulas
for each row execute function public.set_updated_at();

create trigger progresso_aulas_set_updated_at
before update on public.progresso_aulas
for each row execute function public.set_updated_at();

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger lesson_files_set_updated_at
before update on public.lesson_files
for each row execute function public.set_updated_at();

alter table public.modulos enable row level security;
alter table public.modulos force row level security;
alter table public.aulas enable row level security;
alter table public.aulas force row level security;
alter table public.progresso_aulas enable row level security;
alter table public.progresso_aulas force row level security;
alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.lesson_files enable row level security;
alter table public.lesson_files force row level security;

revoke all on table public.modulos from anon, authenticated;
revoke all on table public.aulas from anon, authenticated;
revoke all on table public.progresso_aulas from anon, authenticated;
revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.lesson_files from anon, authenticated;

grant select on table public.modulos to authenticated;
grant select on table public.aulas to authenticated;
grant select on table public.lesson_files to authenticated;
grant select, insert, update, delete on table public.progresso_aulas to authenticated;
grant select, insert, update, delete on table public.user_profiles to authenticated;

create policy modulos_authenticated_read
on public.modulos for select to authenticated
using (true);

create policy aulas_authenticated_read
on public.aulas for select to authenticated
using (true);

create policy lesson_files_authenticated_read
on public.lesson_files for select to authenticated
using (true);

create policy progresso_aulas_owner_select
on public.progresso_aulas for select to authenticated
using ((select auth.uid()) = user_id);

create policy progresso_aulas_owner_insert
on public.progresso_aulas for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy progresso_aulas_owner_update
on public.progresso_aulas for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy progresso_aulas_owner_delete
on public.progresso_aulas for delete to authenticated
using ((select auth.uid()) = user_id);

create policy user_profiles_owner_select
on public.user_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy user_profiles_owner_insert
on public.user_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy user_profiles_owner_update
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_profiles_owner_delete
on public.user_profiles for delete to authenticated
using ((select auth.uid()) = user_id);
