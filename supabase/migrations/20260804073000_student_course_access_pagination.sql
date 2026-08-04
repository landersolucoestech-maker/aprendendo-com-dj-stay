-- FASE B112: resumo ativo e histórico paginado de matrículas do aluno.

create or replace function public.get_student_course_access(
  p_limit integer default 20,
  p_offset integer default 0,
  p_active_limit integer default 3
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit integer := least(100, greatest(1, coalesce(p_limit, 20)));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_active_limit integer := least(10, greatest(1, coalesce(p_active_limit, 3)));
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total', (
      select count(*)::integer
      from public.enrollments enrollment_record
      where enrollment_record.user_id = v_user_id
    ),
    'active_total', (
      select count(*)::integer
      from public.enrollments enrollment_record
      join public.courses course_record
        on course_record.id = enrollment_record.course_id
      where enrollment_record.user_id = v_user_id
        and enrollment_record.status = 'active'::public.enrollment_status
        and course_record.status = 'published'::public.course_status
        and enrollment_record.starts_at <= current_timestamp
        and (
          enrollment_record.expires_at is null
          or enrollment_record.expires_at > current_timestamp
        )
    ),
    'active_enrollments', coalesce((
      select jsonb_agg(to_jsonb(active_record) order by active_record.starts_at desc, active_record.id desc)
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
          and enrollment_record.status = 'active'::public.enrollment_status
          and course_record.status = 'published'::public.course_status
          and enrollment_record.starts_at <= current_timestamp
          and (
            enrollment_record.expires_at is null
            or enrollment_record.expires_at > current_timestamp
          )
        order by enrollment_record.starts_at desc, enrollment_record.id desc
        limit v_active_limit
      ) active_record
    ), '[]'::jsonb),
    'enrollments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'enrollment', to_jsonb(page_record) - 'created_at' - 'access_active',
          'access_active', page_record.access_active
        )
        order by page_record.created_at desc, page_record.id desc
      )
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
          enrollment_record.created_at,
          (
            enrollment_record.status = 'active'::public.enrollment_status
            and course_record.status = 'published'::public.course_status
            and enrollment_record.starts_at <= current_timestamp
            and (
              enrollment_record.expires_at is null
              or enrollment_record.expires_at > current_timestamp
            )
          ) as access_active,
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
        order by enrollment_record.created_at desc, enrollment_record.id desc
        limit v_limit offset v_offset
      ) page_record
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_student_course_access(integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_student_course_access(integer, integer, integer)
  to authenticated;
