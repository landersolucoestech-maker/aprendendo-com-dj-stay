create or replace function private.assert_course_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;
end;
$$;

create or replace function private.assert_course_payload_keys(p_payload jsonb, p_allowed text[])
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare v_key text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'COURSE_PAYLOAD_MUST_BE_OBJECT' using errcode='22023'; end if;
  for v_key in select jsonb_object_keys(p_payload) loop
    if not (v_key = any(p_allowed)) then raise exception 'COURSE_FIELD_NOT_ALLOWED: %', v_key using errcode='22023'; end if;
  end loop;
end;
$$;

create or replace function private.create_course(p_payload jsonb)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_course public.courses;
  v_title text;
  v_slug text;
  v_cover uuid;
  v_thumbnail uuid;
begin
  perform private.assert_course_admin();
  perform private.assert_course_payload_keys(p_payload,array[
    'title','slug','short_description','description','category','language_code','level',
    'objectives','prerequisites','cover_asset_id','thumbnail_asset_id','price_amount','currency_code',
    'promotional_price_amount','promotion_starts_at','promotion_ends_at','availability_starts_at',
    'availability_ends_at','access_duration_days','completion_mode','completion_required_percent',
    'certificate_enabled','certificate_min_completion_percent','release_mode','release_at',
    'drip_interval_days','affiliate_eligible','preview_enabled'
  ]);
  v_title := nullif(btrim(p_payload->>'title'),'');
  v_slug := nullif(btrim(p_payload->>'slug'),'');
  if v_title is null or v_slug is null then raise exception 'COURSE_TITLE_AND_SLUG_REQUIRED' using errcode='22023'; end if;
  v_cover := nullif(p_payload->>'cover_asset_id','')::uuid;
  v_thumbnail := nullif(p_payload->>'thumbnail_asset_id','')::uuid;
  perform private.assert_course_asset(v_cover,'cover');
  perform private.assert_course_asset(v_thumbnail,'thumbnail');
  insert into public.courses(
    title,slug,short_description,description,category,language_code,level,objectives,prerequisites,
    cover_asset_id,thumbnail_asset_id,price_amount,currency_code,promotional_price_amount,
    promotion_starts_at,promotion_ends_at,availability_starts_at,availability_ends_at,
    access_duration_days,completion_mode,completion_required_percent,certificate_enabled,
    certificate_min_completion_percent,release_mode,release_at,drip_interval_days,
    affiliate_eligible,preview_enabled,created_by_user_id,updated_by_user_id
  ) values (
    v_title,v_slug,nullif(btrim(p_payload->>'short_description'),''),nullif(btrim(p_payload->>'description'),''),
    nullif(btrim(p_payload->>'category'),''),coalesce(nullif(p_payload->>'language_code',''),'pt-BR'),
    coalesce((p_payload->>'level')::public.course_level,'all_levels'::public.course_level),
    private.course_text_array(p_payload->'objectives','objectives'),
    private.course_text_array(p_payload->'prerequisites','prerequisites'),
    v_cover,v_thumbnail,coalesce((p_payload->>'price_amount')::numeric,0),
    coalesce(upper(p_payload->>'currency_code'),'BRL'),(p_payload->>'promotional_price_amount')::numeric,
    (p_payload->>'promotion_starts_at')::timestamptz,(p_payload->>'promotion_ends_at')::timestamptz,
    (p_payload->>'availability_starts_at')::timestamptz,(p_payload->>'availability_ends_at')::timestamptz,
    (p_payload->>'access_duration_days')::integer,
    coalesce((p_payload->>'completion_mode')::public.course_completion_mode,'all_required_lessons'),
    coalesce((p_payload->>'completion_required_percent')::smallint,100),
    coalesce((p_payload->>'certificate_enabled')::boolean,false),
    coalesce((p_payload->>'certificate_min_completion_percent')::smallint,100),
    coalesce((p_payload->>'release_mode')::public.course_release_mode,'immediate'),
    (p_payload->>'release_at')::timestamptz,(p_payload->>'drip_interval_days')::integer,
    coalesce((p_payload->>'affiliate_eligible')::boolean,false),
    coalesce((p_payload->>'preview_enabled')::boolean,true),v_actor,v_actor
  ) returning * into v_course;
  perform private.log_course_editor_event(v_course.id,'created',v_course.version,jsonb_build_object('snapshot',private.course_snapshot(v_course.id)));
  return v_course;
end;
$$;
