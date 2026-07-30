-- Qualify token hashing in trusted playback resolution and revocation.

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
  where playback_tokens.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
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
  where playback_tokens.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
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
