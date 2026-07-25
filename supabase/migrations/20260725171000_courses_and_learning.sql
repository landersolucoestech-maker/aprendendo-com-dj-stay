begin;

create extension if not exists pgcrypto;
create extension if not exists unaccent;

do $$ begin
  create type public.course_status as enum ('draft', 'review', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lesson_content_type as enum ('video', 'audio', 'text');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.enrollment_status as enum ('active', 'completed', 'suspended', 'revoked', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_type as enum ('pdf', 'zip', 'ableton_project', 'samples', 'stems', 'preset', 'audio', 'image', 'spreadsheet', 'document', 'external_link', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  short_description text,
  description text,
  category text,
  level text check (level is null or level in ('beginner', 'intermediate', 'advanced', 'all')),
  language text not null default 'pt-BR',
  cover_image_path text,
  promotional_video_url text,
  workload_minutes integer not null default 0 check (workload_minutes >= 0),
  requirements text[] not null default '{}',
  target_audience text[] not null default '{}',
  learning_outcomes text[] not null default '{}',
  certificate_enabled boolean not null default true,
  status public.course_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.course_instructors (
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  is_primary boolean not null default false,
  permissions jsonb not null default '{"content":true,"students":true,"analytics":true}'::jsonb,
  assigned_at timestamptz not null default now(),
  primary key (course_id, instructor_id)
);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  release_after_days integer not null default 0 check (release_after_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, sort_order)
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  content text,
  content_type public.lesson_content_type not null default 'video',
  video_url text,
  video_storage_path text,
  audio_storage_path text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  sort_order integer not null default 0,
  is_preview boolean not null default false,
  is_required boolean not null default true,
  is_published boolean not null default false,
  release_after_days integer not null default 0 check (release_after_days >= 0),
  completion_threshold_percent integer not null default 90 check (completion_threshold_percent between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug),
  unique (module_id, sort_order)
);

create table if not exists public.lesson_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  asset_type public.asset_type not null default 'other',
  storage_path text,
  external_url text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  sort_order integer not null default 0,
  is_downloadable boolean not null default true,
  visibility text not null default 'enrolled' check (visibility in ('preview', 'enrolled', 'instructor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null),
  unique (lesson_id, sort_order)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_item_id uuid,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz,
  completed_at timestamptz,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  watched_seconds integer not null default 0 check (watched_seconds >= 0),
  completed boolean not null default false,
  completed_at timestamptz,
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  last_viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  verification_code text not null unique default encode(gen_random_bytes(16), 'hex'),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  storage_path text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.can_manage_course(target_course_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private
as $$
  select private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role])
  or exists (
    select 1 from public.course_instructors ci
    where ci.course_id = target_course_id and ci.instructor_id = (select auth.uid())
  )
  or exists (
    select 1 from public.courses c
    where c.id = target_course_id and c.created_by = (select auth.uid())
  );
$$;

create or replace function private.is_enrolled(target_course_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.course_id = target_course_id
      and e.user_id = (select auth.uid())
      and e.status in ('active','completed')
      and e.access_starts_at <= now()
      and (e.access_expires_at is null or e.access_expires_at > now())
  );
$$;

create or replace function private.can_access_lesson(target_lesson_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = target_lesson_id
      and l.is_published and m.is_published and c.status = 'published'
      and (l.is_preview or private.is_enrolled(c.id) or private.can_manage_course(c.id))
  );
$$;

revoke all on function private.can_manage_course(uuid) from public, anon;
revoke all on function private.is_enrolled(uuid) from public, anon;
revoke all on function private.can_access_lesson(uuid) from public;
grant execute on function private.can_manage_course(uuid) to authenticated, service_role;
grant execute on function private.is_enrolled(uuid) to authenticated, service_role;
grant execute on function private.can_access_lesson(uuid) to anon, authenticated, service_role;

create or replace function public.upsert_lesson_progress(
  target_lesson_id uuid,
  target_progress_percent numeric,
  target_watched_seconds integer default 0,
  target_last_position_seconds integer default 0
)
returns public.lesson_progress
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_enrollment public.enrollments;
  target_threshold integer;
  result public.lesson_progress;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  select e.* into target_enrollment
  from public.enrollments e
  join public.course_modules m on m.course_id = e.course_id
  join public.lessons l on l.module_id = m.id
  where e.user_id = (select auth.uid())
    and e.status in ('active','completed')
    and l.id = target_lesson_id
    and e.access_starts_at <= now()
    and (e.access_expires_at is null or e.access_expires_at > now())
  limit 1;

  if target_enrollment.id is null then raise exception 'Active enrollment not found'; end if;
  select completion_threshold_percent into target_threshold from public.lessons where id = target_lesson_id;

  insert into public.lesson_progress (
    enrollment_id,user_id,lesson_id,progress_percent,watched_seconds,
    completed,completed_at,last_position_seconds,last_viewed_at
  ) values (
    target_enrollment.id,(select auth.uid()),target_lesson_id,
    least(greatest(target_progress_percent,0),100),greatest(target_watched_seconds,0),
    target_progress_percent >= target_threshold,
    case when target_progress_percent >= target_threshold then now() end,
    greatest(target_last_position_seconds,0),now()
  )
  on conflict (user_id,lesson_id) do update set
    progress_percent = greatest(public.lesson_progress.progress_percent,excluded.progress_percent),
    watched_seconds = greatest(public.lesson_progress.watched_seconds,excluded.watched_seconds),
    completed = public.lesson_progress.completed or excluded.completed,
    completed_at = coalesce(public.lesson_progress.completed_at,excluded.completed_at),
    last_position_seconds = excluded.last_position_seconds,
    last_viewed_at = now(), updated_at = now()
  returning * into result;

  update public.enrollments e set
    progress_percent = calculated.progress_percent,
    completed_at = case when calculated.progress_percent = 100 then coalesce(e.completed_at,now()) else e.completed_at end,
    status = case when calculated.progress_percent = 100 then 'completed'::public.enrollment_status else e.status end,
    last_accessed_at = now(), updated_at = now()
  from (
    select target_enrollment.id enrollment_id,
      coalesce(round(100.0 * count(*) filter (where lp.completed) / nullif(count(*),0),2),0) progress_percent
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.enrollment_id = target_enrollment.id
    where m.course_id = target_enrollment.course_id and l.is_required and l.is_published
  ) calculated
  where e.id = calculated.enrollment_id;

  return result;
end;
$$;

create or replace function public.reorder_course_modules(target_course_id uuid, ordered_module_ids uuid[])
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare item_id uuid; position integer := 0;
begin
  if not private.can_manage_course(target_course_id) then raise exception 'Insufficient permissions'; end if;
  foreach item_id in array ordered_module_ids loop
    update public.course_modules set sort_order = position, updated_at = now()
    where id = item_id and course_id = target_course_id;
    position := position + 1;
  end loop;
end;
$$;

create or replace function public.reorder_lessons(target_module_id uuid, ordered_lesson_ids uuid[])
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare target_course_id uuid; item_id uuid; position integer := 0;
begin
  select course_id into target_course_id from public.course_modules where id = target_module_id;
  if target_course_id is null or not private.can_manage_course(target_course_id) then raise exception 'Insufficient permissions'; end if;
  foreach item_id in array ordered_lesson_ids loop
    update public.lessons set sort_order = position, updated_at = now()
    where id = item_id and module_id = target_module_id;
    position := position + 1;
  end loop;
end;
$$;

revoke all on function public.upsert_lesson_progress(uuid,numeric,integer,integer) from public, anon;
revoke all on function public.reorder_course_modules(uuid,uuid[]) from public, anon;
revoke all on function public.reorder_lessons(uuid,uuid[]) from public, anon;
grant execute on function public.upsert_lesson_progress(uuid,numeric,integer,integer) to authenticated;
grant execute on function public.reorder_course_modules(uuid,uuid[]) to authenticated;
grant execute on function public.reorder_lessons(uuid,uuid[]) to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['courses','course_modules','lessons','lesson_assets','enrollments','lesson_progress','course_reviews'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I',table_name,table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()',table_name,table_name);
  end loop;
end $$;

alter table public.courses enable row level security;
alter table public.course_instructors enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_assets enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.course_reviews enable row level security;

create policy courses_public_select on public.courses for select to anon, authenticated
using (deleted_at is null and status = 'published');
create policy courses_authorized_select on public.courses for select to authenticated
using (deleted_at is null and (private.can_manage_course(id) or private.is_enrolled(id)));
create policy courses_instructor_insert on public.courses for insert to authenticated
with check (created_by = (select auth.uid()) and private.has_any_role(array['instructor'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]));
create policy courses_manage on public.courses for update to authenticated
using (private.can_manage_course(id)) with check (private.can_manage_course(id));
create policy courses_delete on public.courses for delete to authenticated using (private.can_manage_course(id));

create policy course_instructors_select on public.course_instructors for select to authenticated
using (instructor_id = (select auth.uid()) or private.can_manage_course(course_id));
create policy course_instructors_manage on public.course_instructors for all to authenticated
using (private.can_manage_course(course_id)) with check (private.can_manage_course(course_id));

create policy modules_public_select on public.course_modules for select to anon, authenticated
using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published' and c.deleted_at is null));
create policy modules_authorized_select on public.course_modules for select to authenticated
using (private.can_manage_course(course_id) or private.is_enrolled(course_id));
create policy modules_manage on public.course_modules for all to authenticated
using (private.can_manage_course(course_id)) with check (private.can_manage_course(course_id));

create policy lessons_authorized_select on public.lessons for select to anon, authenticated
using (private.can_access_lesson(id));
create policy lessons_manage on public.lessons for all to authenticated
using (exists (select 1 from public.course_modules m where m.id = module_id and private.can_manage_course(m.course_id)))
with check (exists (select 1 from public.course_modules m where m.id = module_id and private.can_manage_course(m.course_id)));

create policy assets_authorized_select on public.lesson_assets for select to anon, authenticated
using (
  (visibility = 'preview' and exists (select 1 from public.lessons l where l.id = lesson_id and l.is_preview and l.is_published))
  or (visibility = 'enrolled' and private.can_access_lesson(lesson_id))
  or (visibility = 'instructor' and exists (
    select 1 from public.lessons l join public.course_modules m on m.id = l.module_id
    where l.id = lesson_id and private.can_manage_course(m.course_id)
  ))
);
create policy assets_manage on public.lesson_assets for all to authenticated
using (exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and private.can_manage_course(m.course_id)))
with check (exists (select 1 from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = lesson_id and private.can_manage_course(m.course_id)));

create policy enrollments_select on public.enrollments for select to authenticated
using (user_id = (select auth.uid()) or private.can_manage_course(course_id) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]));
create policy enrollments_staff_manage on public.enrollments for all to authenticated
using (private.can_manage_course(course_id) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]))
with check (private.can_manage_course(course_id) or private.has_any_role(array['admin'::public.app_role,'owner'::public.app_role]));

create policy lesson_progress_select on public.lesson_progress for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.enrollments e where e.id = enrollment_id and private.can_manage_course(e.course_id)));
create policy certificates_select on public.certificates for select to authenticated
using (user_id = (select auth.uid()) or private.can_manage_course(course_id) or private.has_any_role(array['support'::public.app_role,'admin'::public.app_role,'owner'::public.app_role]));

create policy reviews_public_select on public.course_reviews for select to anon, authenticated using (is_published);
create policy reviews_authorized_select on public.course_reviews for select to authenticated
using (user_id = (select auth.uid()) or private.can_manage_course(course_id));
create policy reviews_student_insert on public.course_reviews for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()) and e.course_id = course_id));
create policy reviews_update on public.course_reviews for update to authenticated
using (user_id = (select auth.uid()) or private.can_manage_course(course_id))
with check (user_id = (select auth.uid()) or private.can_manage_course(course_id));

create policy profiles_instructors_view_enrolled_students on public.profiles for select to authenticated
using (exists (
  select 1 from public.enrollments e join public.course_instructors ci on ci.course_id = e.course_id
  where e.user_id = profiles.id and ci.instructor_id = (select auth.uid())
));

create index if not exists courses_status_published_idx on public.courses(status,published_at desc) where deleted_at is null;
create index if not exists course_instructors_instructor_idx on public.course_instructors(instructor_id,course_id);
create index if not exists course_modules_course_order_idx on public.course_modules(course_id,sort_order);
create index if not exists lessons_module_order_idx on public.lessons(module_id,sort_order);
create index if not exists lesson_assets_lesson_order_idx on public.lesson_assets(lesson_id,sort_order);
create index if not exists enrollments_user_status_idx on public.enrollments(user_id,status);
create index if not exists enrollments_course_status_idx on public.enrollments(course_id,status);
create index if not exists lesson_progress_enrollment_idx on public.lesson_progress(enrollment_id,completed);

insert into storage.buckets (id,name,public,file_size_limit) values
('course-images','course-images',true,10485760),
('course-videos','course-videos',false,2147483648),
('course-assets','course-assets',false,536870912)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy course_images_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'course-images');
create policy course_images_manage on storage.objects for all to authenticated
using (bucket_id = 'course-images' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_manage_course(((storage.foldername(name))[1])::uuid))
with check (bucket_id = 'course-images' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_manage_course(((storage.foldername(name))[1])::uuid));
create policy course_videos_read on storage.objects for select to authenticated
using (bucket_id = 'course-videos' and exists (select 1 from public.lessons l where l.video_storage_path = name and private.can_access_lesson(l.id)));
create policy course_videos_manage on storage.objects for all to authenticated
using (bucket_id = 'course-videos' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_manage_course(((storage.foldername(name))[1])::uuid))
with check (bucket_id = 'course-videos' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_manage_course(((storage.foldername(name))[1])::uuid));
create policy course_assets_read on storage.objects for select to authenticated
using (bucket_id = 'course-assets' and exists (select 1 from public.lesson_assets a where a.storage_path = name and private.can_access_lesson(a.lesson_id)));
create policy course_assets_manage on storage.objects for all to authenticated
using (bucket_id = 'course-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_manage_course(((storage.foldername(name))[1])::uuid))
with check (bucket_id = 'course-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and private.can_manage_course(((storage.foldername(name))[1])::uuid));

grant select on public.courses,public.course_modules,public.lessons,public.lesson_assets,public.course_reviews to anon,authenticated;
grant insert,update,delete on public.courses,public.course_instructors,public.course_modules,public.lessons,public.lesson_assets to authenticated;
grant select,insert,update,delete on public.enrollments,public.lesson_progress,public.certificates,public.course_reviews to authenticated;

-- Remove the public access introduced by the prototype after data migration.
drop policy if exists "Public can view lessons" on public.aulas;
drop policy if exists "Public can view modules" on public.modulos;
drop policy if exists "Public can view lesson files" on public.lesson_files;
revoke all on public.aulas,public.modulos,public.lesson_files from anon;

-- Migrate the existing single-course prototype.
do $$
declare
  default_course_id constant uuid := '00000000-0000-0000-0000-000000000001';
  owner_id uuid;
begin
  select user_id into owner_id from public.user_roles where role = 'owner' order by granted_at limit 1;
  if owner_id is null or to_regclass('public.modulos') is null or to_regclass('public.aulas') is null then return; end if;

  insert into public.courses (id,title,slug,short_description,description,category,level,status,published_at,created_by)
  values (default_course_id,'Aprendendo com DJ Stay','aprendendo-com-dj-stay','Curso de produção musical com DJ Stay.','Conteúdo migrado da versão original da plataforma.','Produção Musical','all','published',now(),owner_id)
  on conflict (id) do nothing;

  insert into public.course_instructors (course_id,instructor_id,is_primary)
  values (default_course_id,owner_id,true) on conflict do nothing;

  insert into public.course_modules (id,course_id,title,description,sort_order,is_published,created_at,updated_at)
  select m.id,default_course_id,m.titulo,m.descricao,m.ordem,true,m.created_at,m.updated_at
  from public.modulos m on conflict (id) do nothing;

  insert into public.lessons (id,module_id,title,slug,description,content_type,video_url,duration_seconds,sort_order,is_published,created_at,updated_at)
  select a.id,a.modulo_id,a.titulo,
    trim(both '-' from regexp_replace(lower(unaccent(coalesce(a.titulo,a.id::text))),'[^a-z0-9]+','-','g')),
    a.descricao,'video',a.video,coalesce(a.duracao,0)*60,a.ordem,true,a.created_at,a.updated_at
  from public.aulas a where a.modulo_id is not null on conflict (id) do nothing;

  if to_regclass('public.lesson_files') is not null then
    insert into public.lesson_assets (lesson_id,title,asset_type,storage_path,sort_order)
    select lf.aula_id,'Samples e loops','samples',lf.samples_file_path,0
    from public.lesson_files lf
    where lf.aula_id is not null and lf.samples_file_path is not null
      and exists (select 1 from public.lessons l where l.id = lf.aula_id)
    on conflict (lesson_id,sort_order) do nothing;

    insert into public.lesson_assets (lesson_id,title,asset_type,storage_path,sort_order)
    select lf.aula_id,'Projeto Ableton Live','ableton_project',lf.project_file_path,1
    from public.lesson_files lf
    where lf.aula_id is not null and lf.project_file_path is not null
      and exists (select 1 from public.lessons l where l.id = lf.aula_id)
    on conflict (lesson_id,sort_order) do nothing;
  end if;

  if to_regclass('public.user_subscriptions') is not null then
    insert into public.enrollments (user_id,course_id,status,enrolled_at,access_expires_at)
    select us.user_id,default_course_id,'active',coalesce(us.payment_date,us.created_at),us.expiry_date
    from public.user_subscriptions us
    where us.status in ('active','paid','approved') and exists (select 1 from public.profiles p where p.id = us.user_id)
    on conflict (user_id,course_id) do nothing;
  end if;

  if to_regclass('public.progresso_aulas') is not null then
    insert into public.lesson_progress (enrollment_id,user_id,lesson_id,progress_percent,watched_seconds,completed,completed_at,last_position_seconds,last_viewed_at)
    select e.id,p.user_id,p.aula_id,coalesce(p.progresso_percentual,0),coalesce(p.tempo_assistido,0),coalesce(p.completada,false),
      case when coalesce(p.completada,false) then coalesce(p.ultima_visualizacao,p.updated_at) end,
      coalesce(p.tempo_assistido,0),coalesce(p.ultima_visualizacao,p.updated_at)
    from public.progresso_aulas p
    join public.enrollments e on e.user_id = p.user_id and e.course_id = default_course_id
    join public.lessons l on l.id = p.aula_id
    on conflict (user_id,lesson_id) do nothing;
  end if;
end $$;

commit;
