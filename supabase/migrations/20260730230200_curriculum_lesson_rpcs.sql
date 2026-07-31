-- FASE B12: lesson operations, association, audio and private materials.

create or replace function private.create_lesson(p_module_id uuid, p_payload jsonb)
returns public.aulas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_lesson public.aulas;
  v_course_id uuid;
  v_order integer;
  v_allowed text[] := array['title','description','text_content','duration','status','content_kind','required','completion_mode','completion_percent','preview_enabled','release_mode','release_at','drip_delay_days','availability_starts_at','availability_ends_at'];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'LESSON_PAYLOAD_REQUIRED' using errcode='22023'; end if;
  if exists (select 1 from jsonb_object_keys(p_payload) key where not key=any(v_allowed)) then raise exception 'LESSON_UNKNOWN_FIELD' using errcode='22023'; end if;
  select course_id into v_course_id from public.modulos where id=p_module_id and deleted_at is null;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode='P0002'; end if;
  if nullif(btrim(p_payload->>'title'),'') is null then raise exception 'LESSON_TITLE_REQUIRED' using errcode='22023'; end if;
  select coalesce(max(ordem),-1)+1 into v_order from public.aulas where modulo_id=p_module_id;
  insert into public.aulas(
    modulo_id,titulo,descricao,conteudo_texto,ordem,duracao,status,content_kind,obrigatoria,
    completion_mode,completion_percent,preview_enabled,release_mode,release_at,drip_delay_days,
    availability_starts_at,availability_ends_at,created_by_user_id,updated_by_user_id
  ) values (
    p_module_id,btrim(p_payload->>'title'),
    case when p_payload?'description' then nullif(btrim(p_payload->>'description'),'') else null end,
    case when p_payload?'text_content' then nullif(p_payload->>'text_content','') else null end,
    v_order,
    case when p_payload?'duration' and p_payload->'duration'<>'null'::jsonb then (p_payload->>'duration')::integer else null end,
    coalesce((p_payload->>'status')::public.curriculum_item_status,'draft'),
    coalesce((p_payload->>'content_kind')::public.lesson_content_kind,'video'),
    coalesce((p_payload->>'required')::boolean,true),
    coalesce((p_payload->>'completion_mode')::public.lesson_completion_mode,'manual'),
    case when p_payload?'completion_percent' and p_payload->'completion_percent'<>'null'::jsonb then (p_payload->>'completion_percent')::smallint else null end,
    coalesce((p_payload->>'preview_enabled')::boolean,false),
    coalesce((p_payload->>'release_mode')::public.curriculum_release_mode,'immediate'),
    case when p_payload?'release_at' and p_payload->'release_at'<>'null'::jsonb then (p_payload->>'release_at')::timestamptz else null end,
    case when p_payload?'drip_delay_days' and p_payload->'drip_delay_days'<>'null'::jsonb then (p_payload->>'drip_delay_days')::integer else null end,
    case when p_payload?'availability_starts_at' and p_payload->'availability_starts_at'<>'null'::jsonb then (p_payload->>'availability_starts_at')::timestamptz else null end,
    case when p_payload?'availability_ends_at' and p_payload->'availability_ends_at'<>'null'::jsonb then (p_payload->>'availability_ends_at')::timestamptz else null end,
    v_actor,v_actor
  ) returning * into v_lesson;
  perform private.log_curriculum_event(v_course_id,'lesson',v_lesson.id,'created',v_lesson.version,'{}');
  return v_lesson;
end;
$$;

create or replace function private.update_lesson(p_lesson_id uuid,p_expected_version integer,p_payload jsonb)
returns public.aulas
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=private.assert_curriculum_admin();
  v_current public.aulas;
  v_updated public.aulas;
  v_course_id uuid;
  v_audio uuid;
  v_allowed text[]:=array['title','description','text_content','duration','status','content_kind','audio_asset_id','required','completion_mode','completion_percent','preview_enabled','release_mode','release_at','drip_delay_days','availability_starts_at','availability_ends_at'];
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or p_payload='{}'::jsonb then raise exception 'LESSON_PATCH_REQUIRED' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_payload) key where not key=any(v_allowed)) then raise exception 'LESSON_UNKNOWN_FIELD' using errcode='22023'; end if;
  select * into v_current from public.aulas where id=p_lesson_id and deleted_at is null for update;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;
  if v_current.version<>p_expected_version then raise exception 'LESSON_VERSION_CONFLICT' using errcode='40001'; end if;
  select course_id into v_course_id from public.modulos where id=v_current.modulo_id;
  if p_payload?'title' and nullif(btrim(p_payload->>'title'),'') is null then raise exception 'LESSON_TITLE_REQUIRED' using errcode='22023'; end if;
  if p_payload?'description' and p_payload->'description'<>'null'::jsonb and nullif(btrim(p_payload->>'description'),'') is null then raise exception 'LESSON_DESCRIPTION_EMPTY' using errcode='22023'; end if;
  if p_payload?'text_content' and p_payload->'text_content'<>'null'::jsonb and nullif(p_payload->>'text_content','') is null then raise exception 'LESSON_TEXT_EMPTY' using errcode='22023'; end if;
  if p_payload?'audio_asset_id' and p_payload->'audio_asset_id'<>'null'::jsonb then
    v_audio:=(p_payload->>'audio_asset_id')::uuid;
    perform private.assert_lesson_asset(v_audio,p_lesson_id,'audio');
  end if;
  update public.aulas set
    titulo=case when p_payload?'title' then btrim(p_payload->>'title') else titulo end,
    descricao=case when p_payload?'description' then case when p_payload->'description'='null'::jsonb then null else btrim(p_payload->>'description') end else descricao end,
    conteudo_texto=case when p_payload?'text_content' then case when p_payload->'text_content'='null'::jsonb then null else p_payload->>'text_content' end else conteudo_texto end,
    duracao=case when p_payload?'duration' then case when p_payload->'duration'='null'::jsonb then null else (p_payload->>'duration')::integer end else duracao end,
    status=case when p_payload?'status' then (p_payload->>'status')::public.curriculum_item_status else status end,
    content_kind=case when p_payload?'content_kind' then (p_payload->>'content_kind')::public.lesson_content_kind else content_kind end,
    audio_asset_id=case when p_payload?'audio_asset_id' then case when p_payload->'audio_asset_id'='null'::jsonb then null else v_audio end else audio_asset_id end,
    obrigatoria=case when p_payload?'required' then (p_payload->>'required')::boolean else obrigatoria end,
    completion_mode=case when p_payload?'completion_mode' then (p_payload->>'completion_mode')::public.lesson_completion_mode else completion_mode end,
    completion_percent=case when p_payload?'completion_percent' then case when p_payload->'completion_percent'='null'::jsonb then null else (p_payload->>'completion_percent')::smallint end else completion_percent end,
    preview_enabled=case when p_payload?'preview_enabled' then (p_payload->>'preview_enabled')::boolean else preview_enabled end,
    release_mode=case when p_payload?'release_mode' then (p_payload->>'release_mode')::public.curriculum_release_mode else release_mode end,
    release_at=case when p_payload?'release_at' then case when p_payload->'release_at'='null'::jsonb then null else (p_payload->>'release_at')::timestamptz end else release_at end,
    drip_delay_days=case when p_payload?'drip_delay_days' then case when p_payload->'drip_delay_days'='null'::jsonb then null else (p_payload->>'drip_delay_days')::integer end else drip_delay_days end,
    availability_starts_at=case when p_payload?'availability_starts_at' then case when p_payload->'availability_starts_at'='null'::jsonb then null else (p_payload->>'availability_starts_at')::timestamptz end else availability_starts_at end,
    availability_ends_at=case when p_payload?'availability_ends_at' then case when p_payload->'availability_ends_at'='null'::jsonb then null else (p_payload->>'availability_ends_at')::timestamptz end else availability_ends_at end,
    updated_by_user_id=v_actor,version=version+1
  where id=p_lesson_id returning * into v_updated;
  perform private.log_curriculum_event(v_course_id,'lesson',v_updated.id,'updated',v_updated.version,jsonb_build_object('fields',(select jsonb_agg(key order by key) from jsonb_object_keys(p_payload) key)));
  return v_updated;
end;
$$;

create or replace function private.set_lesson_prerequisites(p_lesson_id uuid,p_expected_version integer,p_prerequisite_ids uuid[])
returns public.aulas
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=private.assert_curriculum_admin();
  v_lesson public.aulas;
  v_updated public.aulas;
  v_course_id uuid;
  v_id uuid;
begin
  select * into v_lesson from public.aulas where id=p_lesson_id and deleted_at is null for update;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;
  if v_lesson.version<>p_expected_version then raise exception 'LESSON_VERSION_CONFLICT' using errcode='40001'; end if;
  select course_id into v_course_id from public.modulos where id=v_lesson.modulo_id;
  if coalesce(cardinality(p_prerequisite_ids),0)<>coalesce((select count(distinct x) from unnest(coalesce(p_prerequisite_ids,'{}'::uuid[])) x),0) then raise exception 'DUPLICATE_LESSON_PREREQUISITE' using errcode='22023'; end if;
  foreach v_id in array coalesce(p_prerequisite_ids,'{}'::uuid[]) loop
    if v_id=p_lesson_id then raise exception 'LESSON_CANNOT_REQUIRE_ITSELF' using errcode='22023'; end if;
    if not exists(select 1 from public.aulas a join public.modulos m on m.id=a.modulo_id where a.id=v_id and m.course_id=v_course_id and a.deleted_at is null and a.status<>'archived') then raise exception 'LESSON_PREREQUISITE_INVALID' using errcode='22023'; end if;
    if exists(with recursive ancestors(id) as (select prerequisite_lesson_id from public.lesson_prerequisites where lesson_id=v_id union select lp.prerequisite_lesson_id from public.lesson_prerequisites lp join ancestors a on lp.lesson_id=a.id) select 1 from ancestors where id=p_lesson_id) then raise exception 'LESSON_PREREQUISITE_CYCLE' using errcode='23514'; end if;
  end loop;
  delete from public.lesson_prerequisites where lesson_id=p_lesson_id;
  insert into public.lesson_prerequisites(lesson_id,prerequisite_lesson_id,created_by_user_id) select p_lesson_id,x,v_actor from unnest(coalesce(p_prerequisite_ids,'{}'::uuid[])) x;
  update public.aulas set version=version+1,updated_by_user_id=v_actor where id=p_lesson_id returning * into v_updated;
  perform private.log_curriculum_event(v_course_id,'lesson',v_updated.id,'prerequisites_updated',v_updated.version,jsonb_build_object('prerequisite_ids',coalesce(to_jsonb(p_prerequisite_ids),'[]'::jsonb)));
  return v_updated;
end;
$$;

create or replace function private.reorder_lessons(p_module_id uuid,p_expected_module_version integer,p_items jsonb)
returns public.modulos
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=private.assert_curriculum_admin();
  v_module public.modulos;
  v_count integer;
  v_max integer;
  v_item jsonb;
  v_lesson public.aulas;
begin
  if jsonb_typeof(p_items)<>'array' then raise exception 'LESSON_ORDER_ARRAY_REQUIRED' using errcode='22023'; end if;
  select * into v_module from public.modulos where id=p_module_id and deleted_at is null for update;
  if not found then raise exception 'MODULE_NOT_FOUND' using errcode='P0002'; end if;
  if v_module.version<>p_expected_module_version then raise exception 'MODULE_VERSION_CONFLICT' using errcode='40001'; end if;
  select count(*) into v_count from public.aulas where modulo_id=p_module_id and deleted_at is null and status<>'archived';
  if jsonb_array_length(p_items)<>v_count then raise exception 'LESSON_ORDER_MUST_COVER_ACTIVE_MODULE' using errcode='22023'; end if;
  if (select count(distinct item->>'id') from jsonb_array_elements(p_items) item)<>v_count or (select count(distinct (item->>'order')::integer) from jsonb_array_elements(p_items) item)<>v_count or exists(select 1 from jsonb_array_elements(p_items) item where (item->>'order')::integer<0 or (item->>'order')::integer>=v_count) then raise exception 'LESSON_ORDER_INVALID' using errcode='22023'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_lesson from public.aulas where id=(v_item->>'id')::uuid and modulo_id=p_module_id and deleted_at is null and status<>'archived' for update;
    if not found then raise exception 'LESSON_ORDER_ITEM_INVALID' using errcode='22023'; end if;
    if v_lesson.version<>(v_item->>'version')::integer then raise exception 'LESSON_VERSION_CONFLICT' using errcode='40001'; end if;
  end loop;
  select coalesce(max(ordem),0)+1000 into v_max from public.aulas where modulo_id=p_module_id;
  update public.aulas set ordem=v_max+ordem,version=version+1,updated_by_user_id=v_actor where modulo_id=p_module_id and deleted_at is null and status<>'archived';
  for v_item in select value from jsonb_array_elements(p_items) loop update public.aulas set ordem=(v_item->>'order')::integer where id=(v_item->>'id')::uuid; end loop;
  update public.modulos set version=version+1,updated_by_user_id=v_actor where id=p_module_id returning * into v_module;
  perform private.log_curriculum_event(v_module.course_id,'lesson',p_module_id,'reordered',v_module.version,jsonb_build_object('items',p_items));
  return v_module;
end;
$$;

create or replace function private.move_lesson(p_lesson_id uuid,p_expected_lesson_version integer,p_target_module_id uuid,p_expected_source_module_version integer,p_expected_target_module_version integer)
returns public.aulas
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=private.assert_curriculum_admin();
  v_lesson public.aulas;
  v_source public.modulos;
  v_target public.modulos;
  v_order integer;
begin
  select * into v_lesson from public.aulas where id=p_lesson_id and deleted_at is null for update;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;
  if v_lesson.version<>p_expected_lesson_version then raise exception 'LESSON_VERSION_CONFLICT' using errcode='40001'; end if;
  select * into v_source from public.modulos where id=v_lesson.modulo_id and deleted_at is null for update;
  select * into v_target from public.modulos where id=p_target_module_id and deleted_at is null for update;
  if not found then raise exception 'TARGET_MODULE_NOT_FOUND' using errcode='P0002'; end if;
  if v_source.course_id<>v_target.course_id then raise exception 'LESSON_MOVE_COURSE_MISMATCH' using errcode='22023'; end if;
  if v_source.version<>p_expected_source_module_version or v_target.version<>p_expected_target_module_version then raise exception 'MODULE_VERSION_CONFLICT' using errcode='40001'; end if;
  if v_source.id=v_target.id then return v_lesson; end if;
  if exists(select 1 from public.lesson_prerequisites lp join public.aulas p on p.id=lp.prerequisite_lesson_id join public.modulos m on m.id=p.modulo_id where lp.lesson_id=p_lesson_id and m.course_id<>v_target.course_id) then raise exception 'LESSON_DEPENDENCY_MOVE_INVALID' using errcode='23503'; end if;
  select coalesce(max(ordem),-1)+1 into v_order from public.aulas where modulo_id=p_target_module_id;
  update public.aulas set modulo_id=p_target_module_id,ordem=v_order,version=version+1,updated_by_user_id=v_actor where id=p_lesson_id returning * into v_lesson;
  update public.modulos set version=version+1,updated_by_user_id=v_actor where id in(v_source.id,v_target.id);
  perform private.log_curriculum_event(v_target.course_id,'lesson',v_lesson.id,'moved',v_lesson.version,jsonb_build_object('from_module_id',v_source.id,'to_module_id',v_target.id));
  return v_lesson;
end;
$$;

create or replace function private.duplicate_lesson(p_lesson_id uuid,p_title text)
returns public.aulas language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=private.assert_curriculum_admin();
  v_source public.aulas;
  v_copy public.aulas;
  v_course_id uuid;
  v_order integer;
begin
  if nullif(btrim(p_title),'') is null then raise exception 'LESSON_TITLE_REQUIRED' using errcode='22023'; end if;
  select * into v_source from public.aulas where id=p_lesson_id and deleted_at is null;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;
  select course_id into v_course_id from public.modulos where id=v_source.modulo_id;
  select coalesce(max(ordem),-1)+1 into v_order from public.aulas where modulo_id=v_source.modulo_id;
  insert into public.aulas(modulo_id,titulo,descricao,conteudo_texto,ordem,duracao,status,content_kind,obrigatoria,completion_mode,completion_percent,preview_enabled,release_mode,duplicated_from_lesson_id,created_by_user_id,updated_by_user_id)
  values(v_source.modulo_id,btrim(p_title),v_source.descricao,v_source.conteudo_texto,v_order,v_source.duracao,'draft',v_source.content_kind,v_source.obrigatoria,v_source.completion_mode,v_source.completion_percent,false,'immediate',v_source.id,v_actor,v_actor)
  returning * into v_copy;
  perform private.log_curriculum_event(v_course_id,'lesson',v_copy.id,'duplicated',v_copy.version,jsonb_build_object('source_lesson_id',v_source.id,'media_and_assets_copied',false));
  return v_copy;
end;
$$;

create or replace function private.archive_lesson(p_lesson_id uuid,p_expected_version integer)
returns public.aulas language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=private.assert_curriculum_admin();
  v_lesson public.aulas;
  v_course_id uuid;
  v_max integer;
begin
  select * into v_lesson from public.aulas where id=p_lesson_id and deleted_at is null for update;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;
  if v_lesson.version<>p_expected_version then raise exception 'LESSON_VERSION_CONFLICT' using errcode='40001'; end if;
  select course_id into v_course_id from public.modulos where id=v_lesson.modulo_id;
  select coalesce(max(ordem),-1)+1 into v_max from public.aulas where modulo_id=v_lesson.modulo_id;
  update public.aulas set status='archived',ordem=v_max,version=version+1,updated_by_user_id=v_actor where id=p_lesson_id returning * into v_lesson;
  update public.lesson_media set is_active=false where lesson_id=p_lesson_id;
  perform private.log_curriculum_event(v_course_id,'lesson',v_lesson.id,'archived',v_lesson.version,'{}');
  return v_lesson;
end;
$$;

create or replace function private.delete_lesson(p_lesson_id uuid,p_expected_version integer)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  v_lesson public.aulas;
  v_course_id uuid;
begin
  perform private.assert_curriculum_admin();
  select * into v_lesson from public.aulas where id=p_lesson_id for update;
  if not found then raise exception 'LESSON_NOT_FOUND' using errcode='P0002'; end if;
  if v_lesson.version<>p_expected_version then raise exception 'LESSON_VERSION_CONFLICT' using errcode='40001'; end if;
  select course_id into v_course_id from public.modulos where id=v_lesson.modulo_id;
  if v_lesson.status<>'archived' or exists(select 1 from public.progresso_aulas where aula_id=p_lesson_id) or exists(select 1 from public.lesson_media where lesson_id=p_lesson_id) or exists(select 1 from public.assets where lesson_id=p_lesson_id and deleted_at is null) or exists(select 1 from public.lesson_prerequisites where prerequisite_lesson_id=p_lesson_id) then raise exception 'LESSON_HAS_DEPENDENCIES_ARCHIVE_REQUIRED' using errcode='23503'; end if;
  perform private.log_curriculum_event(v_course_id,'lesson',v_lesson.id,'deleted',v_lesson.version,'{}');
  delete from public.aulas where id=p_lesson_id;
  return true;
end;
$$;

create or replace function private.archive_lesson_material(p_asset_id uuid,p_lesson_id uuid)
returns public.assets language plpgsql security definer set search_path=''
as $$
declare
  v_asset public.assets;
  v_course_id uuid;
begin
  perform private.assert_curriculum_admin();
  select * into v_asset from public.assets where id=p_asset_id and lesson_id=p_lesson_id and purpose in('document','sample','preset','stem','project','archive','template','support_file') and deleted_at is null for update;
  if not found then raise exception 'LESSON_MATERIAL_NOT_FOUND' using errcode='P0002'; end if;
  update public.assets set deleted_at=statement_timestamp() where id=p_asset_id returning * into v_asset;
  delete from public.asset_access_grants where asset_id=p_asset_id;
  select m.course_id into v_course_id from public.aulas a join public.modulos m on m.id=a.modulo_id where a.id=p_lesson_id;
  perform private.log_curriculum_event(v_course_id,'lesson',p_lesson_id,'material_archived',(select version from public.aulas where id=p_lesson_id),jsonb_build_object('asset_id',p_asset_id));
  return v_asset;
end;
$$;

create function public.create_lesson(uuid,jsonb) returns public.aulas language sql security invoker set search_path='' as $$select private.create_lesson($1,$2)$$;
create function public.update_lesson(uuid,integer,jsonb) returns public.aulas language sql security invoker set search_path='' as $$select private.update_lesson($1,$2,$3)$$;
create function public.set_lesson_prerequisites(uuid,integer,uuid[]) returns public.aulas language sql security invoker set search_path='' as $$select private.set_lesson_prerequisites($1,$2,$3)$$;
create function public.reorder_lessons(uuid,integer,jsonb) returns public.modulos language sql security invoker set search_path='' as $$select private.reorder_lessons($1,$2,$3)$$;
create function public.move_lesson(uuid,integer,uuid,integer,integer) returns public.aulas language sql security invoker set search_path='' as $$select private.move_lesson($1,$2,$3,$4,$5)$$;
create function public.duplicate_lesson(uuid,text) returns public.aulas language sql security invoker set search_path='' as $$select private.duplicate_lesson($1,$2)$$;
create function public.archive_lesson(uuid,integer) returns public.aulas language sql security invoker set search_path='' as $$select private.archive_lesson($1,$2)$$;
create function public.delete_lesson(uuid,integer) returns boolean language sql security invoker set search_path='' as $$select private.delete_lesson($1,$2)$$;
create function public.archive_lesson_material(uuid,uuid) returns public.assets language sql security invoker set search_path='' as $$select private.archive_lesson_material($1,$2)$$;

revoke all on function public.create_lesson(uuid,jsonb) from public,anon;
revoke all on function public.update_lesson(uuid,integer,jsonb) from public,anon;
revoke all on function public.set_lesson_prerequisites(uuid,integer,uuid[]) from public,anon;
revoke all on function public.reorder_lessons(uuid,integer,jsonb) from public,anon;
revoke all on function public.move_lesson(uuid,integer,uuid,integer,integer) from public,anon;
revoke all on function public.duplicate_lesson(uuid,text) from public,anon;
revoke all on function public.archive_lesson(uuid,integer) from public,anon;
revoke all on function public.delete_lesson(uuid,integer) from public,anon;
revoke all on function public.archive_lesson_material(uuid,uuid) from public,anon;
grant execute on function public.create_lesson(uuid,jsonb),public.update_lesson(uuid,integer,jsonb),public.set_lesson_prerequisites(uuid,integer,uuid[]),public.reorder_lessons(uuid,integer,jsonb),public.move_lesson(uuid,integer,uuid,integer,integer),public.duplicate_lesson(uuid,text),public.archive_lesson(uuid,integer),public.delete_lesson(uuid,integer),public.archive_lesson_material(uuid,uuid) to authenticated,service_role;
