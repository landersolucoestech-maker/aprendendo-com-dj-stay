begin;

-- Five historical Lovable migrations use a dash after the timestamp and are
-- ignored by current Supabase CLI versions. Recreate only the required legacy
-- structures, without overwriting data in environments where they already exist.

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.modulos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  ordem integer not null default 0,
  curso_id uuid,
  criado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  video text,
  ordem integer not null default 0,
  modulo_id uuid references public.modulos(id) on delete cascade,
  duracao integer,
  criado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progresso_aulas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  aula_id uuid references public.aulas(id) on delete cascade,
  completada boolean default false,
  progresso_percentual integer default 0,
  tempo_assistido integer default 0,
  ultima_visualizacao timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, aula_id)
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid references public.aulas(id) on delete cascade,
  samples_file_path text,
  project_file_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  amount numeric,
  payment_method text,
  payment_date timestamptz,
  expiry_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.modulos enable row level security;
alter table public.aulas enable row level security;
alter table public.progresso_aulas enable row level security;
alter table public.user_profiles enable row level security;
alter table public.lesson_files enable row level security;
alter table public.user_subscriptions enable row level security;

drop trigger if exists update_modulos_updated_at on public.modulos;
create trigger update_modulos_updated_at
before update on public.modulos
for each row execute function public.update_updated_at_column();

drop trigger if exists update_aulas_updated_at on public.aulas;
create trigger update_aulas_updated_at
before update on public.aulas
for each row execute function public.update_updated_at_column();

drop trigger if exists update_progresso_aulas_updated_at on public.progresso_aulas;
create trigger update_progresso_aulas_updated_at
before update on public.progresso_aulas
for each row execute function public.update_updated_at_column();

drop trigger if exists update_user_profiles_updated_at on public.user_profiles;
create trigger update_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.update_updated_at_column();

drop trigger if exists update_lesson_files_updated_at on public.lesson_files;
create trigger update_lesson_files_updated_at
before update on public.lesson_files
for each row execute function public.update_updated_at_column();

drop trigger if exists update_user_subscriptions_updated_at on public.user_subscriptions;
create trigger update_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.update_updated_at_column();

commit;
