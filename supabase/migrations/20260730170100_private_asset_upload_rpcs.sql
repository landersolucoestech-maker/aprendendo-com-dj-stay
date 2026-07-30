create or replace function public.prepare_asset_upload(
  p_purpose public.asset_purpose,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_idempotency_key text,
  p_lesson_id uuid default null
)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_extension text;
  v_normalized_name text;
  v_asset public.assets;
begin
  if v_user_id is null or v_role is null then
    raise exception 'AUTHORIZATION_REQUIRED' using errcode = '42501';
  end if;

  if p_original_name is null
    or char_length(p_original_name) not between 1 and 255
    or p_original_name ~ '[/\\]'
    or p_original_name ~ '[[:cntrl:]]' then
    raise exception 'INVALID_FILE_NAME' using errcode = '22023';
  end if;

  v_extension := lower(nullif(substring(p_original_name from '\.([A-Za-z0-9]{1,16})$'), ''));
  v_normalized_name := private.normalize_asset_name(p_original_name);

  if v_extension is null or v_normalized_name = '' then
    raise exception 'INVALID_FILE_EXTENSION' using errcode = '22023';
  end if;

  if p_mime_type is null or p_mime_type <> lower(p_mime_type) then
    raise exception 'INVALID_MIME_TYPE' using errcode = '22023';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > private.asset_max_size_bytes(p_purpose) then
    raise exception 'FILE_SIZE_NOT_ALLOWED' using errcode = '22023';
  end if;

  if not private.asset_type_allowed(p_purpose, v_extension, p_mime_type) then
    raise exception 'FILE_TYPE_NOT_ALLOWED' using errcode = '22023';
  end if;

  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9:_-]{16,128}$' then
    raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode = '22023';
  end if;

  if p_purpose = 'avatar'::public.asset_purpose then
    if p_lesson_id is not null then
      raise exception 'INVALID_AVATAR_SCOPE' using errcode = '22023';
    end if;
  elsif p_lesson_id is not null then
    if v_role <> 'administrador_proprietario'::public.app_role then
      raise exception 'ADMIN_REQUIRED_FOR_LESSON_ASSET' using errcode = '42501';
    end if;

    if not exists (select 1 from public.aulas where aulas.id = p_lesson_id) then
      raise exception 'LESSON_NOT_FOUND' using errcode = 'P0002';
    end if;
  elsif v_role <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED_FOR_UNSCOPED_ASSET' using errcode = '42501';
  end if;

  select * into v_asset
  from public.assets
  where created_by_user_id = v_user_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_asset.purpose <> p_purpose
      or v_asset.original_name <> p_original_name
      or v_asset.mime_type <> p_mime_type
      or v_asset.size_bytes <> p_size_bytes
      or v_asset.lesson_id is distinct from p_lesson_id then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;

    return v_asset;
  end if;

  insert into public.assets (
    owner_user_id,
    created_by_user_id,
    lesson_id,
    purpose,
    original_name,
    normalized_name,
    extension,
    mime_type,
    size_bytes,
    idempotency_key
  ) values (
    v_user_id,
    v_user_id,
    p_lesson_id,
    p_purpose,
    p_original_name,
    v_normalized_name,
    v_extension,
    p_mime_type,
    p_size_bytes,
    p_idempotency_key
  )
  returning * into v_asset;

  perform private.log_asset_event(
    v_asset.id,
    'intent_created'::public.asset_event_type,
    null,
    'pending'::public.asset_state,
    jsonb_build_object('purpose', p_purpose, 'lesson_id', p_lesson_id)
  );

  return v_asset;
end;
$$;

create or replace function public.confirm_asset_upload(p_asset_id uuid)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_asset public.assets;
  v_object storage.objects;
  v_actual_size bigint;
  v_actual_mime text;
begin
  select * into v_asset from public.assets where id = p_asset_id for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_role <> 'administrador_proprietario'::public.app_role
    and v_asset.owner_user_id <> v_user_id then
    raise exception 'ASSET_ACCESS_DENIED' using errcode = '42501';
  end if;

  if v_asset.state in ('uploaded'::public.asset_state, 'processing'::public.asset_state, 'published'::public.asset_state) then
    return v_asset;
  end if;

  if v_asset.state <> 'pending'::public.asset_state or v_asset.deleted_at is not null then
    raise exception 'INVALID_ASSET_STATE' using errcode = '22023';
  end if;

  select * into v_object
  from storage.objects
  where bucket_id = v_asset.bucket_id
    and name = v_asset.object_path
  limit 1;

  if not found then
    update public.assets
    set state = 'failed'::public.asset_state,
        failed_at = statement_timestamp(),
        failure_reason = 'OBJECT_NOT_FOUND'
    where id = v_asset.id
    returning * into v_asset;

    perform private.log_asset_event(v_asset.id, 'failed'::public.asset_event_type, 'pending'::public.asset_state, 'failed'::public.asset_state, jsonb_build_object('reason', 'OBJECT_NOT_FOUND'));
    return v_asset;
  end if;

  v_actual_size := nullif(v_object.metadata ->> 'size', '')::bigint;
  v_actual_mime := lower(coalesce(v_object.metadata ->> 'mimetype', v_object.metadata ->> 'contentType', ''));

  if v_object.owner_id is distinct from v_asset.owner_user_id::text
    or v_actual_size is distinct from v_asset.size_bytes
    or v_actual_mime is distinct from v_asset.mime_type then
    update public.assets
    set state = 'failed'::public.asset_state,
        failed_at = statement_timestamp(),
        failure_reason = 'OBJECT_METADATA_MISMATCH'
    where id = v_asset.id
    returning * into v_asset;

    perform private.log_asset_event(v_asset.id, 'failed'::public.asset_event_type, 'pending'::public.asset_state, 'failed'::public.asset_state, jsonb_build_object('reason', 'OBJECT_METADATA_MISMATCH'));
    return v_asset;
  end if;

  update public.assets
  set state = 'uploaded'::public.asset_state,
      uploaded_at = statement_timestamp(),
      failure_reason = null,
      failed_at = null
  where id = v_asset.id
  returning * into v_asset;

  perform private.log_asset_event(v_asset.id, 'upload_confirmed'::public.asset_event_type, 'pending'::public.asset_state, 'uploaded'::public.asset_state, jsonb_build_object('storage_object_id', v_object.id));
  return v_asset;
end;
$$;
