-- FASE B15: authenticated invoker wrapper for ordered lesson progress.

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
