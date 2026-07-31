-- FASE B12: module operations with optimistic concurrency and dependency validation.

create or replace function private.create_module(p_course_id uuid, p_payload jsonb)
returns public.modulos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_module public.modulos;
  v_order integer;
  v_allowed text[] := array['title','description','required','status','release_mode','release_at','drip_delay_days','preview_enabled'];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'MODULE_PAYLOAD_REQUIRED' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_payload) key where not key = any(v_allowed)) then
    raise exception 'MODULE_UNKNOWN_FIELD' using errcode = '22023';
  end if;
  if not exists (select 1 from public.courses where id = p_course_id and deleted_at is null) then
    raise exception 'COURSE_NOT_FOUND' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_payload ->> 'title'), '') is null then
    raise exception 'MODULE_TITLE_REQUIRED' using errcode = '22023';
  end if;

  select coalesce(max(ordem), -1) + 1 into v_order
  from public.modulos where course_id = p_course_id;

  insert into public.modulos (
    course_id, titulo, descricao, ordem, obrigatorio, status, release_mode, release_at,
    drip_delay_days, preview_enabled, created_by_user_id, updated_by_user_id
  ) values (
    p_course_id,
    btrim(p_payload ->> 'title'),
    case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else null end,
    v_order,
    coalesce((p_payload ->> 'required')::boolean, true),
    coalesce((p_payload ->> 'status')::public.curriculum_item_status, 'draft'::public.curriculum_item_status),
    coalesce((p_payload ->> 'release_mode')::public.curriculum_release_mode, 'immediate'::public.curriculum_release_mode),
    case when p_payload ? 'release_at' and p_payload -> 'release_at' <> 'null'::jsonb then (p_payload ->> 'release_at')::timestamptz else null end,
    case when p_payload ? 'drip_delay_days' and p_payload -> 'drip_delay_days' <> 'null'::jsonb then (p_payload ->> 'drip_delay_days')::integer else null end,
    coalesce((p_payload ->> 'preview_enabled')::boolean, false),
    v_actor,
    v_actor
  ) returning * into v_module;

  perform private.log_curriculum_event(p_course_id, 'module', v_module.id, 'created', v_module.version, '{}'::jsonb);
  return v_module;
end;
$$;

create or replace function private.update_module(p_module_id uuid, p_expected_version integer, p_payload jsonb)
returns public.modulos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_current public.modulos;
  v_updated public.modulos;
  v_allowed text[] := array['title','description','required','status','release_mode','release_at','drip_delay_days','preview_enabled'];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or p_payload = '{}'::jsonb then
    raise exception 'MODULE_PATCH_REQUIRED' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_payload) key where not key = any(v_allowed)) then
    raise exception 'MODULE_UNKNOWN_FIELD' using errcode = '22023';
  end if;
  select * into v_current from public.modulos where id = p_module_id and deleted_at is null for update;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_current.version <> p_expected_version then raise exception 'MODULE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if p_payload ? 'title' and nullif(btrim(p_payload ->> 'title'), '') is null then
    raise exception 'MODULE_TITLE_REQUIRED' using errcode = '22023';
  end if;
  if p_payload ? 'description' and p_payload -> 'description' <> 'null'::jsonb and nullif(btrim(p_payload ->> 'description'), '') is null then
    raise exception 'MODULE_DESCRIPTION_EMPTY' using errcode = '22023';
  end if;

  update public.modulos set
    titulo = case when p_payload ? 'title' then btrim(p_payload ->> 'title') else titulo end,
    descricao = case when p_payload ? 'description' then case when p_payload -> 'description' = 'null'::jsonb then null else btrim(p_payload ->> 'description') end else descricao end,
    obrigatorio = case when p_payload ? 'required' then (p_payload ->> 'required')::boolean else obrigatorio end,
    status = case when p_payload ? 'status' then (p_payload ->> 'status')::public.curriculum_item_status else status end,
    release_mode = case when p_payload ? 'release_mode' then (p_payload ->> 'release_mode')::public.curriculum_release_mode else release_mode end,
    release_at = case when p_payload ? 'release_at' then case when p_payload -> 'release_at' = 'null'::jsonb then null else (p_payload ->> 'release_at')::timestamptz end else release_at end,
    drip_delay_days = case when p_payload ? 'drip_delay_days' then case when p_payload -> 'drip_delay_days' = 'null'::jsonb then null else (p_payload ->> 'drip_delay_days')::integer end else drip_delay_days end,
    preview_enabled = case when p_payload ? 'preview_enabled' then (p_payload ->> 'preview_enabled')::boolean else preview_enabled end,
    updated_by_user_id = v_actor,
    version = version + 1
  where id = p_module_id returning * into v_updated;

  perform private.log_curriculum_event(v_updated.course_id, 'module', v_updated.id, 'updated', v_updated.version, jsonb_build_object('fields', (select jsonb_agg(key order by key) from jsonb_object_keys(p_payload) key)));
  return v_updated;
end;
$$;

create or replace function private.set_module_prerequisites(p_module_id uuid, p_expected_version integer, p_prerequisite_ids uuid[])
returns public.modulos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_module public.modulos;
  v_updated public.modulos;
  v_id uuid;
begin
  select * into v_module from public.modulos where id = p_module_id and deleted_at is null for update;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_module.version <> p_expected_version then raise exception 'MODULE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if coalesce(cardinality(p_prerequisite_ids), 0) <> coalesce((select count(distinct x) from unnest(coalesce(p_prerequisite_ids, '{}'::uuid[])) x), 0) then
    raise exception 'DUPLICATE_MODULE_PREREQUISITE' using errcode = '22023';
  end if;

  foreach v_id in array coalesce(p_prerequisite_ids, '{}'::uuid[]) loop
    if v_id = p_module_id then raise exception 'MODULE_CANNOT_REQUIRE_ITSELF' using errcode = '22023'; end if;
    if not exists (select 1 from public.modulos where id = v_id and course_id = v_module.course_id and deleted_at is null and status <> 'archived') then
      raise exception 'MODULE_PREREQUISITE_INVALID' using errcode = '22023';
    end if;
    if exists (
      with recursive ancestors(id) as (
        select prerequisite_module_id from public.module_prerequisites where module_id = v_id
        union
        select mp.prerequisite_module_id from public.module_prerequisites mp join ancestors a on mp.module_id = a.id
      ) select 1 from ancestors where id = p_module_id
    ) then
      raise exception 'MODULE_PREREQUISITE_CYCLE' using errcode = '23514';
    end if;
  end loop;

  delete from public.module_prerequisites where module_id = p_module_id;
  insert into public.module_prerequisites(module_id, prerequisite_module_id, created_by_user_id)
  select p_module_id, x, v_actor from unnest(coalesce(p_prerequisite_ids, '{}'::uuid[])) x;

  update public.modulos set version = version + 1, updated_by_user_id = v_actor where id = p_module_id returning * into v_updated;
  perform private.log_curriculum_event(v_updated.course_id, 'module', v_updated.id, 'prerequisites_updated', v_updated.version, jsonb_build_object('prerequisite_ids', coalesce(to_jsonb(p_prerequisite_ids), '[]'::jsonb)));
  return v_updated;
end;
$$;

create or replace function private.reorder_modules(p_course_id uuid, p_expected_course_version integer, p_items jsonb)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_course public.courses;
  v_count integer;
  v_max integer;
  v_item jsonb;
  v_module public.modulos;
begin
  if jsonb_typeof(p_items) <> 'array' then raise exception 'MODULE_ORDER_ARRAY_REQUIRED' using errcode = '22023'; end if;
  select * into v_course from public.courses where id = p_course_id and deleted_at is null for update;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_course.version <> p_expected_course_version then raise exception 'COURSE_VERSION_CONFLICT' using errcode = '40001'; end if;

  select count(*) into v_count from public.modulos where course_id = p_course_id and deleted_at is null and status <> 'archived';
  if jsonb_array_length(p_items) <> v_count then raise exception 'MODULE_ORDER_MUST_COVER_ACTIVE_CURRICULUM' using errcode = '22023'; end if;
  if (select count(distinct item ->> 'id') from jsonb_array_elements(p_items) item) <> v_count
    or (select count(distinct (item ->> 'order')::integer) from jsonb_array_elements(p_items) item) <> v_count
    or exists (select 1 from jsonb_array_elements(p_items) item where (item ->> 'order')::integer < 0 or (item ->> 'order')::integer >= v_count) then
    raise exception 'MODULE_ORDER_INVALID' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_module from public.modulos
    where id = (v_item ->> 'id')::uuid and course_id = p_course_id and deleted_at is null and status <> 'archived'
    for update;
    if not found then raise exception 'MODULE_ORDER_ITEM_INVALID' using errcode = '22023'; end if;
    if v_module.version <> (v_item ->> 'version')::integer then raise exception 'MODULE_VERSION_CONFLICT' using errcode = '40001'; end if;
  end loop;

  select coalesce(max(ordem), 0) + 1000 into v_max from public.modulos where course_id = p_course_id;
  update public.modulos set ordem = v_max + ordem, version = version + 1, updated_by_user_id = v_actor
  where course_id = p_course_id and deleted_at is null and status <> 'archived';
  for v_item in select value from jsonb_array_elements(p_items) loop
    update public.modulos set ordem = (v_item ->> 'order')::integer where id = (v_item ->> 'id')::uuid;
  end loop;
  update public.courses set version = version + 1, updated_by_user_id = v_actor where id = p_course_id returning * into v_course;
  perform private.log_curriculum_event(p_course_id, 'module', p_course_id, 'reordered', v_course.version, jsonb_build_object('items', p_items));
  return v_course;
end;
$$;

create or replace function private.archive_module(p_module_id uuid, p_expected_version integer)
returns public.modulos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_module public.modulos;
  v_max integer;
begin
  select * into v_module from public.modulos where id = p_module_id and deleted_at is null for update;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_module.version <> p_expected_version then raise exception 'MODULE_VERSION_CONFLICT' using errcode = '40001'; end if;
  select coalesce(max(ordem), -1) + 1 into v_max from public.modulos where course_id = v_module.course_id;
  update public.aulas set status = 'archived', archived_at = coalesce(archived_at, statement_timestamp()), version = version + 1, updated_by_user_id = v_actor
  where modulo_id = p_module_id and deleted_at is null and status <> 'archived';
  update public.modulos set status = 'archived', ordem = v_max, version = version + 1, updated_by_user_id = v_actor
  where id = p_module_id returning * into v_module;
  perform private.log_curriculum_event(v_module.course_id, 'module', v_module.id, 'archived', v_module.version, '{}'::jsonb);
  return v_module;
end;
$$;

create or replace function private.delete_module(p_module_id uuid, p_expected_version integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module public.modulos;
begin
  perform private.assert_curriculum_admin();
  select * into v_module from public.modulos where id = p_module_id for update;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_module.version <> p_expected_version then raise exception 'MODULE_VERSION_CONFLICT' using errcode = '40001'; end if;
  if v_module.status <> 'archived'::public.curriculum_item_status
    or exists (select 1 from public.aulas where modulo_id = p_module_id)
    or exists (select 1 from public.module_prerequisites where prerequisite_module_id = p_module_id) then
    raise exception 'MODULE_HAS_DEPENDENCIES_ARCHIVE_REQUIRED' using errcode = '23503';
  end if;
  perform private.log_curriculum_event(v_module.course_id, 'module', v_module.id, 'deleted', v_module.version, '{}'::jsonb);
  delete from public.modulos where id = p_module_id;
  return true;
end;
$$;

create or replace function private.duplicate_module(p_module_id uuid, p_title text)
returns public.modulos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_source public.modulos;
  v_copy public.modulos;
  v_lesson public.aulas;
  v_new_lesson public.aulas;
  v_order integer;
begin
  if nullif(btrim(p_title), '') is null then raise exception 'MODULE_TITLE_REQUIRED' using errcode = '22023'; end if;
  select * into v_source from public.modulos where id = p_module_id and deleted_at is null;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode = 'P0002'; end if;
  select coalesce(max(ordem), -1) + 1 into v_order from public.modulos where course_id = v_source.course_id;
  insert into public.modulos(course_id,titulo,descricao,ordem,status,obrigatorio,release_mode,preview_enabled,duplicated_from_module_id,created_by_user_id,updated_by_user_id)
  values(v_source.course_id,btrim(p_title),v_source.descricao,v_order,'draft',v_source.obrigatorio,'immediate',false,v_source.id,v_actor,v_actor)
  returning * into v_copy;
  for v_lesson in select * from public.aulas where modulo_id = v_source.id and deleted_at is null order by ordem loop
    insert into public.aulas(modulo_id,titulo,descricao,conteudo_texto,ordem,duracao,status,content_kind,obrigatoria,completion_mode,completion_percent,preview_enabled,release_mode,duplicated_from_lesson_id,created_by_user_id,updated_by_user_id)
    values(v_copy.id,v_lesson.titulo,v_lesson.descricao,v_lesson.conteudo_texto,v_lesson.ordem,v_lesson.duracao,'draft',v_lesson.content_kind,v_lesson.obrigatoria,v_lesson.completion_mode,v_lesson.completion_percent,false,'immediate',v_lesson.id,v_actor,v_actor)
    returning * into v_new_lesson;
    perform private.log_curriculum_event(v_copy.course_id,'lesson',v_new_lesson.id,'duplicated',v_new_lesson.version,jsonb_build_object('source_lesson_id',v_lesson.id,'media_and_assets_copied',false));
  end loop;
  perform private.log_curriculum_event(v_copy.course_id,'module',v_copy.id,'duplicated',v_copy.version,jsonb_build_object('source_module_id',v_source.id,'media_and_assets_copied',false));
  return v_copy;
end;
$$;

create function public.create_module(p_course_id uuid, p_payload jsonb) returns public.modulos language sql security invoker set search_path='' as $$ select private.create_module(p_course_id,p_payload) $$;
create function public.update_module(p_module_id uuid, p_expected_version integer, p_payload jsonb) returns public.modulos language sql security invoker set search_path='' as $$ select private.update_module(p_module_id,p_expected_version,p_payload) $$;
create function public.set_module_prerequisites(p_module_id uuid, p_expected_version integer, p_prerequisite_ids uuid[]) returns public.modulos language sql security invoker set search_path='' as $$ select private.set_module_prerequisites(p_module_id,p_expected_version,p_prerequisite_ids) $$;
create function public.reorder_modules(p_course_id uuid, p_expected_course_version integer, p_items jsonb) returns public.courses language sql security invoker set search_path='' as $$ select private.reorder_modules(p_course_id,p_expected_course_version,p_items) $$;
create function public.archive_module(p_module_id uuid, p_expected_version integer) returns public.modulos language sql security invoker set search_path='' as $$ select private.archive_module(p_module_id,p_expected_version) $$;
create function public.delete_module(p_module_id uuid, p_expected_version integer) returns boolean language sql security invoker set search_path='' as $$ select private.delete_module(p_module_id,p_expected_version) $$;
create function public.duplicate_module(p_module_id uuid, p_title text) returns public.modulos language sql security invoker set search_path='' as $$ select private.duplicate_module(p_module_id,p_title) $$;

revoke all on function public.create_module(uuid,jsonb) from public,anon;
revoke all on function public.update_module(uuid,integer,jsonb) from public,anon;
revoke all on function public.set_module_prerequisites(uuid,integer,uuid[]) from public,anon;
revoke all on function public.reorder_modules(uuid,integer,jsonb) from public,anon;
revoke all on function public.archive_module(uuid,integer) from public,anon;
revoke all on function public.delete_module(uuid,integer) from public,anon;
revoke all on function public.duplicate_module(uuid,text) from public,anon;
grant execute on function public.create_module(uuid,jsonb) to authenticated,service_role;
grant execute on function public.update_module(uuid,integer,jsonb) to authenticated,service_role;
grant execute on function public.set_module_prerequisites(uuid,integer,uuid[]) to authenticated,service_role;
grant execute on function public.reorder_modules(uuid,integer,jsonb) to authenticated,service_role;
grant execute on function public.archive_module(uuid,integer) to authenticated,service_role;
grant execute on function public.delete_module(uuid,integer) to authenticated,service_role;
grant execute on function public.duplicate_module(uuid,text) to authenticated,service_role;
