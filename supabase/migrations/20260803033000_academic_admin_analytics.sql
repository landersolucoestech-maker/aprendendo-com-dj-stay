-- FASE B97: analytics acadêmicos por coorte de matrícula para o proprietário.

create or replace function private.get_academic_admin_analytics(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_course_id uuid default null,
  p_inactive_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_end_at timestamptz := coalesce(p_end_at, statement_timestamp());
  v_start_at timestamptz := coalesce(p_start_at, v_end_at - interval '30 days');
  v_inactive_days integer := coalesce(p_inactive_days, 30);
  v_inactive_cutoff timestamptz;
  v_result jsonb;
begin
  if auth.uid() is null
     or private.current_user_role() <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_start_at >= v_end_at then
    raise exception 'ACADEMIC_ANALYTICS_PERIOD_INVALID' using errcode = '22023';
  end if;

  if v_end_at - v_start_at > interval '366 days' then
    raise exception 'ACADEMIC_ANALYTICS_PERIOD_TOO_LARGE' using errcode = '22023';
  end if;

  if v_inactive_days not between 7 and 180 then
    raise exception 'ACADEMIC_ANALYTICS_INACTIVITY_INVALID' using errcode = '22023';
  end if;

  v_inactive_cutoff := statement_timestamp() - pg_catalog.make_interval(days => v_inactive_days);

  with cohort as materialized (
    select
      enrollment.id,
      enrollment.user_id,
      enrollment.course_id,
      enrollment.status,
      enrollment.starts_at,
      course.title as course_title
    from public.enrollments as enrollment
    join public.courses as course on course.id = enrollment.course_id
    where enrollment.starts_at >= v_start_at
      and enrollment.starts_at < v_end_at
      and course.deleted_at is null
      and (p_course_id is null or enrollment.course_id = p_course_id)
  ), published_lessons as materialized (
    select
      module_record.course_id,
      lesson.id as lesson_id
    from public.modulos as module_record
    join public.aulas as lesson on lesson.modulo_id = module_record.id
    where module_record.status = 'published'::public.curriculum_item_status
      and module_record.deleted_at is null
      and lesson.status = 'published'::public.curriculum_item_status
      and lesson.deleted_at is null
      and (p_course_id is null or module_record.course_id = p_course_id)
  ), enrollment_progress as materialized (
    select
      cohort.id as enrollment_id,
      count(published_lesson.lesson_id)::integer as total_lessons,
      count(published_lesson.lesson_id) filter (
        where progress.completada = true
      )::integer as completed_lessons,
      max(progress.ultima_visualizacao) as last_activity_at
    from cohort
    left join published_lessons as published_lesson
      on published_lesson.course_id = cohort.course_id
    left join public.progresso_aulas as progress
      on progress.aula_id = published_lesson.lesson_id
     and progress.user_id = cohort.user_id
    group by cohort.id
  ), enriched as materialized (
    select
      cohort.*,
      coalesce(enrollment_progress.total_lessons, 0) as total_lessons,
      coalesce(enrollment_progress.completed_lessons, 0) as completed_lessons,
      case
        when coalesce(enrollment_progress.total_lessons, 0) = 0 then 0
        else least(
          100,
          round(
            enrollment_progress.completed_lessons::numeric
            / enrollment_progress.total_lessons::numeric
            * 100
          )::integer
        )
      end as completion_percent,
      enrollment_progress.last_activity_at,
      (
        cohort.status = 'active'::public.enrollment_status
        and coalesce(enrollment_progress.total_lessons, 0) > 0
        and coalesce(enrollment_progress.completed_lessons, 0)
          = coalesce(enrollment_progress.total_lessons, 0)
      ) as completed_all_published_lessons,
      (
        cohort.status = 'active'::public.enrollment_status
        and cohort.starts_at <= v_inactive_cutoff
        and coalesce(enrollment_progress.last_activity_at, cohort.starts_at) < v_inactive_cutoff
        and not (
          coalesce(enrollment_progress.total_lessons, 0) > 0
          and coalesce(enrollment_progress.completed_lessons, 0)
            = coalesce(enrollment_progress.total_lessons, 0)
        )
      ) as active_without_recent_activity,
      exists (
        select 1
        from public.certificates as certificate
        where certificate.enrollment_id = cohort.id
          and certificate.status = 'issued'::public.certificate_status
      ) as has_valid_certificate
    from cohort
    left join enrollment_progress on enrollment_progress.enrollment_id = cohort.id
  ), summary as (
    select
      count(*)::integer as enrollments_started,
      count(distinct user_id)::integer as unique_students,
      count(*) filter (where status = 'pending'::public.enrollment_status)::integer as pending_enrollments,
      count(*) filter (where status = 'active'::public.enrollment_status)::integer as active_enrollments,
      count(*) filter (where status = 'suspended'::public.enrollment_status)::integer as suspended_enrollments,
      count(*) filter (where status = 'revoked'::public.enrollment_status)::integer as revoked_enrollments,
      count(*) filter (where completed_all_published_lessons)::integer as completed_all_lessons,
      count(*) filter (where active_without_recent_activity)::integer as active_without_recent_activity,
      count(*) filter (where has_valid_certificate)::integer as valid_certificates,
      coalesce(round(avg(completion_percent)), 0)::integer as average_completion_percent
    from enriched
  ), course_summary as (
    select
      course_id,
      course_title,
      count(*)::integer as enrollments_started,
      count(distinct user_id)::integer as unique_students,
      count(*) filter (where status = 'active'::public.enrollment_status)::integer as active_enrollments,
      count(*) filter (where completed_all_published_lessons)::integer as completed_all_lessons,
      count(*) filter (where active_without_recent_activity)::integer as active_without_recent_activity,
      count(*) filter (where has_valid_certificate)::integer as valid_certificates,
      coalesce(round(avg(completion_percent)), 0)::integer as average_completion_percent
    from enriched
    group by course_id, course_title
  ), progress_buckets as (
    select * from (values
      ('not_started'::text, 0, 0),
      ('started_1_24'::text, 1, 24),
      ('progress_25_49'::text, 25, 49),
      ('progress_50_74'::text, 50, 74),
      ('progress_75_99'::text, 75, 99),
      ('completed_100'::text, 100, 100)
    ) as bucket(bucket, minimum_percent, maximum_percent)
  ), progress_distribution as (
    select
      progress_bucket.bucket,
      count(enriched.id)::integer as enrollment_count
    from progress_buckets as progress_bucket
    left join enriched
      on enriched.completion_percent between progress_bucket.minimum_percent
      and progress_bucket.maximum_percent
    group by progress_bucket.bucket, progress_bucket.minimum_percent
    order by progress_bucket.minimum_percent
  ), local_days as (
    select generate_series(
      (v_start_at at time zone 'America/Sao_Paulo')::date,
      ((v_end_at - interval '1 microsecond') at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as day
  ), daily_summary as (
    select
      local_day.day,
      count(enriched.id)::integer as enrollments_started,
      count(distinct enriched.user_id)::integer as unique_students
    from local_days as local_day
    left join enriched
      on (enriched.starts_at at time zone 'America/Sao_Paulo')::date = local_day.day
    group by local_day.day
  )
  select jsonb_build_object(
    'period', jsonb_build_object(
      'start_at', v_start_at,
      'end_at', v_end_at,
      'time_zone', 'America/Sao_Paulo',
      'course_id', p_course_id,
      'inactive_days', v_inactive_days
    ),
    'summary', jsonb_build_object(
      'enrollments_started', summary.enrollments_started,
      'unique_students', summary.unique_students,
      'pending_enrollments', summary.pending_enrollments,
      'active_enrollments', summary.active_enrollments,
      'suspended_enrollments', summary.suspended_enrollments,
      'revoked_enrollments', summary.revoked_enrollments,
      'completed_all_lessons', summary.completed_all_lessons,
      'active_without_recent_activity', summary.active_without_recent_activity,
      'valid_certificates', summary.valid_certificates,
      'average_completion_percent', summary.average_completion_percent
    ),
    'course_breakdown', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'course_id', course_row.course_id,
            'course_title', course_row.course_title,
            'enrollments_started', course_row.enrollments_started,
            'unique_students', course_row.unique_students,
            'active_enrollments', course_row.active_enrollments,
            'completed_all_lessons', course_row.completed_all_lessons,
            'active_without_recent_activity', course_row.active_without_recent_activity,
            'valid_certificates', course_row.valid_certificates,
            'average_completion_percent', course_row.average_completion_percent
          ) order by course_row.enrollments_started desc, course_row.course_title
        ),
        '[]'::jsonb
      ) from course_summary as course_row
    ),
    'progress_distribution', (
      select jsonb_agg(
        jsonb_build_object(
          'bucket', distribution_row.bucket,
          'enrollment_count', distribution_row.enrollment_count
        ) order by distribution_row.minimum_percent
      )
      from (
        select
          progress_distribution.*,
          case progress_distribution.bucket
            when 'not_started' then 0
            when 'started_1_24' then 1
            when 'progress_25_49' then 25
            when 'progress_50_74' then 50
            when 'progress_75_99' then 75
            else 100
          end as minimum_percent
        from progress_distribution
      ) as distribution_row
    ),
    'daily', (
      select jsonb_agg(
        jsonb_build_object(
          'day', to_char(daily_row.day, 'YYYY-MM-DD'),
          'enrollments_started', daily_row.enrollments_started,
          'unique_students', daily_row.unique_students
        ) order by daily_row.day
      )
      from daily_summary as daily_row
    )
  ) into v_result
  from summary;

  return v_result;
end;
$$;

revoke all on function private.get_academic_admin_analytics(timestamptz, timestamptz, uuid, integer)
  from public, anon;
grant execute on function private.get_academic_admin_analytics(timestamptz, timestamptz, uuid, integer)
  to authenticated, service_role;

create or replace function public.get_academic_admin_analytics(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_course_id uuid default null,
  p_inactive_days integer default 30
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_academic_admin_analytics(
    p_start_at,
    p_end_at,
    p_course_id,
    p_inactive_days
  )
$$;

revoke all on function public.get_academic_admin_analytics(timestamptz, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.get_academic_admin_analytics(timestamptz, timestamptz, uuid, integer)
  to authenticated;
