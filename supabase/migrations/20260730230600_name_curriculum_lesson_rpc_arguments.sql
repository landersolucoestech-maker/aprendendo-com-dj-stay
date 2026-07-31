-- FASE B12: recreate public lesson wrappers with stable PostgREST argument names.

drop function public.create_lesson(uuid, jsonb);
drop function public.update_lesson(uuid, integer, jsonb);
drop function public.set_lesson_prerequisites(uuid, integer, uuid[]);
drop function public.reorder_lessons(uuid, integer, jsonb);
drop function public.move_lesson(uuid, integer, uuid, integer, integer);
drop function public.duplicate_lesson(uuid, text);
drop function public.archive_lesson(uuid, integer);
drop function public.delete_lesson(uuid, integer);
drop function public.archive_lesson_material(uuid, uuid);

create function public.create_lesson(
  p_module_id uuid,
  p_payload jsonb
)
returns public.aulas
language sql
security invoker
set search_path = ''
as $$
  select private.create_lesson(p_module_id, p_payload)
$$;

create function public.update_lesson(
  p_lesson_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns public.aulas
language sql
security invoker
set search_path = ''
as $$
  select private.update_lesson(p_lesson_id, p_expected_version, p_payload)
$$;

create function public.set_lesson_prerequisites(
  p_lesson_id uuid,
  p_expected_version integer,
  p_prerequisite_ids uuid[]
)
returns public.aulas
language sql
security invoker
set search_path = ''
as $$
  select private.set_lesson_prerequisites(p_lesson_id, p_expected_version, p_prerequisite_ids)
$$;

create function public.reorder_lessons(
  p_module_id uuid,
  p_expected_module_version integer,
  p_items jsonb
)
returns public.modulos
language sql
security invoker
set search_path = ''
as $$
  select private.reorder_lessons(p_module_id, p_expected_module_version, p_items)
$$;

create function public.move_lesson(
  p_lesson_id uuid,
  p_expected_lesson_version integer,
  p_target_module_id uuid,
  p_expected_source_module_version integer,
  p_expected_target_module_version integer
)
returns public.aulas
language sql
security invoker
set search_path = ''
as $$
  select private.move_lesson(
    p_lesson_id,
    p_expected_lesson_version,
    p_target_module_id,
    p_expected_source_module_version,
    p_expected_target_module_version
  )
$$;

create function public.duplicate_lesson(
  p_lesson_id uuid,
  p_title text
)
returns public.aulas
language sql
security invoker
set search_path = ''
as $$
  select private.duplicate_lesson(p_lesson_id, p_title)
$$;

create function public.archive_lesson(
  p_lesson_id uuid,
  p_expected_version integer
)
returns public.aulas
language sql
security invoker
set search_path = ''
as $$
  select private.archive_lesson(p_lesson_id, p_expected_version)
$$;

create function public.delete_lesson(
  p_lesson_id uuid,
  p_expected_version integer
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.delete_lesson(p_lesson_id, p_expected_version)
$$;

create function public.archive_lesson_material(
  p_asset_id uuid,
  p_lesson_id uuid
)
returns public.assets
language sql
security invoker
set search_path = ''
as $$
  select private.archive_lesson_material(p_asset_id, p_lesson_id)
$$;

revoke all on function public.create_lesson(uuid, jsonb) from public, anon;
revoke all on function public.update_lesson(uuid, integer, jsonb) from public, anon;
revoke all on function public.set_lesson_prerequisites(uuid, integer, uuid[]) from public, anon;
revoke all on function public.reorder_lessons(uuid, integer, jsonb) from public, anon;
revoke all on function public.move_lesson(uuid, integer, uuid, integer, integer) from public, anon;
revoke all on function public.duplicate_lesson(uuid, text) from public, anon;
revoke all on function public.archive_lesson(uuid, integer) from public, anon;
revoke all on function public.delete_lesson(uuid, integer) from public, anon;
revoke all on function public.archive_lesson_material(uuid, uuid) from public, anon;

grant execute on function public.create_lesson(uuid, jsonb) to authenticated, service_role;
grant execute on function public.update_lesson(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function public.set_lesson_prerequisites(uuid, integer, uuid[]) to authenticated, service_role;
grant execute on function public.reorder_lessons(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function public.move_lesson(uuid, integer, uuid, integer, integer) to authenticated, service_role;
grant execute on function public.duplicate_lesson(uuid, text) to authenticated, service_role;
grant execute on function public.archive_lesson(uuid, integer) to authenticated, service_role;
grant execute on function public.delete_lesson(uuid, integer) to authenticated, service_role;
grant execute on function public.archive_lesson_material(uuid, uuid) to authenticated, service_role;
