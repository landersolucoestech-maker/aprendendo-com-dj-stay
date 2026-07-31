create or replace function private.duplicate_course(p_course_id uuid,p_title text,p_slug text)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare v_source public.courses; v_copy public.courses; v_actor uuid := (select auth.uid());
begin
  perform private.assert_course_admin();
  select * into v_source from public.courses where id=p_course_id and deleted_at is null;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode='P0002'; end if;
  if nullif(btrim(p_title),'') is null or nullif(btrim(p_slug),'') is null then raise exception 'DUPLICATE_TITLE_AND_SLUG_REQUIRED' using errcode='22023'; end if;
  insert into public.courses(
    title,slug,status,access_duration_days,short_description,description,category,language_code,level,
    objectives,prerequisites,cover_asset_id,thumbnail_asset_id,price_amount,currency_code,
    promotional_price_amount,promotion_starts_at,promotion_ends_at,availability_starts_at,availability_ends_at,
    completion_mode,completion_required_percent,certificate_enabled,certificate_min_completion_percent,
    release_mode,release_at,drip_interval_days,affiliate_eligible,preview_enabled,duplicated_from_course_id,
    created_by_user_id,updated_by_user_id
  ) select
    btrim(p_title),btrim(p_slug),'draft',access_duration_days,short_description,description,category,language_code,level,
    objectives,prerequisites,cover_asset_id,thumbnail_asset_id,price_amount,currency_code,
    promotional_price_amount,promotion_starts_at,promotion_ends_at,availability_starts_at,availability_ends_at,
    completion_mode,completion_required_percent,certificate_enabled,certificate_min_completion_percent,
    release_mode,release_at,drip_interval_days,affiliate_eligible,preview_enabled,id,v_actor,v_actor
  from public.courses where id=p_course_id returning * into v_copy;
  perform private.log_course_editor_event(v_copy.id,'duplicated',v_copy.version,jsonb_build_object('source_course_id',p_course_id,'snapshot',private.course_snapshot(v_copy.id)));
  return v_copy;
end;
$$;

create or replace function private.transition_course_status(p_course_id uuid,p_expected_version integer,p_target public.course_status)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare v_course public.courses; v_before public.course_status; v_event public.course_editor_event_type; v_actor uuid := (select auth.uid());
begin
  perform private.assert_course_admin();
  select * into v_course from public.courses where id=p_course_id for update;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode='P0002'; end if;
  if v_course.deleted_at is not null then raise exception 'COURSE_DELETED' using errcode='22023'; end if;
  if v_course.version<>p_expected_version then raise exception 'COURSE_VERSION_CONFLICT' using errcode='40001'; end if;
  v_before := v_course.status;
  if p_target='published' then
    perform private.assert_course_publishable(p_course_id);
    v_event := 'published';
  elsif p_target='draft' then
    if v_before<>'published' then raise exception 'ONLY_PUBLISHED_COURSE_CAN_UNPUBLISH' using errcode='22023'; end if;
    v_event := 'unpublished';
  elsif p_target='archived' then
    v_event := 'archived';
  else raise exception 'COURSE_STATUS_TARGET_INVALID' using errcode='22023';
  end if;
  update public.courses set
    status=p_target,
    published_at=case when p_target='published' then coalesce(published_at,statement_timestamp()) else published_at end,
    unpublished_at=case when p_target='draft' then statement_timestamp() else null end,
    archived_at=case when p_target='archived' then statement_timestamp() else null end,
    updated_by_user_id=v_actor,version=version+1
  where id=p_course_id returning * into v_course;
  perform private.log_course_editor_event(v_course.id,v_event,v_course.version,jsonb_build_object('from',v_before,'to',p_target));
  return v_course;
end;
$$;

create or replace function private.delete_course(p_course_id uuid,p_expected_version integer)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare v_course public.courses; v_actor uuid := (select auth.uid());
begin
  perform private.assert_course_admin();
  select * into v_course from public.courses where id=p_course_id for update;
  if not found then raise exception 'COURSE_NOT_FOUND' using errcode='P0002'; end if;
  if v_course.version<>p_expected_version then raise exception 'COURSE_VERSION_CONFLICT' using errcode='40001'; end if;
  if v_course.deleted_at is not null then return v_course; end if;
  if exists(select 1 from public.modulos where course_id=p_course_id)
    or exists(select 1 from public.enrollments where course_id=p_course_id) then
    raise exception 'COURSE_HAS_DEPENDENCIES_ARCHIVE_REQUIRED' using errcode='23503';
  end if;
  update public.courses set
    status='archived',archived_at=coalesce(archived_at,statement_timestamp()),deleted_at=statement_timestamp(),
    slug=left(slug || '-deleted-' || left(id::text,8),200),updated_by_user_id=v_actor,version=version+1
  where id=p_course_id returning * into v_course;
  perform private.log_course_editor_event(v_course.id,'deleted',v_course.version,jsonb_build_object('soft_delete',true));
  return v_course;
end;
$$;
