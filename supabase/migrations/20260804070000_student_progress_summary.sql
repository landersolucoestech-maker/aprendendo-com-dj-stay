-- FASE B111: resumo acadêmico agregado do aluno sem transferir todas as linhas de progresso.

create or replace function public.get_student_progress_summary()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'started_lessons', count(*)::integer,
      'completed_lessons', count(*) filter (where progress_record.completada)::integer,
      'average_progress_percent', coalesce(
        round(avg(progress_record.progresso_percentual)),
        0
      )::integer
    )
    from public.progresso_aulas progress_record
    where progress_record.user_id = v_user_id
  );
end;
$$;

revoke all on function public.get_student_progress_summary()
  from public, anon, authenticated;
grant execute on function public.get_student_progress_summary()
  to authenticated;
