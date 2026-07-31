create or replace function private.update_course(p_course_id uuid,p_expected_version integer,p_patch jsonb)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_before jsonb;
  v_course public.courses;
  v_cover uuid;
  v_thumbnail uuid;
begin
  perform private.assert_course_admin();
  perform private.assert_course_payload_keys(p_patch,array[
    'title','slug','short_description','description','category','language_code','level',
    'objectives','prerequisites','cover_asset_id','thumbnail_asset_id','price_amount','currency_code',
    'promotional_price_amount','promotion_starts_at','promotion_ends_at','availability_starts_at',
    'availability_ends_at','access_duration_days','completion_mode','completion_required_percent',
    'certificate_enabled','certificate_min_completion_percent','release_mode','release_at',
    'drip_interval_days','affiliate_eligible','preview_enabled'
  ]);
  if p_patch='{}'::jsonb then raise exception 'COURSE_PATCH_EMPTY' using errcode='22023'; end if;
  select private.course_snapshot(p_course_id) into v_before;
  if v_before is null then raise exception 'COURSE_NOT_FOUND' using errcode='P0002'; end if;
  select * into v_course from public.courses where id=p_course_id for update;
  if v_course.deleted_at is not null then raise exception 'COURSE_DELETED' using errcode='22023'; end if;
  if v_course.version <> p_expected_version then raise exception 'COURSE_VERSION_CONFLICT' using errcode='40001'; end if;
  if p_patch ? 'title' and nullif(btrim(p_patch->>'title'),'') is null then raise exception 'COURSE_TITLE_REQUIRED' using errcode='22023'; end if;
  if p_patch ? 'slug' and nullif(btrim(p_patch->>'slug'),'') is null then raise exception 'COURSE_SLUG_REQUIRED' using errcode='22023'; end if;
  if p_patch ? 'short_description' and jsonb_typeof(p_patch->'short_description')='string' and nullif(btrim(p_patch->>'short_description'),'') is null then raise exception 'COURSE_SHORT_DESCRIPTION_EMPTY' using errcode='22023'; end if;
  if p_patch ? 'description' and jsonb_typeof(p_patch->'description')='string' and nullif(btrim(p_patch->>'description'),'') is null then raise exception 'COURSE_DESCRIPTION_EMPTY' using errcode='22023'; end if;
  if p_patch ? 'category' and jsonb_typeof(p_patch->'category')='string' and nullif(btrim(p_patch->>'category'),'') is null then raise exception 'COURSE_CATEGORY_EMPTY' using errcode='22023'; end if;
  v_cover := case when p_patch ? 'cover_asset_id' then nullif(p_patch->>'cover_asset_id','')::uuid else v_course.cover_asset_id end;
  v_thumbnail := case when p_patch ? 'thumbnail_asset_id' then nullif(p_patch->>'thumbnail_asset_id','')::uuid else v_course.thumbnail_asset_id end;
  perform private.assert_course_asset(v_cover,'cover');
  perform private.assert_course_asset(v_thumbnail,'thumbnail');

  update public.courses set
    title=case when p_patch ? 'title' then btrim(p_patch->>'title') else title end,
    slug=case when p_patch ? 'slug' then btrim(p_patch->>'slug') else slug end,
    short_description=case when p_patch ? 'short_description' then nullif(btrim(p_patch->>'short_description'),'') else short_description end,
    description=case when p_patch ? 'description' then nullif(btrim(p_patch->>'description'),'') else description end,
    category=case when p_patch ? 'category' then nullif(btrim(p_patch->>'category'),'') else category end,
    language_code=case when p_patch ? 'language_code' then p_patch->>'language_code' else language_code end,
    level=case when p_patch ? 'level' then (p_patch->>'level')::public.course_level else level end,
    objectives=case when p_patch ? 'objectives' then private.course_text_array(p_patch->'objectives','objectives') else objectives end,
    prerequisites=case when p_patch ? 'prerequisites' then private.course_text_array(p_patch->'prerequisites','prerequisites') else prerequisites end,
    cover_asset_id=v_cover,thumbnail_asset_id=v_thumbnail,
    price_amount=case when p_patch ? 'price_amount' then (p_patch->>'price_amount')::numeric else price_amount end,
    currency_code=case when p_patch ? 'currency_code' then upper(p_patch->>'currency_code') else currency_code end,
    promotional_price_amount=case when p_patch ? 'promotional_price_amount' then (p_patch->>'promotional_price_amount')::numeric else promotional_price_amount end,
    promotion_starts_at=case when p_patch ? 'promotion_starts_at' then (p_patch->>'promotion_starts_at')::timestamptz else promotion_starts_at end,
    promotion_ends_at=case when p_patch ? 'promotion_ends_at' then (p_patch->>'promotion_ends_at')::timestamptz else promotion_ends_at end,
    availability_starts_at=case when p_patch ? 'availability_starts_at' then (p_patch->>'availability_starts_at')::timestamptz else availability_starts_at end,
    availability_ends_at=case when p_patch ? 'availability_ends_at' then (p_patch->>'availability_ends_at')::timestamptz else availability_ends_at end,
    access_duration_days=case when p_patch ? 'access_duration_days' then (p_patch->>'access_duration_days')::integer else access_duration_days end,
    completion_mode=case when p_patch ? 'completion_mode' then (p_patch->>'completion_mode')::public.course_completion_mode else completion_mode end,
    completion_required_percent=case when p_patch ? 'completion_required_percent' then (p_patch->>'completion_required_percent')::smallint else completion_required_percent end,
    certificate_enabled=case when p_patch ? 'certificate_enabled' then (p_patch->>'certificate_enabled')::boolean else certificate_enabled end,
    certificate_min_completion_percent=case when p_patch ? 'certificate_min_completion_percent' then (p_patch->>'certificate_min_completion_percent')::smallint else certificate_min_completion_percent end,
    release_mode=case when p_patch ? 'release_mode' then (p_patch->>'release_mode')::public.course_release_mode else release_mode end,
    release_at=case when p_patch ? 'release_at' then (p_patch->>'release_at')::timestamptz else release_at end,
    drip_interval_days=case when p_patch ? 'drip_interval_days' then (p_patch->>'drip_interval_days')::integer else drip_interval_days end,
    affiliate_eligible=case when p_patch ? 'affiliate_eligible' then (p_patch->>'affiliate_eligible')::boolean else affiliate_eligible end,
    preview_enabled=case when p_patch ? 'preview_enabled' then (p_patch->>'preview_enabled')::boolean else preview_enabled end,
    updated_by_user_id=v_actor,version=version+1
  where id=p_course_id returning * into v_course;
  if v_course.status='published' then perform private.assert_course_publishable(v_course.id); end if;
  perform private.log_course_editor_event(v_course.id,'updated',v_course.version,jsonb_build_object('before',v_before,'after',private.course_snapshot(v_course.id),'fields',p_patch));
  return v_course;
end;
$$;
