-- FASE B101: paginação independente e filtro coerente no read model acadêmico.

-- A assinatura anterior paginava somente alunos e serializava todas as matrículas
-- e todos os certificados. Removemos os dois overloads antigos antes de criar a
-- nova fronteira explícita.
drop function if exists public.get_students_admin_dashboard(text, integer, integer);
drop function if exists private.get_students_admin_dashboard(text, integer, integer);

create function private.get_students_admin_dashboard(
  p_search text default null,
  p_student_limit integer default 25,
  p_student_offset integer default 0,
  p_enrollment_limit integer default 25,
  p_enrollment_offset integer default 0,
  p_certificate_limit integer default 25,
  p_certificate_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_student_limit integer := greatest(1, least(coalesce(p_student_limit, 25), 100));
  v_student_offset integer := greatest(coalesce(p_student_offset, 0), 0);
  v_enrollment_limit integer := greatest(1, least(coalesce(p_enrollment_limit, 25), 100));
  v_enrollment_offset integer := greatest(coalesce(p_enrollment_offset, 0), 0);
  v_certificate_limit integer := greatest(1, least(coalesce(p_certificate_limit, 25), 100));
  v_certificate_offset integer := greatest(coalesce(p_certificate_offset, 0), 0);
begin
  if auth.uid() is null
    or private.current_user_role() <> 'administrador_proprietario'::public.app_role
  then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'totals', jsonb_build_object(
      'students', (
        select count(*)
        from auth.users user_record
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(
                user_record.raw_user_meta_data ->> 'full_name',
                user_record.raw_user_meta_data ->> 'name',
                ''
              ) ilike '%' || v_search || '%'
      ),
      'enrollments', (
        select count(*)
        from public.enrollments enrollment_record
        join auth.users user_record on user_record.id = enrollment_record.user_id
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(
                user_record.raw_user_meta_data ->> 'full_name',
                user_record.raw_user_meta_data ->> 'name',
                ''
              ) ilike '%' || v_search || '%'
      ),
      'certificates', (
        select count(*)
        from public.certificates certificate_record
        join auth.users user_record on user_record.id = certificate_record.user_id
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(
                user_record.raw_user_meta_data ->> 'full_name',
                user_record.raw_user_meta_data ->> 'name',
                ''
              ) ilike '%' || v_search || '%'
      ),
      'valid_certificates', (
        select count(*)
        from public.certificates certificate_record
        join auth.users user_record on user_record.id = certificate_record.user_id
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where certificate_record.status = 'issued'::public.certificate_status
          and (
            v_search is null
            or user_record.email ilike '%' || v_search || '%'
            or coalesce(
                 user_record.raw_user_meta_data ->> 'full_name',
                 user_record.raw_user_meta_data ->> 'name',
                 ''
               ) ilike '%' || v_search || '%'
          )
      )
    ),
    'students', coalesce((
      select jsonb_agg(
        student_row.payload
        order by student_row.created_at desc, student_row.user_id desc
      )
      from (
        select
          user_record.id as user_id,
          user_record.created_at,
          jsonb_build_object(
            'user_id', user_record.id,
            'email', user_record.email,
            'name', coalesce(
              nullif(btrim(user_record.raw_user_meta_data ->> 'full_name'), ''),
              nullif(btrim(user_record.raw_user_meta_data ->> 'name'), ''),
              split_part(user_record.email, '@', 1)
            ),
            'created_at', user_record.created_at,
            'enrollment_count', (
              select count(*)
              from public.enrollments enrollment_record
              where enrollment_record.user_id = user_record.id
            ),
            'certificate_count', (
              select count(*)
              from public.certificates certificate_record
              where certificate_record.user_id = user_record.id
                and certificate_record.status = 'issued'::public.certificate_status
            )
          ) as payload
        from auth.users user_record
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(
                user_record.raw_user_meta_data ->> 'full_name',
                user_record.raw_user_meta_data ->> 'name',
                ''
              ) ilike '%' || v_search || '%'
        order by user_record.created_at desc, user_record.id desc
        limit v_student_limit offset v_student_offset
      ) student_row
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', course_record.id,
        'title', course_record.title,
        'status', course_record.status,
        'certificate_enabled', course_record.certificate_enabled,
        'certificate_min_completion_percent', course_record.certificate_min_completion_percent
      ) order by course_record.title, course_record.id)
      from public.courses course_record
      where course_record.deleted_at is null
    ), '[]'::jsonb),
    'enrollments', coalesce((
      select jsonb_agg(
        enrollment_row.payload
        order by enrollment_row.created_at desc, enrollment_row.id desc
      )
      from (
        select
          enrollment_record.id,
          enrollment_record.created_at,
          jsonb_build_object(
            'id', enrollment_record.id,
            'user_id', enrollment_record.user_id,
            'course_id', enrollment_record.course_id,
            'course_title', course_record.title,
            'status', enrollment_record.status,
            'source', enrollment_record.source,
            'starts_at', enrollment_record.starts_at,
            'expires_at', enrollment_record.expires_at,
            'status_reason', enrollment_record.status_reason,
            'completion', private.calculate_enrollment_completion(enrollment_record.id),
            'active_certificate_id', certificate_record.id,
            'active_certificate_code', certificate_record.code
          ) as payload
        from public.enrollments enrollment_record
        join public.courses course_record on course_record.id = enrollment_record.course_id
        join auth.users user_record on user_record.id = enrollment_record.user_id
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        left join public.certificates certificate_record
          on certificate_record.enrollment_id = enrollment_record.id
         and certificate_record.status = 'issued'::public.certificate_status
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(
                user_record.raw_user_meta_data ->> 'full_name',
                user_record.raw_user_meta_data ->> 'name',
                ''
              ) ilike '%' || v_search || '%'
        order by enrollment_record.created_at desc, enrollment_record.id desc
        limit v_enrollment_limit offset v_enrollment_offset
      ) enrollment_row
    ), '[]'::jsonb),
    'certificates', coalesce((
      select jsonb_agg(
        certificate_row.payload
        order by certificate_row.issued_at desc, certificate_row.id desc
      )
      from (
        select
          certificate_record.id,
          certificate_record.issued_at,
          jsonb_build_object(
            'id', certificate_record.id,
            'code', certificate_record.code,
            'enrollment_id', certificate_record.enrollment_id,
            'user_id', certificate_record.user_id,
            'course_id', certificate_record.course_id,
            'student_name', certificate_record.student_name_snapshot,
            'course_title', certificate_record.course_title_snapshot,
            'completion_percent', certificate_record.completion_percent_snapshot,
            'status', certificate_record.status,
            'issued_at', certificate_record.issued_at,
            'revoked_at', certificate_record.revoked_at,
            'revocation_reason', certificate_record.revocation_reason
          ) as payload
        from public.certificates certificate_record
        join auth.users user_record on user_record.id = certificate_record.user_id
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(
                user_record.raw_user_meta_data ->> 'full_name',
                user_record.raw_user_meta_data ->> 'name',
                ''
              ) ilike '%' || v_search || '%'
        order by certificate_record.issued_at desc, certificate_record.id desc
        limit v_certificate_limit offset v_certificate_offset
      ) certificate_row
    ), '[]'::jsonb)
  );
end;
$$;

create function public.get_students_admin_dashboard(
  p_search text default null,
  p_student_limit integer default 25,
  p_student_offset integer default 0,
  p_enrollment_limit integer default 25,
  p_enrollment_offset integer default 0,
  p_certificate_limit integer default 25,
  p_certificate_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_students_admin_dashboard(
    p_search,
    p_student_limit,
    p_student_offset,
    p_enrollment_limit,
    p_enrollment_offset,
    p_certificate_limit,
    p_certificate_offset
  )
$$;

revoke all on function private.get_students_admin_dashboard(
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function private.get_students_admin_dashboard(
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) to authenticated;

revoke all on function public.get_students_admin_dashboard(
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function public.get_students_admin_dashboard(
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
) to authenticated;
