-- FASE B13: student attempts, immutable answer keys and server-side grading.

create or replace function private.assert_assessment_student()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'aluno'::public.app_role then
    raise exception 'STUDENT_REQUIRED' using errcode = '42501';
  end if;
  return v_user_id;
end;
$$;

create or replace function private.start_assessment_attempt(p_assessment_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.assert_assessment_student();
  v_assessment public.assessments;
  v_enrollment public.enrollments;
  v_attempt public.assessment_attempts;
  v_attempt_count integer;
  v_attempt_number integer;
  v_question_snapshot jsonb;
  v_answer_key jsonb;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_assessment_id::text || ':' || v_user_id::text, 0)
  );

  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for share;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if not private.assessment_available_to_user(v_user_id, p_assessment_id) then
    raise exception 'ASSESSMENT_NOT_AVAILABLE' using errcode = '42501';
  end if;

  select e.* into v_enrollment
  from public.enrollments e
  where e.user_id = v_user_id
    and e.course_id = v_assessment.course_id
    and e.status = 'active'::public.enrollment_status
    and e.starts_at <= statement_timestamp()
    and (e.expires_at is null or e.expires_at > statement_timestamp())
  order by e.starts_at desc
  limit 1;
  if not found then
    raise exception 'ACTIVE_ENROLLMENT_REQUIRED' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.assessment_attempts
  where assessment_id = p_assessment_id
    and user_id = v_user_id
    and status = 'in_progress'::public.assessment_attempt_status
  for update;

  if found then
    if v_attempt.expires_at is not null
       and v_attempt.expires_at <= statement_timestamp() then
      update public.assessment_attempts set
        status = 'expired'::public.assessment_attempt_status
      where id = v_attempt.id
      returning * into v_attempt;

      perform private.log_assessment_event(
        p_assessment_id,
        'attempt_expired'::public.assessment_event_type,
        v_attempt.assessment_version,
        null,
        v_attempt.id,
        jsonb_build_object('attempt_number', v_attempt.attempt_number)
      );
    else
      return v_attempt;
    end if;
  end if;

  select count(*)::integer, coalesce(max(attempt_number), 0) + 1
  into v_attempt_count, v_attempt_number
  from public.assessment_attempts
  where assessment_id = p_assessment_id
    and user_id = v_user_id;

  if v_attempt_count >= v_assessment.max_attempts then
    raise exception 'ASSESSMENT_ATTEMPT_LIMIT_REACHED' using errcode = '22023';
  end if;

  with ordered_questions as (
    select
      q.*,
      case
        when v_assessment.shuffle_questions then random()
        else q.ordem::double precision
      end as question_sort
    from public.assessment_questions q
    where q.assessment_id = p_assessment_id
      and q.status = 'published'::public.assessment_status
      and q.deleted_at is null
  ), frozen_questions as (
    select
      q.id,
      q.question_type,
      q.prompt,
      q.explanation,
      q.points,
      q.required,
      q.question_sort,
      (
        select jsonb_agg(
          jsonb_build_object(
            'option_id', option_row.id,
            'text', option_row.option_text
          ) order by option_row.option_sort
        )
        from (
          select
            o.id,
            o.option_text,
            case
              when v_assessment.shuffle_options then random()
              else o.ordem::double precision
            end as option_sort
          from public.assessment_options o
          where o.question_id = q.id
        ) option_row
      ) as sanitized_options,
      (
        select coalesce(jsonb_agg(to_jsonb(o.id) order by o.id), '[]'::jsonb)
        from public.assessment_options o
        where o.question_id = q.id and o.is_correct
      ) as correct_option_ids
    from ordered_questions q
  )
  select
    jsonb_agg(
      jsonb_build_object(
        'question_id', id,
        'question_type', question_type,
        'prompt', prompt,
        'points', points,
        'required', required,
        'options', sanitized_options
      ) order by question_sort
    ),
    jsonb_agg(
      jsonb_build_object(
        'question_id', id,
        'question_type', question_type,
        'points', points,
        'required', required,
        'correct_option_ids', correct_option_ids,
        'explanation', explanation
      ) order by question_sort
    )
  into v_question_snapshot, v_answer_key
  from frozen_questions;

  if v_question_snapshot is null or jsonb_array_length(v_question_snapshot) = 0 then
    raise exception 'PUBLISHED_ASSESSMENT_QUESTION_REQUIRED' using errcode = '22023';
  end if;

  insert into public.assessment_attempts(
    assessment_id,
    user_id,
    enrollment_id,
    attempt_number,
    assessment_version,
    question_snapshot,
    passing_score,
    show_correct_answers,
    expires_at
  ) values (
    p_assessment_id,
    v_user_id,
    v_enrollment.id,
    v_attempt_number,
    v_assessment.version,
    v_question_snapshot,
    v_assessment.passing_score,
    v_assessment.show_correct_answers,
    case
      when v_assessment.time_limit_minutes is null then null
      else statement_timestamp() + make_interval(mins => v_assessment.time_limit_minutes)
    end
  ) returning * into v_attempt;

  insert into private.assessment_attempt_keys(attempt_id, answer_key)
  values (v_attempt.id, v_answer_key);

  perform private.log_assessment_event(
    p_assessment_id,
    'attempt_started'::public.assessment_event_type,
    v_attempt.assessment_version,
    null,
    v_attempt.id,
    jsonb_build_object(
      'attempt_number', v_attempt.attempt_number,
      'question_count', jsonb_array_length(v_question_snapshot),
      'expires_at', v_attempt.expires_at
    )
  );
  return v_attempt;
end;
$$;

create or replace function private.save_assessment_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_ids uuid[]
)
returns public.assessment_answers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.assert_assessment_student();
  v_attempt public.assessment_attempts;
  v_question jsonb;
  v_question_type public.assessment_question_type;
  v_selected uuid[];
  v_answer public.assessment_answers;
begin
  select * into v_attempt
  from public.assessment_attempts
  where id = p_attempt_id
  for update;
  if not found then
    raise exception 'ASSESSMENT_ATTEMPT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_attempt.user_id <> v_user_id then
    raise exception 'ASSESSMENT_ATTEMPT_FORBIDDEN' using errcode = '42501';
  end if;
  if v_attempt.status <> 'in_progress'::public.assessment_attempt_status then
    raise exception 'ASSESSMENT_ATTEMPT_NOT_ACTIVE' using errcode = '55000';
  end if;
  if v_attempt.expires_at is not null
     and v_attempt.expires_at <= statement_timestamp() then
    raise exception 'ASSESSMENT_ATTEMPT_EXPIRED' using errcode = '55000';
  end if;
  if p_selected_option_ids is null or cardinality(p_selected_option_ids) = 0 then
    raise exception 'ASSESSMENT_ANSWER_REQUIRED' using errcode = '22023';
  end if;

  select value into v_question
  from jsonb_array_elements(v_attempt.question_snapshot)
  where (value ->> 'question_id')::uuid = p_question_id;
  if not found then
    raise exception 'ASSESSMENT_QUESTION_NOT_IN_ATTEMPT' using errcode = '22023';
  end if;

  select array_agg(distinct selected_id order by selected_id)
  into v_selected
  from unnest(p_selected_option_ids) selected_id;
  if cardinality(v_selected) <> cardinality(p_selected_option_ids) then
    raise exception 'ASSESSMENT_ANSWER_DUPLICATE_OPTION' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_selected) selected_id
    where not exists (
      select 1
      from jsonb_array_elements(v_question -> 'options') option_item
      where (option_item ->> 'option_id')::uuid = selected_id
    )
  ) then
    raise exception 'ASSESSMENT_OPTION_NOT_IN_ATTEMPT' using errcode = '22023';
  end if;

  v_question_type := (v_question ->> 'question_type')::public.assessment_question_type;
  if v_question_type in (
       'single_choice'::public.assessment_question_type,
       'true_false'::public.assessment_question_type
     ) and cardinality(v_selected) <> 1 then
    raise exception 'ASSESSMENT_SINGLE_ANSWER_REQUIRED' using errcode = '22023';
  end if;
  if v_question_type = 'multiple_choice'::public.assessment_question_type
     and cardinality(v_selected) > jsonb_array_length(v_question -> 'options') then
    raise exception 'ASSESSMENT_MULTIPLE_ANSWER_INVALID' using errcode = '22023';
  end if;

  insert into public.assessment_answers(
    attempt_id,
    question_id,
    selected_option_ids,
    answered_at
  ) values (
    p_attempt_id,
    p_question_id,
    v_selected,
    statement_timestamp()
  )
  on conflict (attempt_id, question_id) do update set
    selected_option_ids = excluded.selected_option_ids,
    answered_at = excluded.answered_at
  returning * into v_answer;

  perform private.log_assessment_event(
    v_attempt.assessment_id,
    'answer_saved'::public.assessment_event_type,
    v_attempt.assessment_version,
    p_question_id,
    v_attempt.id,
    '{}'::jsonb
  );
  return v_answer;
end;
$$;

create or replace function private.submit_assessment_attempt(p_attempt_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.assert_assessment_student();
  v_attempt public.assessment_attempts;
  v_answer_key jsonb;
  v_key_item jsonb;
  v_question_id uuid;
  v_correct uuid[];
  v_selected uuid[];
  v_points numeric(10,2);
  v_total numeric(10,2) := 0;
  v_earned numeric(10,2) := 0;
  v_score numeric(5,2);
  v_passed boolean;
begin
  select * into v_attempt
  from public.assessment_attempts
  where id = p_attempt_id
  for update;
  if not found then
    raise exception 'ASSESSMENT_ATTEMPT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_attempt.user_id <> v_user_id then
    raise exception 'ASSESSMENT_ATTEMPT_FORBIDDEN' using errcode = '42501';
  end if;
  if v_attempt.status = 'graded'::public.assessment_attempt_status then
    return v_attempt;
  end if;
  if v_attempt.status <> 'in_progress'::public.assessment_attempt_status then
    raise exception 'ASSESSMENT_ATTEMPT_NOT_ACTIVE' using errcode = '55000';
  end if;

  if v_attempt.expires_at is not null
     and v_attempt.expires_at <= statement_timestamp() then
    update public.assessment_attempts set
      status = 'expired'::public.assessment_attempt_status
    where id = p_attempt_id
    returning * into v_attempt;

    perform private.log_assessment_event(
      v_attempt.assessment_id,
      'attempt_expired'::public.assessment_event_type,
      v_attempt.assessment_version,
      null,
      v_attempt.id,
      jsonb_build_object('attempt_number', v_attempt.attempt_number)
    );
    return v_attempt;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_attempt.question_snapshot) question_item
    where coalesce((question_item ->> 'required')::boolean, true)
      and not exists (
        select 1 from public.assessment_answers answer
        where answer.attempt_id = p_attempt_id
          and answer.question_id = (question_item ->> 'question_id')::uuid
      )
  ) then
    raise exception 'ASSESSMENT_REQUIRED_ANSWERS_MISSING' using errcode = '22023';
  end if;

  select answer_key into v_answer_key
  from private.assessment_attempt_keys
  where attempt_id = p_attempt_id;
  if not found then
    raise exception 'ASSESSMENT_ANSWER_KEY_MISSING' using errcode = 'XX000';
  end if;

  for v_key_item in select value from jsonb_array_elements(v_answer_key) loop
    v_question_id := (v_key_item ->> 'question_id')::uuid;
    v_points := (v_key_item ->> 'points')::numeric;
    select coalesce(array_agg(value::uuid order by value::uuid), '{}'::uuid[])
    into v_correct
    from jsonb_array_elements_text(v_key_item -> 'correct_option_ids');

    select selected_option_ids into v_selected
    from public.assessment_answers
    where attempt_id = p_attempt_id and question_id = v_question_id;

    v_total := v_total + v_points;
    if coalesce(v_selected, '{}'::uuid[]) = v_correct then
      v_earned := v_earned + v_points;
    end if;
  end loop;

  if v_total <= 0 then
    raise exception 'ASSESSMENT_TOTAL_POINTS_INVALID' using errcode = 'XX000';
  end if;

  v_score := round((v_earned / v_total) * 100, 2);
  v_passed := v_score >= v_attempt.passing_score;

  update public.assessment_attempts set
    status = 'graded'::public.assessment_attempt_status,
    submitted_at = statement_timestamp(),
    graded_at = statement_timestamp(),
    total_points = v_total,
    earned_points = v_earned,
    score_percent = v_score,
    passed = v_passed
  where id = p_attempt_id
  returning * into v_attempt;

  perform private.log_assessment_event(
    v_attempt.assessment_id,
    'attempt_graded'::public.assessment_event_type,
    v_attempt.assessment_version,
    null,
    v_attempt.id,
    jsonb_build_object(
      'attempt_number', v_attempt.attempt_number,
      'score_percent', v_attempt.score_percent,
      'passed', v_attempt.passed
    )
  );
  return v_attempt;
end;
$$;

create or replace function private.get_assessment_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_attempt public.assessment_attempts;
  v_answer_key jsonb;
  v_answers jsonb;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.assessment_attempts
  where id = p_attempt_id;
  if not found then
    raise exception 'ASSESSMENT_ATTEMPT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_role <> 'administrador_proprietario'::public.app_role
     and (v_role <> 'aluno'::public.app_role or v_attempt.user_id <> v_user_id) then
    raise exception 'ASSESSMENT_ATTEMPT_FORBIDDEN' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', question_id,
        'selected_option_ids', to_jsonb(selected_option_ids),
        'answered_at', answered_at
      ) order by question_id
    ),
    '[]'::jsonb
  ) into v_answers
  from public.assessment_answers
  where attempt_id = p_attempt_id;

  v_result := jsonb_build_object(
    'attempt_id', v_attempt.id,
    'assessment_id', v_attempt.assessment_id,
    'attempt_number', v_attempt.attempt_number,
    'status', v_attempt.status,
    'started_at', v_attempt.started_at,
    'expires_at', v_attempt.expires_at,
    'submitted_at', v_attempt.submitted_at,
    'graded_at', v_attempt.graded_at,
    'passing_score', v_attempt.passing_score,
    'total_points', v_attempt.total_points,
    'earned_points', v_attempt.earned_points,
    'score_percent', v_attempt.score_percent,
    'passed', v_attempt.passed,
    'questions', v_attempt.question_snapshot,
    'answers', v_answers
  );

  if v_attempt.status = 'graded'::public.assessment_attempt_status
     and v_attempt.show_correct_answers then
    select answer_key into v_answer_key
    from private.assessment_attempt_keys
    where attempt_id = p_attempt_id;
    v_result := v_result || jsonb_build_object('answer_review', v_answer_key);
  end if;

  return v_result;
end;
$$;

create function public.start_assessment_attempt(p_assessment_id uuid)
returns public.assessment_attempts
language sql
security invoker
set search_path = ''
as $$ select private.start_assessment_attempt(p_assessment_id) $$;

create function public.save_assessment_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_ids uuid[]
)
returns public.assessment_answers
language sql
security invoker
set search_path = ''
as $$ select private.save_assessment_answer(p_attempt_id, p_question_id, p_selected_option_ids) $$;

create function public.submit_assessment_attempt(p_attempt_id uuid)
returns public.assessment_attempts
language sql
security invoker
set search_path = ''
as $$ select private.submit_assessment_attempt(p_attempt_id) $$;

create function public.get_assessment_attempt_result(p_attempt_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_assessment_attempt_result(p_attempt_id) $$;

revoke all on function private.assert_assessment_student() from public, anon, authenticated;
revoke all on function private.start_assessment_attempt(uuid) from public, anon;
revoke all on function private.save_assessment_answer(uuid, uuid, uuid[]) from public, anon;
revoke all on function private.submit_assessment_attempt(uuid) from public, anon;
revoke all on function private.get_assessment_attempt_result(uuid) from public, anon;
grant execute on function private.start_assessment_attempt(uuid) to authenticated, service_role;
grant execute on function private.save_assessment_answer(uuid, uuid, uuid[]) to authenticated, service_role;
grant execute on function private.submit_assessment_attempt(uuid) to authenticated, service_role;
grant execute on function private.get_assessment_attempt_result(uuid) to authenticated, service_role;

revoke all on function public.start_assessment_attempt(uuid) from public, anon;
revoke all on function public.save_assessment_answer(uuid, uuid, uuid[]) from public, anon;
revoke all on function public.submit_assessment_attempt(uuid) from public, anon;
revoke all on function public.get_assessment_attempt_result(uuid) from public, anon;
grant execute on function public.start_assessment_attempt(uuid) to authenticated, service_role;
grant execute on function public.save_assessment_answer(uuid, uuid, uuid[]) to authenticated, service_role;
grant execute on function public.submit_assessment_attempt(uuid) to authenticated, service_role;
grant execute on function public.get_assessment_attempt_result(uuid) to authenticated, service_role;
