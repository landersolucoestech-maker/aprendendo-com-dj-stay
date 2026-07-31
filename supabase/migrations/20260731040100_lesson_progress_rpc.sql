-- FASE B15: server-side lesson progress aggregation and event ordering.

create or replace function private.save_lesson_progress_event(
  p_lesson_id uuid,
  p_event_id uuid,
  p_client_instance_id uuid,
  p_event_sequence bigint,
  p_event_type public.lesson_progress_event_type,
  p_position_seconds integer,
  p_duration_seconds integer,
  p_observed_at timestamptz
)
returns public.progresso_aulas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid;
  v_role public.app_role := (select private.current_user_role());
  v_lesson public.aulas;
  v_existing_event public.lesson_progress_events;
  v_stream public.lesson_progress_streams;
  v_progress public.progresso_aulas;
  v_stream_found boolean := false;
  v_progress_found boolean := false;
  v_effective_duration integer;
  v_calculated_percent integer := 0;
  v_event_completes boolean := false;
  v_result_position integer;
  v_result_percent integer;
  v_result_completed boolean;
  v_now timestamptz := statement_timestamp();
begin
  begin
    v_session_id := nullif((select auth.jwt() ->> 'session_id'), '')::uuid;
  exception when invalid_text_representation then
    v_session_id := null;
  end;

  if v_user_id is null or v_session_id is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;
  if p_lesson_id is null or p_event_id is null or p_client_instance_id is null then
    raise exception 'PROGRESS_IDENTIFIERS_REQUIRED' using errcode = '22023';
  end if;
  if p_event_sequence is null or p_event_sequence <= 0 then
    raise exception 'PROGRESS_SEQUENCE_INVALID' using errcode = '22023';
  end if;
  if p_position_seconds is null or p_position_seconds < 0 or p_position_seconds > 604800 then
    raise exception 'PROGRESS_POSITION_INVALID' using errcode = '22023';
  end if;
  if p_duration_seconds is not null and (p_duration_seconds <= 0 or p_duration_seconds > 604800) then
    raise exception 'PROGRESS_DURATION_INVALID' using errcode = '22023';
  end if;
  if p_observed_at is null
     or p_observed_at > v_now + interval '5 minutes'
     or p_observed_at < v_now - interval '7 days' then
    raise exception 'PROGRESS_OBSERVED_AT_INVALID' using errcode = '22023';
  end if;

  select * into v_lesson
  from public.aulas
  where id = p_lesson_id
    and deleted_at is null;
  if not found then
    raise exception 'LESSON_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_role = 'aluno'::public.app_role then
    if not private.lesson_available_to_user(v_user_id, p_lesson_id) then
      raise exception 'LESSON_ACCESS_REQUIRED' using errcode = '42501';
    end if;
  elsif v_role <> 'administrador_proprietario'::public.app_role then
    raise exception 'ROLE_NOT_ALLOWED' using errcode = '42501';
  end if;

  v_effective_duration := coalesce(
    p_duration_seconds,
    case when v_lesson.duracao is null then null else v_lesson.duracao * 60 end
  );
  if v_effective_duration is not null and p_position_seconds > v_effective_duration + 30 then
    raise exception 'PROGRESS_POSITION_EXCEEDS_DURATION' using errcode = '22023';
  end if;

  if v_effective_duration is not null then
    v_calculated_percent := least(
      100,
      floor((p_position_seconds::numeric / v_effective_duration::numeric) * 100)::integer
    );
  end if;
  if p_event_type = 'ended'::public.lesson_progress_event_type then
    v_calculated_percent := 100;
  end if;

  v_event_completes := case v_lesson.completion_mode
    when 'manual'::public.lesson_completion_mode then
      p_event_type = 'manual_complete'::public.lesson_progress_event_type
    when 'media_progress'::public.lesson_completion_mode then
      p_event_type = 'ended'::public.lesson_progress_event_type
      or v_calculated_percent >= coalesce(v_lesson.completion_percent, 90)
    when 'reading_acknowledgement'::public.lesson_completion_mode then
      p_event_type = 'reading_acknowledgement'::public.lesson_progress_event_type
    when 'any_activity'::public.lesson_completion_mode then
      p_position_seconds > 0
      or p_event_type in (
        'ended'::public.lesson_progress_event_type,
        'manual_complete'::public.lesson_progress_event_type,
        'reading_acknowledgement'::public.lesson_progress_event_type
      )
    else false
  end;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_lesson_id::text, 0)
  );

  select * into v_existing_event
  from public.lesson_progress_events
  where id = p_event_id;
  if found then
    if v_existing_event.user_id <> v_user_id
       or v_existing_event.aula_id <> p_lesson_id
       or v_existing_event.client_instance_id <> p_client_instance_id then
      raise exception 'PROGRESS_EVENT_ID_CONFLICT' using errcode = '23505';
    end if;

    select * into v_progress
    from public.progresso_aulas
    where user_id = v_user_id and aula_id = p_lesson_id;
    if not found then
      raise exception 'PROGRESS_EVENT_WITHOUT_AGGREGATE' using errcode = 'XX000';
    end if;
    return v_progress;
  end if;

  select * into v_stream
  from public.lesson_progress_streams
  where user_id = v_user_id
    and aula_id = p_lesson_id
    and client_instance_id = p_client_instance_id
  for update;
  v_stream_found := found;

  select * into v_progress
  from public.progresso_aulas
  where user_id = v_user_id and aula_id = p_lesson_id
  for update;
  v_progress_found := found;

  if v_stream_found and p_event_sequence <= v_stream.last_event_sequence then
    if not v_progress_found then
      raise exception 'PROGRESS_STREAM_WITHOUT_AGGREGATE' using errcode = 'XX000';
    end if;

    insert into public.lesson_progress_events (
      id,
      user_id,
      aula_id,
      client_instance_id,
      auth_session_id,
      event_sequence,
      event_type,
      position_seconds,
      duration_seconds,
      calculated_progress_percent,
      resulting_completed,
      accepted,
      ignored_reason,
      resulting_revision,
      observed_at
    ) values (
      p_event_id,
      v_user_id,
      p_lesson_id,
      p_client_instance_id,
      v_session_id,
      p_event_sequence,
      p_event_type,
      p_position_seconds,
      p_duration_seconds,
      v_calculated_percent,
      v_progress.completada,
      false,
      'STALE_SEQUENCE',
      v_progress.revision,
      p_observed_at
    );
    return v_progress;
  end if;

  if v_progress_found then
    v_result_position := greatest(v_progress.tempo_assistido, p_position_seconds);
    v_result_percent := greatest(v_progress.progresso_percentual, v_calculated_percent);
    v_result_completed := v_progress.completada or v_event_completes;
    if v_result_completed then
      v_result_percent := 100;
    end if;

    update public.progresso_aulas set
      completada = v_result_completed,
      progresso_percentual = v_result_percent,
      tempo_assistido = v_result_position,
      ultima_visualizacao = v_now,
      revision = revision + 1,
      last_event_id = p_event_id,
      last_event_received_at = v_now,
      last_client_instance_id = p_client_instance_id
    where id = v_progress.id
    returning * into v_progress;
  else
    v_result_position := p_position_seconds;
    v_result_completed := v_event_completes;
    v_result_percent := case when v_result_completed then 100 else v_calculated_percent end;

    insert into public.progresso_aulas (
      user_id,
      aula_id,
      completada,
      progresso_percentual,
      tempo_assistido,
      ultima_visualizacao,
      revision,
      last_event_id,
      last_event_received_at,
      last_client_instance_id
    ) values (
      v_user_id,
      p_lesson_id,
      v_result_completed,
      v_result_percent,
      v_result_position,
      v_now,
      1,
      p_event_id,
      v_now,
      p_client_instance_id
    )
    returning * into v_progress;
  end if;

  insert into public.lesson_progress_streams (
    user_id,
    aula_id,
    client_instance_id,
    auth_session_id,
    last_event_sequence,
    last_event_id,
    last_position_seconds,
    created_at,
    updated_at
  ) values (
    v_user_id,
    p_lesson_id,
    p_client_instance_id,
    v_session_id,
    p_event_sequence,
    p_event_id,
    p_position_seconds,
    v_now,
    v_now
  )
  on conflict (user_id, aula_id, client_instance_id) do update set
    auth_session_id = excluded.auth_session_id,
    last_event_sequence = excluded.last_event_sequence,
    last_event_id = excluded.last_event_id,
    last_position_seconds = greatest(
      public.lesson_progress_streams.last_position_seconds,
      excluded.last_position_seconds
    ),
    updated_at = excluded.updated_at;

  insert into public.lesson_progress_events (
    id,
    user_id,
    aula_id,
    client_instance_id,
    auth_session_id,
    event_sequence,
    event_type,
    position_seconds,
    duration_seconds,
    calculated_progress_percent,
    resulting_completed,
    accepted,
    ignored_reason,
    resulting_revision,
    observed_at
  ) values (
    p_event_id,
    v_user_id,
    p_lesson_id,
    p_client_instance_id,
    v_session_id,
    p_event_sequence,
    p_event_type,
    p_position_seconds,
    p_duration_seconds,
    v_calculated_percent,
    v_progress.completada,
    true,
    null,
    v_progress.revision,
    p_observed_at
  );

  return v_progress;
end;
$$;

create function public.save_lesson_progress_event(
  p_lesson_id uuid,
  p_event_id uuid,
  p_client_instance_id uuid,
  p_event_sequence bigint,
  p_event_type public.lesson_progress_event_type,
  p_position_seconds integer,
  p_duration_seconds integer,
  p_observed_at timestamptz
)
returns public.progresso_aulas
language sql
security invoker
set search_path = ''
as $$
  select private.save_lesson_progress_event(
    p_lesson_id,
    p_event_id,
    p_client_instance_id,
    p_event_sequence,
    p_event_type,
    p_position_seconds,
    p_duration_seconds,
    p_observed_at
  )
$$;

revoke all on function private.save_lesson_progress_event(
  uuid, uuid, uuid, bigint, public.lesson_progress_event_type, integer, integer, timestamptz
) from public, anon;
grant execute on function private.save_lesson_progress_event(
  uuid, uuid, uuid, bigint, public.lesson_progress_event_type, integer, integer, timestamptz
) to authenticated;

revoke all on function public.save_lesson_progress_event(
  uuid, uuid, uuid, bigint, public.lesson_progress_event_type, integer, integer, timestamptz
) from public, anon;
grant execute on function public.save_lesson_progress_event(
  uuid, uuid, uuid, bigint, public.lesson_progress_event_type, integer, integer, timestamptz
) to authenticated;
