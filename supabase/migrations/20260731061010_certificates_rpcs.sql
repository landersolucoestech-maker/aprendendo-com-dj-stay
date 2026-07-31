-- FASE B21: emissão, revogação, administração e validação pública.

create function private.calculate_enrollment_completion(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_course public.courses%rowtype;
  v_total integer;
  v_completed integer;
  v_percent smallint;
begin
  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id;

  if not found then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_course
  from public.courses
  where id = v_enrollment.course_id;

  select count(*)::integer
  into v_total
  from public.aulas lesson
  join public.modulos module_record on module_record.id = lesson.modulo_id
  where module_record.course_id = v_enrollment.course_id
    and module_record.status = 'published'::public.curriculum_item_status
    and module_record.deleted_at is null
    and lesson.status = 'published'::public.curriculum_item_status
    and lesson.deleted_at is null;

  select count(*)::integer
  into v_completed
  from public.aulas lesson
  join public.modulos module_record on module_record.id = lesson.modulo_id
  join public.progresso_aulas progress
    on progress.aula_id = lesson.id
   and progress.user_id = v_enrollment.user_id
   and progress.completada = true
  where module_record.course_id = v_enrollment.course_id
    and module_record.status = 'published'::public.curriculum_item_status
    and module_record.deleted_at is null
    and lesson.status = 'published'::public.curriculum_item_status
    and lesson.deleted_at is null;

  v_percent := case
    when v_total = 0 then 0
    else least(100, round((v_completed::numeric / v_total::numeric) * 100)::integer)::smallint
  end;

  return jsonb_build_object(
    'enrollment_id', v_enrollment.id,
    'user_id', v_enrollment.user_id,
    'course_id', v_enrollment.course_id,
    'enrollment_status', v_enrollment.status,
    'course_title', v_course.title,
    'certificate_enabled', v_course.certificate_enabled,
    'completion_mode', v_course.completion_mode,
    'minimum_percent', v_course.certificate_min_completion_percent,
    'total_lessons', v_total,
    'completed_lessons', v_completed,
    'completion_percent', v_percent,
    'eligible', (
      v_enrollment.status = 'active'::public.enrollment_status
      and v_course.certificate_enabled
      and (
        v_course.completion_mode = 'manual'::public.course_completion_mode
        or v_percent >= v_course.certificate_min_completion_percent
      )
    )
  );
end;
$$;

create function private.issue_enrollment_certificate(p_enrollment_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_enrollment public.enrollments%rowtype;
  v_course public.courses%rowtype;
  v_user auth.users%rowtype;
  v_completion jsonb;
  v_student_name text;
  v_code text;
  v_certificate public.certificates%rowtype;
  v_attempt integer;
begin
  if v_actor is null or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.certificates
    where enrollment_id = p_enrollment_id
      and status = 'issued'::public.certificate_status
  ) then
    raise exception 'CERTIFICATE_ALREADY_ISSUED' using errcode = '23505';
  end if;

  select * into v_course from public.courses where id = v_enrollment.course_id;
  select * into v_user from auth.users where id = v_enrollment.user_id;
  v_completion := private.calculate_enrollment_completion(p_enrollment_id);

  if coalesce((v_completion ->> 'eligible')::boolean, false) is false then
    raise exception 'CERTIFICATE_REQUIREMENTS_NOT_MET' using errcode = 'P0001';
  end if;

  v_student_name := nullif(btrim(coalesce(
    v_user.raw_user_meta_data ->> 'full_name',
    v_user.raw_user_meta_data ->> 'name',
    split_part(v_user.email, '@', 1)
  )), '');

  if v_student_name is null or char_length(v_student_name) < 2 then
    raise exception 'STUDENT_NAME_REQUIRED' using errcode = 'P0001';
  end if;

  for v_attempt in 1..10 loop
    v_code := 'DJSTAY-' || upper(substr(encode(extensions.gen_random_bytes(10), 'hex'), 1, 20));
    exit when not exists (select 1 from public.certificates where code = v_code);
  end loop;

  if exists (select 1 from public.certificates where code = v_code) then
    raise exception 'CERTIFICATE_CODE_GENERATION_FAILED' using errcode = 'P0001';
  end if;

  insert into public.certificates (
    code,
    enrollment_id,
    user_id,
    course_id,
    student_name_snapshot,
    course_title_snapshot,
    completion_percent_snapshot,
    issued_by_user_id,
    metadata
  ) values (
    v_code,
    v_enrollment.id,
    v_enrollment.user_id,
    v_enrollment.course_id,
    v_student_name,
    v_course.title,
    (v_completion ->> 'completion_percent')::smallint,
    v_actor,
    jsonb_build_object(
      'total_lessons', (v_completion ->> 'total_lessons')::integer,
      'completed_lessons', (v_completion ->> 'completed_lessons')::integer,
      'minimum_percent', (v_completion ->> 'minimum_percent')::integer,
      'completion_mode', v_completion ->> 'completion_mode'
    )
  )
  returning * into v_certificate;

  insert into public.certificate_events (
    certificate_id,
    event_type,
    actor_user_id,
    details
  ) values (
    v_certificate.id,
    'issued'::public.certificate_event_type,
    v_actor,
    jsonb_build_object(
      'code', v_certificate.code,
      'completion_percent', v_certificate.completion_percent_snapshot
    )
  );

  return v_certificate;
end;
$$;

create function private.revoke_enrollment_certificate(
  p_certificate_id uuid,
  p_reason text
)
returns public.certificates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_certificate public.certificates%rowtype;
  v_reason text := btrim(p_reason);
begin
  if v_actor is null or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_reason is null or char_length(v_reason) not between 3 and 1000 then
    raise exception 'REVOCATION_REASON_INVALID' using errcode = '22023';
  end if;

  select * into v_certificate
  from public.certificates
  where id = p_certificate_id
  for update;

  if not found then
    raise exception 'CERTIFICATE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_certificate.status = 'revoked'::public.certificate_status then
    return v_certificate;
  end if;

  update public.certificates
  set status = 'revoked'::public.certificate_status,
      revoked_at = now(),
      revoked_by_user_id = v_actor,
      revocation_reason = v_reason
  where id = p_certificate_id
  returning * into v_certificate;

  insert into public.certificate_events (
    certificate_id,
    event_type,
    actor_user_id,
    details
  ) values (
    v_certificate.id,
    'revoked'::public.certificate_event_type,
    v_actor,
    jsonb_build_object('reason', v_reason)
  );

  return v_certificate;
end;
$$;

create function private.get_my_certificates()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', certificate_record.id,
    'code', certificate_record.code,
    'status', certificate_record.status,
    'student_name', certificate_record.student_name_snapshot,
    'course_title', certificate_record.course_title_snapshot,
    'completion_percent', certificate_record.completion_percent_snapshot,
    'issued_at', certificate_record.issued_at,
    'revoked_at', certificate_record.revoked_at,
    'revocation_reason', certificate_record.revocation_reason
  ) order by certificate_record.issued_at desc), '[]'::jsonb)
  from public.certificates certificate_record
  where certificate_record.user_id = auth.uid()
$$;

create function private.validate_certificate_code(p_code text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'valid', certificate_record.status = 'issued'::public.certificate_status,
      'code', certificate_record.code,
      'status', certificate_record.status,
      'student_name', certificate_record.student_name_snapshot,
      'course_title', certificate_record.course_title_snapshot,
      'completion_percent', certificate_record.completion_percent_snapshot,
      'issued_at', certificate_record.issued_at,
      'revoked_at', certificate_record.revoked_at,
      'revocation_reason', certificate_record.revocation_reason
    )
    from public.certificates certificate_record
    where certificate_record.code = upper(btrim(p_code))
  ), jsonb_build_object('found', false, 'valid', false))
$$;

create function private.get_students_admin_dashboard(
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'students', coalesce((
      select jsonb_agg(student_record order by student_record ->> 'name')
      from (
        select jsonb_build_object(
          'user_id', user_record.id,
          'email', user_record.email,
          'name', coalesce(
            nullif(btrim(user_record.raw_user_meta_data ->> 'full_name'), ''),
            nullif(btrim(user_record.raw_user_meta_data ->> 'name'), ''),
            split_part(user_record.email, '@', 1)
          ),
          'created_at', user_record.created_at,
          'enrollment_count', (select count(*) from public.enrollments enrollment_record where enrollment_record.user_id = user_record.id),
          'certificate_count', (select count(*) from public.certificates certificate_record where certificate_record.user_id = user_record.id and certificate_record.status = 'issued'::public.certificate_status)
        ) as student_record
        from auth.users user_record
        join public.user_roles role_record
          on role_record.user_id = user_record.id
         and role_record.role = 'aluno'::public.app_role
        where v_search is null
           or user_record.email ilike '%' || v_search || '%'
           or coalesce(user_record.raw_user_meta_data ->> 'full_name', user_record.raw_user_meta_data ->> 'name', '') ilike '%' || v_search || '%'
        order by user_record.created_at desc
        limit v_limit offset v_offset
      ) student_rows
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', course_record.id,
        'title', course_record.title,
        'status', course_record.status,
        'certificate_enabled', course_record.certificate_enabled,
        'certificate_min_completion_percent', course_record.certificate_min_completion_percent
      ) order by course_record.title)
      from public.courses course_record
      where course_record.deleted_at is null
    ), '[]'::jsonb),
    'enrollments', coalesce((
      select jsonb_agg(jsonb_build_object(
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
      ) order by enrollment_record.created_at desc)
      from public.enrollments enrollment_record
      join public.courses course_record on course_record.id = enrollment_record.course_id
      left join public.certificates certificate_record
        on certificate_record.enrollment_id = enrollment_record.id
       and certificate_record.status = 'issued'::public.certificate_status
      where exists (
        select 1
        from public.user_roles role_record
        where role_record.user_id = enrollment_record.user_id
          and role_record.role = 'aluno'::public.app_role
      )
    ), '[]'::jsonb),
    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object(
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
      ) order by certificate_record.issued_at desc)
      from public.certificates certificate_record
    ), '[]'::jsonb)
  );
end;
$$;

create function public.issue_enrollment_certificate(p_enrollment_id uuid)
returns public.certificates
language sql
security invoker
set search_path = ''
as $$
  select private.issue_enrollment_certificate(p_enrollment_id)
$$;

create function public.revoke_enrollment_certificate(p_certificate_id uuid, p_reason text)
returns public.certificates
language sql
security invoker
set search_path = ''
as $$
  select private.revoke_enrollment_certificate(p_certificate_id, p_reason)
$$;

create function public.get_my_certificates()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_certificates()
$$;

create function public.validate_certificate(p_code text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.validate_certificate_code(p_code)
$$;

create function public.get_students_admin_dashboard(
  p_search text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_students_admin_dashboard(p_search, p_limit, p_offset)
$$;

revoke all on function private.calculate_enrollment_completion(uuid) from public, anon, authenticated;
revoke all on function private.issue_enrollment_certificate(uuid) from public, anon, authenticated;
revoke all on function private.revoke_enrollment_certificate(uuid, text) from public, anon, authenticated;
revoke all on function private.get_my_certificates() from public, anon, authenticated;
revoke all on function private.validate_certificate_code(text) from public, anon, authenticated;
revoke all on function private.get_students_admin_dashboard(text, integer, integer) from public, anon, authenticated;

grant execute on function private.issue_enrollment_certificate(uuid) to authenticated;
grant execute on function private.revoke_enrollment_certificate(uuid, text) to authenticated;
grant execute on function private.get_my_certificates() to authenticated;
grant execute on function private.validate_certificate_code(text) to anon, authenticated;
grant execute on function private.get_students_admin_dashboard(text, integer, integer) to authenticated;

revoke all on function public.issue_enrollment_certificate(uuid) from public, anon;
revoke all on function public.revoke_enrollment_certificate(uuid, text) from public, anon;
revoke all on function public.get_my_certificates() from public, anon;
revoke all on function public.validate_certificate(text) from public;
revoke all on function public.get_students_admin_dashboard(text, integer, integer) from public, anon;

grant execute on function public.issue_enrollment_certificate(uuid) to authenticated;
grant execute on function public.revoke_enrollment_certificate(uuid, text) to authenticated;
grant execute on function public.get_my_certificates() to authenticated;
grant execute on function public.validate_certificate(text) to anon, authenticated;
grant execute on function public.get_students_admin_dashboard(text, integer, integer) to authenticated;
