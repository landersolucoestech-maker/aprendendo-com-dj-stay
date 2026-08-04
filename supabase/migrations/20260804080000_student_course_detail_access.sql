-- FASE B113: acesso direcionado ao curso do aluno, validado pelo relógio do banco.

create or replace function public.get_student_course_detail_access(
  p_course_id uuid
)
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

  if p_course_id is null then
    raise exception 'COURSE_ID_REQUIRED' using errcode = '22023';
  end if;

  return (
    select to_jsonb(detail_record)
    from (
      select
        enrollment_record.id,
        enrollment_record.user_id,
        enrollment_record.course_id,
        enrollment_record.status,
        enrollment_record.source,
        enrollment_record.source_reference,
        enrollment_record.payment_confirmed_at,
        enrollment_record.starts_at,
        enrollment_record.expires_at,
        enrollment_record.status_reason,
        jsonb_build_object(
          'id', course_record.id,
          'title', course_record.title,
          'slug', course_record.slug,
          'status', course_record.status
        ) as courses
      from public.enrollments enrollment_record
      join public.courses course_record
        on course_record.id = enrollment_record.course_id
      where enrollment_record.user_id = v_user_id
        and enrollment_record.course_id = p_course_id
        and enrollment_record.status = 'active'::public.enrollment_status
        and course_record.status = 'published'::public.course_status
        and enrollment_record.starts_at <= current_timestamp
        and (
          enrollment_record.expires_at is null
          or enrollment_record.expires_at > current_timestamp
        )
      limit 1
    ) detail_record
  );
end;
$$;

revoke all on function public.get_student_course_detail_access(uuid)
  from public, anon, authenticated;
grant execute on function public.get_student_course_detail_access(uuid)
  to authenticated;
