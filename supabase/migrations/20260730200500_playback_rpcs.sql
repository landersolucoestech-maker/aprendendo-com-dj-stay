-- FASE B10: playback token issuance, resolution and revocation.

create or replace function private.log_playback_event(
  p_playback_token_id uuid,
  p_user_id uuid,
  p_lesson_media_id uuid,
  p_event_type public.playback_event_type,
  p_reason text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.playback_events (
    playback_token_id,
    user_id,
    lesson_media_id,
    event_type,
    reason,
    details
  ) values (
    p_playback_token_id,
    p_user_id,
    p_lesson_media_id,
    p_event_type,
    nullif(left(btrim(coalesce(p_reason, '')), 200), ''),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.log_playback_event(uuid, uuid, uuid, public.playback_event_type, text, jsonb) from public, anon, authenticated;

create or replace function private.issue_lesson_playback_token(
  p_lesson_id uuid,
  p_fingerprint_hash text
)
returns table (
  granted boolean,
  reason text,
  token text,
  expires_at timestamptz,
  provider public.lesson_media_provider,
  watermark_text text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid;
  v_role public.app_role := (select private.current_user_role());
  v_media public.lesson_media;
  v_enrollment public.enrollments;
  v_raw_token text;
  v_token public.playback_tokens;
  v_watermark text;
begin
  begin
    v_session_id := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
  exception when invalid_text_representation then
    v_session_id := null;
  end;

  if v_user_id is null or v_session_id is null then
    perform private.log_playback_event(null, v_user_id, null, 'denied', 'AUTH_SESSION_REQUIRED');
    return query select false, 'AUTH_SESSION_REQUIRED'::text, null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  if p_fingerprint_hash is null or p_fingerprint_hash !~ '^[a-f0-9]{64}$' then
    perform private.log_playback_event(null, v_user_id, null, 'denied', 'INVALID_FINGERPRINT');
    return query select false, 'INVALID_FINGERPRINT'::text, null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  select lesson_media.* into v_media
  from public.lesson_media
  where lesson_media.lesson_id = p_lesson_id
    and lesson_media.is_active
  limit 1;

  if not found then
    perform private.log_playback_event(null, v_user_id, null, 'denied', 'MEDIA_NOT_AVAILABLE', jsonb_build_object('lesson_id', p_lesson_id));
    return query select false, 'MEDIA_NOT_AVAILABLE'::text, null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  if v_role = 'aluno'::public.app_role then
    select enrollments.* into v_enrollment
    from public.enrollments
    where enrollments.user_id = v_user_id
      and enrollments.course_id = (select private.lesson_course_id(p_lesson_id))
      and enrollments.status = 'active'::public.enrollment_status
      and enrollments.starts_at <= statement_timestamp()
      and (enrollments.expires_at is null or enrollments.expires_at > statement_timestamp())
      and exists (
        select 1 from public.courses
        where courses.id = enrollments.course_id
          and courses.status = 'published'::public.course_status
      )
    limit 1;

    if not found then
      perform private.log_playback_event(null, v_user_id, v_media.id, 'denied', 'ACTIVE_ENROLLMENT_REQUIRED', jsonb_build_object('lesson_id', p_lesson_id));
      return query select false, 'ACTIVE_ENROLLMENT_REQUIRED'::text, null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
      return;
    end if;
  elsif v_role <> 'administrador_proprietario'::public.app_role then
    perform private.log_playback_event(null, v_user_id, v_media.id, 'denied', 'ROLE_NOT_ALLOWED');
    return query select false, 'ROLE_NOT_ALLOWED'::text, null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  if v_media.provider = 'private_asset'::public.lesson_media_provider
    and not exists (
      select 1
      from public.assets
      join storage.objects
        on storage.objects.bucket_id = assets.bucket_id
       and storage.objects.name = assets.object_path
      where assets.id = v_media.asset_id
        and assets.state = 'published'::public.asset_state
        and assets.deleted_at is null
    ) then
    perform private.log_playback_event(null, v_user_id, v_media.id, 'denied', 'PRIVATE_MEDIA_OBJECT_UNAVAILABLE');
    return query select false, 'PRIVATE_MEDIA_OBJECT_UNAVAILABLE'::text, null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  with revoked as (
    update public.playback_tokens
    set revoked_at = statement_timestamp()
    where user_id = v_user_id
      and auth_session_id = v_session_id
      and lesson_media_id = v_media.id
      and revoked_at is null
      and expires_at > statement_timestamp()
    returning id, user_id, lesson_media_id
  )
  insert into public.playback_events (
    playback_token_id,
    user_id,
    lesson_media_id,
    event_type,
    reason,
    details
  )
  select id, user_id, lesson_media_id, 'revoked'::public.playback_event_type, 'TOKEN_RENEWED', '{}'::jsonb
  from revoked;

  v_raw_token := encode(gen_random_bytes(24), 'hex');
  v_watermark := case
    when v_media.watermark_enabled then
      'ID ' || upper(substr(encode(digest(v_user_id::text || ':' || v_session_id::text, 'sha256'), 'hex'), 1, 10))
    else null
  end;

  insert into public.playback_tokens (
    token_hash,
    user_id,
    auth_session_id,
    lesson_media_id,
    enrollment_id,
    fingerprint_hash,
    watermark_text,
    expires_at
  ) values (
    encode(digest(v_raw_token, 'sha256'), 'hex'),
    v_user_id,
    v_session_id,
    v_media.id,
    v_enrollment.id,
    p_fingerprint_hash,
    v_watermark,
    statement_timestamp() + interval '5 minutes'
  )
  returning * into v_token;

  perform private.log_playback_event(
    v_token.id,
    v_user_id,
    v_media.id,
    'issued',
    null,
    jsonb_build_object('expires_at', v_token.expires_at, 'provider', v_media.provider)
  );

  return query select true, null::text, v_raw_token, v_token.expires_at, v_media.provider, v_watermark;
end;
$$;

revoke all on function private.issue_lesson_playback_token(uuid, text) from public, anon, authenticated;
grant execute on function private.issue_lesson_playback_token(uuid, text) to authenticated;

create or replace function private.resolve_lesson_playback_token(
  p_token text,
  p_fingerprint_hash text
)
returns table (
  granted boolean,
  reason text,
  provider public.lesson_media_provider,
  bucket_id text,
  object_path text,
  embed_url text,
  mime_type text,
  watermark_text text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.playback_tokens;
  v_media public.lesson_media;
  v_asset public.assets;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48}$'
    or p_fingerprint_hash is null or p_fingerprint_hash !~ '^[a-f0-9]{64}$' then
    perform private.log_playback_event(null, null, null, 'denied', 'INVALID_PLAYBACK_CREDENTIALS');
    return query select false, 'INVALID_PLAYBACK_CREDENTIALS'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  select playback_tokens.* into v_token
  from public.playback_tokens
  where playback_tokens.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    perform private.log_playback_event(null, null, null, 'denied', 'TOKEN_NOT_FOUND');
    return query select false, 'TOKEN_NOT_FOUND'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  select lesson_media.* into v_media
  from public.lesson_media
  where lesson_media.id = v_token.lesson_media_id;

  if v_token.fingerprint_hash <> p_fingerprint_hash then
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'denied', 'FINGERPRINT_MISMATCH');
    return query select false, 'FINGERPRINT_MISMATCH'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, null::text, v_token.expires_at;
    return;
  end if;

  if v_token.revoked_at is not null then
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'denied', 'TOKEN_REVOKED');
    return query select false, 'TOKEN_REVOKED'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, v_token.watermark_text, v_token.expires_at;
    return;
  end if;

  if v_token.expires_at <= statement_timestamp() then
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'expired', 'TOKEN_EXPIRED');
    return query select false, 'TOKEN_EXPIRED'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, v_token.watermark_text, v_token.expires_at;
    return;
  end if;

  if not v_media.is_active then
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'denied', 'MEDIA_DISABLED');
    return query select false, 'MEDIA_DISABLED'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, v_token.watermark_text, v_token.expires_at;
    return;
  end if;

  if v_token.enrollment_id is not null and not exists (
    select 1
    from public.enrollments
    join public.courses on courses.id = enrollments.course_id
    where enrollments.id = v_token.enrollment_id
      and enrollments.user_id = v_token.user_id
      and enrollments.status = 'active'::public.enrollment_status
      and enrollments.starts_at <= statement_timestamp()
      and (enrollments.expires_at is null or enrollments.expires_at > statement_timestamp())
      and courses.status = 'published'::public.course_status
  ) then
    update public.playback_tokens set revoked_at = statement_timestamp() where id = v_token.id;
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'revoked', 'ENROLLMENT_NOT_ACTIVE');
    return query select false, 'ENROLLMENT_NOT_ACTIVE'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, v_token.watermark_text, v_token.expires_at;
    return;
  end if;

  if v_token.enrollment_id is null and not exists (
    select 1 from public.user_roles
    where user_roles.user_id = v_token.user_id
      and user_roles.role = 'administrador_proprietario'::public.app_role
  ) then
    update public.playback_tokens set revoked_at = statement_timestamp() where id = v_token.id;
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'revoked', 'ADMIN_ROLE_REMOVED');
    return query select false, 'ADMIN_ROLE_REMOVED'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, v_token.watermark_text, v_token.expires_at;
    return;
  end if;

  update public.playback_tokens
  set last_used_at = statement_timestamp(),
      use_count = use_count + 1
  where id = v_token.id;

  perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'resolved');

  if v_media.provider = 'private_asset'::public.lesson_media_provider then
    select assets.* into v_asset
    from public.assets
    join storage.objects
      on storage.objects.bucket_id = assets.bucket_id
     and storage.objects.name = assets.object_path
    where assets.id = v_media.asset_id
      and assets.state = 'published'::public.asset_state
      and assets.deleted_at is null;

    if not found then
      perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'denied', 'PRIVATE_MEDIA_OBJECT_UNAVAILABLE');
      return query select false, 'PRIVATE_MEDIA_OBJECT_UNAVAILABLE'::text, null::public.lesson_media_provider, null::text, null::text, null::text, null::text, v_token.watermark_text, v_token.expires_at;
      return;
    end if;

    return query select true, null::text, v_media.provider, v_asset.bucket_id, v_asset.object_path, null::text, v_asset.mime_type, v_token.watermark_text, v_token.expires_at;
    return;
  end if;

  return query select true, null::text, v_media.provider, null::text, null::text,
    private.lesson_embed_url(v_media.provider, v_media.external_video_id),
    null::text, v_token.watermark_text, v_token.expires_at;
end;
$$;

revoke all on function private.resolve_lesson_playback_token(text, text) from public, anon, authenticated;
grant execute on function private.resolve_lesson_playback_token(text, text) to service_role;

create or replace function private.revoke_lesson_playback_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.playback_tokens;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{48}$' then
    return false;
  end if;

  select playback_tokens.* into v_token
  from public.playback_tokens
  where playback_tokens.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then return false; end if;

  if v_token.user_id <> (select auth.uid())
    and (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'TOKEN_OWNERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if v_token.revoked_at is null then
    update public.playback_tokens set revoked_at = statement_timestamp() where id = v_token.id;
    perform private.log_playback_event(v_token.id, v_token.user_id, v_token.lesson_media_id, 'revoked', 'CLIENT_REVOKED');
  end if;

  return true;
end;
$$;

revoke all on function private.revoke_lesson_playback_token(text) from public, anon, authenticated;
grant execute on function private.revoke_lesson_playback_token(text) to authenticated;

create function public.request_lesson_playback_token(p_lesson_id uuid, p_fingerprint_hash text)
returns table (
  granted boolean,
  reason text,
  token text,
  expires_at timestamptz,
  provider public.lesson_media_provider,
  watermark_text text
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.issue_lesson_playback_token(p_lesson_id, p_fingerprint_hash)
$$;

create function public.resolve_lesson_playback_token(p_token text, p_fingerprint_hash text)
returns table (
  granted boolean,
  reason text,
  provider public.lesson_media_provider,
  bucket_id text,
  object_path text,
  embed_url text,
  mime_type text,
  watermark_text text,
  expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from private.resolve_lesson_playback_token(p_token, p_fingerprint_hash)
$$;

create function public.revoke_lesson_playback_token(p_token text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_lesson_playback_token(p_token)
$$;

revoke all on function public.request_lesson_playback_token(uuid, text) from public, anon;
revoke all on function public.resolve_lesson_playback_token(text, text) from public, anon, authenticated;
revoke all on function public.revoke_lesson_playback_token(text) from public, anon;
grant execute on function public.request_lesson_playback_token(uuid, text) to authenticated;
grant execute on function public.resolve_lesson_playback_token(text, text) to service_role;
grant execute on function public.revoke_lesson_playback_token(text) to authenticated;
