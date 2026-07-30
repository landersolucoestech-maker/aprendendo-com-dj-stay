create or replace function public.transition_asset_state(
  p_asset_id uuid,
  p_target_state public.asset_state
)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_asset public.assets;
  v_from_state public.asset_state;
  v_previous_avatar_id uuid;
begin
  select * into v_asset from public.assets where id = p_asset_id for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_role <> 'administrador_proprietario'::public.app_role
    and not (v_asset.purpose = 'avatar'::public.asset_purpose and v_asset.owner_user_id = v_user_id) then
    raise exception 'ASSET_ACCESS_DENIED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = v_asset.bucket_id
      and name = v_asset.object_path
  ) then
    raise exception 'OBJECT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_target_state = 'processing'::public.asset_state then
    if v_role <> 'administrador_proprietario'::public.app_role or v_asset.state <> 'uploaded'::public.asset_state then
      raise exception 'INVALID_PROCESSING_TRANSITION' using errcode = '22023';
    end if;
  elsif p_target_state = 'published'::public.asset_state then
    if v_asset.state not in ('uploaded'::public.asset_state, 'processing'::public.asset_state) then
      raise exception 'INVALID_PUBLISH_TRANSITION' using errcode = '22023';
    end if;
  else
    raise exception 'INVALID_TARGET_STATE' using errcode = '22023';
  end if;

  v_from_state := v_asset.state;

  update public.assets
  set state = p_target_state,
      processing_started_at = case when p_target_state = 'processing'::public.asset_state then statement_timestamp() else processing_started_at end,
      published_at = case when p_target_state = 'published'::public.asset_state then statement_timestamp() else published_at end
  where id = v_asset.id
  returning * into v_asset;

  if p_target_state = 'processing'::public.asset_state then
    perform private.log_asset_event(v_asset.id, 'processing_started'::public.asset_event_type, v_from_state, p_target_state, '{}'::jsonb);
  else
    perform private.log_asset_event(v_asset.id, 'published'::public.asset_event_type, v_from_state, p_target_state, '{}'::jsonb);

    if v_asset.purpose = 'avatar'::public.asset_purpose then
      select avatar_asset_id into v_previous_avatar_id
      from public.user_profiles
      where user_id = v_asset.owner_user_id;

      insert into public.user_profiles (user_id, avatar_asset_id)
      values (v_asset.owner_user_id, v_asset.id)
      on conflict (user_id) do update set avatar_asset_id = excluded.avatar_asset_id;

      perform private.log_asset_event(v_asset.id, 'associated'::public.asset_event_type, p_target_state, p_target_state, jsonb_build_object('entity', 'user_profile', 'entity_id', v_asset.owner_user_id));

      if v_previous_avatar_id is not null and v_previous_avatar_id <> v_asset.id then
        update public.assets
        set state = 'failed'::public.asset_state,
            failed_at = statement_timestamp(),
            failure_reason = 'REPLACED_BY_NEW_AVATAR'
        where id = v_previous_avatar_id
          and deleted_at is null;

        perform private.log_asset_event(v_previous_avatar_id, 'cleanup_requested'::public.asset_event_type, 'published'::public.asset_state, 'failed'::public.asset_state, jsonb_build_object('replacement_asset_id', v_asset.id));
      end if;
    end if;
  end if;

  return v_asset;
end;
$$;

create or replace function public.fail_asset_upload(
  p_asset_id uuid,
  p_reason text,
  p_object_removed boolean default false
)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_asset public.assets;
  v_from_state public.asset_state;
begin
  select * into v_asset from public.assets where id = p_asset_id for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_role <> 'administrador_proprietario'::public.app_role
    and v_asset.owner_user_id <> v_user_id then
    raise exception 'ASSET_ACCESS_DENIED' using errcode = '42501';
  end if;

  if v_asset.state = 'published'::public.asset_state then
    raise exception 'PUBLISHED_ASSET_CANNOT_FAIL' using errcode = '22023';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'INVALID_FAILURE_REASON' using errcode = '22023';
  end if;

  if p_object_removed and exists (
    select 1 from storage.objects
    where bucket_id = v_asset.bucket_id and name = v_asset.object_path
  ) then
    raise exception 'OBJECT_STILL_EXISTS' using errcode = '22023';
  end if;

  v_from_state := v_asset.state;

  update public.assets
  set state = 'failed'::public.asset_state,
      failed_at = coalesce(failed_at, statement_timestamp()),
      failure_reason = left(btrim(p_reason), 500),
      deleted_at = case when p_object_removed then statement_timestamp() else deleted_at end
  where id = v_asset.id
  returning * into v_asset;

  perform private.log_asset_event(
    v_asset.id,
    case when p_object_removed then 'object_removed'::public.asset_event_type else 'failed'::public.asset_event_type end,
    v_from_state,
    'failed'::public.asset_state,
    jsonb_build_object('reason', v_asset.failure_reason)
  );

  return v_asset;
end;
$$;
