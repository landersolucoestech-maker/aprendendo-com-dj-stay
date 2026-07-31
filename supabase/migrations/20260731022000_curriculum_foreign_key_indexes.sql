-- FASE B12: cover foreign keys reported by the Supabase performance advisor.

create index if not exists aulas_updated_by_user_id_idx
  on public.aulas (updated_by_user_id)
  where updated_by_user_id is not null;

create index if not exists courses_duplicated_from_course_id_idx
  on public.courses (duplicated_from_course_id)
  where duplicated_from_course_id is not null;

create index if not exists lesson_prerequisites_created_by_user_id_idx
  on public.lesson_prerequisites (created_by_user_id);

create index if not exists module_prerequisites_created_by_user_id_idx
  on public.module_prerequisites (created_by_user_id);

create index if not exists modulos_updated_by_user_id_idx
  on public.modulos (updated_by_user_id)
  where updated_by_user_id is not null;
