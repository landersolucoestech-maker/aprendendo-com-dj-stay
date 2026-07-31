-- FASE B12: qualify enrollment columns that collide with RETURNS TABLE output names.

create or replace function private.issue_lesson_playback_token(
  p_lesson_id uuid,
  p_fingerprint_hash text
)
returns table(
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
    return query select false, 'AUTH_SESSION_REQUIRED', null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  if p_fingerprint_hash is null or p_fingerprint_hash !~ '^[a-f0-9]{64}$' then
    perform private.log_playback_event(null, v_user_id, null, 'denied', 'INVALID_FINGERPRINT');
    return query select false, 'INVALID_FINGERPRINT', null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  select * into v_media
  from public.lesson_media
  where lesson_id = p_lesson_id and is_active
  limit 1;

  if not found then
    perform private.log_playback_event(null, v_user_id, null, 'denied', 'MEDIA_NOT_AVAILABLE', jsonb_build_object('lesson_id', p_lesson_id));
    return query select false, 'MEDIA_NOT_AVAILABLE', null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
    return;
  end if;

  if v_role = 'aluno'::public.app_role then
    if not private.lesson_available_to_user(v_user_id, p_lesson_id) then
      perform private.log_playback_event(null, v_user_id, v_media.id, 'denied', 'LESSON_NOT_AVAILABLE', jsonb_build_object('lesson_id', p_lesson_id));
      return query select false, 'LESSON_NOT_AVAILABLE', null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
      return;
    end if;

    select e.* into v_enrollment
    from public.enrollments e
    where e.user_id = v_user_id
      and e.course_id = private.lesson_course_id(p_lesson_id)
      and e.status = 'active'::public.enrollment_status
      and e.starts_at <= statement_timestamp()
      and (e.expires_at is null or e.expires_at > statement_timestamp())
    limit 1;
  elsif v_role <> 'administrador_proprietario'::public.app_role then
    perform private.log_playback_event(null, v_user_id, v_media.id, 'denied', 'ROLE_NOT_ALLOWED');
    return query select false, 'ROLE_NOT_ALLOWED', null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
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
    return query select false, 'PRIVATE_MEDIA_OBJECT_UNAVAILABLE', null::text, null::timestamptz, null::public.lesson_media_provider, null::text;
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
  insert into public.playback_events(
    playback_token_id, user_id, lesson_media_id, event_type, reason, details
  )
  select id, user_id, lesson_media_id, 'revoked', 'TOKEN_RENEWED', '{}'::jsonb
  from revoked;

  v_raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_watermark := case
    when v_media.watermark_enabled then
      'ID ' || upper(substr(encode(extensions.digest(v_user_id::text || ':' || v_session_id::text, 'sha256'), 'hex'), 1, 10))
    else null
  end;

  insert into public.playback_tokens(
    token_hash,
    user_id,
    auth_session_id,
    lesson_media_id,
    enrollment_id,
    fingerprint_hash,
    watermark_text,
    expires_at
  ) values (
    encode(extensions.digest(v_raw_token, 'sha256'), 'hex'),
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

  return query
  select true, null::text, v_raw_token, v_token.expires_at, v_media.provider, v_watermark;
end;
$$;

revoke all on function private.issue_lesson_playback_token(uuid, text) from public, anon, authenticated;
grant execute on function private.issue_lesson_playback_token(uuid, text) to authenticated;
