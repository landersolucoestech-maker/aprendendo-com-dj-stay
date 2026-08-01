create type public.student_favorite_subject_type as enum ('course', 'digital_product');

create table public.student_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type public.student_favorite_subject_type not null,
  subject_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (user_id, subject_type, subject_id)
);

create index student_favorites_user_created_idx
  on public.student_favorites (user_id, created_at desc, id desc);
create index student_favorites_subject_idx
  on public.student_favorites (subject_type, subject_id);

alter table public.student_favorites enable row level security;
alter table public.student_favorites force row level security;
revoke all on public.student_favorites from public, anon, authenticated;
grant all on public.student_favorites to service_role;

create policy student_favorites_direct_access_denied
on public.student_favorites
as restrictive
for all
to public
using (false)
with check (false);

create or replace function private.toggle_my_student_favorite(
  p_subject_type public.student_favorite_subject_type,
  p_subject_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_subject_type = 'course'::public.student_favorite_subject_type then
    select exists(
      select 1 from public.courses
      where id = p_subject_id
        and status = 'published'::public.course_status
        and deleted_at is null
    ) into v_exists;
  else
    select exists(
      select 1 from public.digital_products
      where id = p_subject_id
        and status = 'published'::public.digital_product_status
        and deleted_at is null
    ) into v_exists;
  end if;

  if not v_exists then
    raise exception 'FAVORITE_SUBJECT_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  select id into v_existing_id
  from public.student_favorites
  where user_id = v_user_id
    and subject_type = p_subject_type
    and subject_id = p_subject_id
  for update;

  if found then
    delete from public.student_favorites where id = v_existing_id;
    return jsonb_build_object(
      'subject_type', p_subject_type,
      'subject_id', p_subject_id,
      'is_favorite', false
    );
  end if;

  insert into public.student_favorites (user_id, subject_type, subject_id)
  values (v_user_id, p_subject_type, p_subject_id)
  on conflict (user_id, subject_type, subject_id) do nothing;

  return jsonb_build_object(
    'subject_type', p_subject_type,
    'subject_id', p_subject_id,
    'is_favorite', true
  );
end;
$$;

create or replace function private.get_my_student_favorites(
  p_limit integer default 30,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 30), 100));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (
      select count(*)
      from public.student_favorites favorite
      where favorite.user_id = v_user_id
        and (
          (favorite.subject_type = 'course'::public.student_favorite_subject_type and exists(
            select 1 from public.courses course
            where course.id = favorite.subject_id
              and course.status = 'published'::public.course_status
              and course.deleted_at is null
          ))
          or
          (favorite.subject_type = 'digital_product'::public.student_favorite_subject_type and exists(
            select 1 from public.digital_products product
            where product.id = favorite.subject_id
              and product.status = 'published'::public.digital_product_status
              and product.deleted_at is null
          ))
        )
    ),
    'favorites', coalesce((
      select jsonb_agg(favorite_payload order by created_at desc, id desc)
      from (
        select
          favorite.id,
          favorite.subject_type,
          favorite.subject_id,
          case
            when favorite.subject_type = 'course'::public.student_favorite_subject_type then course.title
            else product.title
          end as title,
          case
            when favorite.subject_type = 'course'::public.student_favorite_subject_type then '/aluno/cursos/' || favorite.subject_id::text
            else '/marketplace'
          end as action_path,
          favorite.created_at
        from public.student_favorites favorite
        left join public.courses course
          on favorite.subject_type = 'course'::public.student_favorite_subject_type
         and course.id = favorite.subject_id
         and course.status = 'published'::public.course_status
         and course.deleted_at is null
        left join public.digital_products product
          on favorite.subject_type = 'digital_product'::public.student_favorite_subject_type
         and product.id = favorite.subject_id
         and product.status = 'published'::public.digital_product_status
         and product.deleted_at is null
        where favorite.user_id = v_user_id
          and (course.id is not null or product.id is not null)
        order by favorite.created_at desc, favorite.id desc
        limit v_limit offset v_offset
      ) favorite_payload
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.is_my_student_favorite(
  p_subject_type public.student_favorite_subject_type,
  p_subject_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  return exists(
    select 1 from public.student_favorites
    where user_id = v_user_id
      and subject_type = p_subject_type
      and subject_id = p_subject_id
  );
end;
$$;

create or replace function public.toggle_my_student_favorite(
  p_subject_type public.student_favorite_subject_type,
  p_subject_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.toggle_my_student_favorite(p_subject_type, p_subject_id);
$$;

create or replace function public.get_my_student_favorites(p_limit integer default 30, p_offset integer default 0)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_student_favorites(p_limit, p_offset);
$$;

create or replace function public.is_my_student_favorite(
  p_subject_type public.student_favorite_subject_type,
  p_subject_id uuid
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.is_my_student_favorite(p_subject_type, p_subject_id);
$$;

revoke all on function public.toggle_my_student_favorite(public.student_favorite_subject_type, uuid) from public, anon;
revoke all on function public.get_my_student_favorites(integer, integer) from public, anon;
revoke all on function public.is_my_student_favorite(public.student_favorite_subject_type, uuid) from public, anon;
grant execute on function public.toggle_my_student_favorite(public.student_favorite_subject_type, uuid) to authenticated, service_role;
grant execute on function public.get_my_student_favorites(integer, integer) to authenticated, service_role;
grant execute on function public.is_my_student_favorite(public.student_favorite_subject_type, uuid) to authenticated, service_role;
grant usage on schema private to authenticated, service_role;
grant execute on function private.toggle_my_student_favorite(public.student_favorite_subject_type, uuid) to authenticated, service_role;
grant execute on function private.get_my_student_favorites(integer, integer) to authenticated, service_role;
grant execute on function private.is_my_student_favorite(public.student_favorite_subject_type, uuid) to authenticated, service_role;
