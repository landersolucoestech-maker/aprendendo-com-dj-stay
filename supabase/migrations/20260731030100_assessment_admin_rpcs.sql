-- FASE B13: owner-only assessment authoring with optimistic concurrency.

create or replace function private.log_assessment_event(
  p_assessment_id uuid,
  p_event_type public.assessment_event_type,
  p_version integer default null,
  p_question_id uuid default null,
  p_attempt_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.assessment_events(
    assessment_id,
    question_id,
    attempt_id,
    actor_user_id,
    event_type,
    version,
    details
  ) values (
    p_assessment_id,
    p_question_id,
    p_attempt_id,
    (select auth.uid()),
    p_event_type,
    p_version,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function private.resolve_assessment_module_id(
  p_course_id uuid,
  p_scope public.assessment_scope,
  p_module_id uuid,
  p_lesson_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_module_id uuid;
begin
  if not exists (
    select 1 from public.courses
    where id = p_course_id and deleted_at is null
  ) then
    raise exception 'COURSE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_scope = 'course'::public.assessment_scope then
    if p_module_id is not null or p_lesson_id is not null then
      raise exception 'COURSE_ASSESSMENT_SCOPE_INVALID' using errcode = '22023';
    end if;
    return null;
  end if;

  if p_scope = 'module'::public.assessment_scope then
    if p_module_id is null or p_lesson_id is not null then
      raise exception 'MODULE_ASSESSMENT_SCOPE_INVALID' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.modulos
      where id = p_module_id
        and course_id = p_course_id
        and deleted_at is null
        and status <> 'archived'::public.curriculum_item_status
    ) then
      raise exception 'ASSESSMENT_MODULE_INVALID' using errcode = '22023';
    end if;
    return p_module_id;
  end if;

  if p_scope = 'lesson'::public.assessment_scope then
    if p_lesson_id is null then
      raise exception 'LESSON_ASSESSMENT_SCOPE_INVALID' using errcode = '22023';
    end if;
    select a.modulo_id into v_module_id
    from public.aulas a
    join public.modulos m on m.id = a.modulo_id
    where a.id = p_lesson_id
      and a.deleted_at is null
      and a.status <> 'archived'::public.curriculum_item_status
      and m.course_id = p_course_id
      and m.deleted_at is null
      and m.status <> 'archived'::public.curriculum_item_status;
    if not found then
      raise exception 'ASSESSMENT_LESSON_INVALID' using errcode = '22023';
    end if;
    if p_module_id is not null and p_module_id <> v_module_id then
      raise exception 'ASSESSMENT_LESSON_MODULE_MISMATCH' using errcode = '22023';
    end if;
    return v_module_id;
  end if;

  raise exception 'ASSESSMENT_SCOPE_INVALID' using errcode = '22023';
end;
$$;

create or replace function private.assert_assessment_draft(p_assessment_id uuid)
returns public.assessments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
begin
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null;

  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  return v_assessment;
end;
$$;

create or replace function private.validate_assessment_options(
  p_question_type public.assessment_question_type,
  p_options jsonb
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_count integer;
  v_correct integer;
  v_distinct integer;
begin
  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception 'QUESTION_OPTIONS_ARRAY_REQUIRED' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_options);
  if v_count < 2 or v_count > 10 then
    raise exception 'QUESTION_OPTIONS_COUNT_INVALID' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_options) option
    where jsonb_typeof(option) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(option) key
         where key not in ('text', 'is_correct')
       )
       or nullif(btrim(option ->> 'text'), '') is null
       or char_length(option ->> 'text') > 2000
       or not (option ? 'is_correct')
       or jsonb_typeof(option -> 'is_correct') <> 'boolean'
  ) then
    raise exception 'QUESTION_OPTION_INVALID' using errcode = '22023';
  end if;

  select count(distinct lower(btrim(option ->> 'text')))
  into v_distinct
  from jsonb_array_elements(p_options) option;

  if v_distinct <> v_count then
    raise exception 'QUESTION_OPTIONS_DUPLICATE' using errcode = '22023';
  end if;

  select count(*) filter (where (option ->> 'is_correct')::boolean)
  into v_correct
  from jsonb_array_elements(p_options) option;

  if p_question_type = 'single_choice'::public.assessment_question_type
     and v_correct <> 1 then
    raise exception 'SINGLE_CHOICE_REQUIRES_ONE_CORRECT_OPTION' using errcode = '22023';
  end if;

  if p_question_type = 'true_false'::public.assessment_question_type
     and (v_count <> 2 or v_correct <> 1) then
    raise exception 'TRUE_FALSE_REQUIRES_TWO_OPTIONS_AND_ONE_CORRECT' using errcode = '22023';
  end if;

  if p_question_type = 'multiple_choice'::public.assessment_question_type
     and (v_correct < 1 or v_correct >= v_count) then
    raise exception 'MULTIPLE_CHOICE_CORRECT_OPTIONS_INVALID' using errcode = '22023';
  end if;
end;
$$;

create or replace function private.create_assessment(p_payload jsonb)
returns public.assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_assessment public.assessments;
  v_course_id uuid;
  v_scope public.assessment_scope;
  v_module_id uuid;
  v_lesson_id uuid;
  v_allowed text[] := array[
    'course_id','module_id','lesson_id','scope','title','description',
    'passing_score','max_attempts','time_limit_minutes','shuffle_questions',
    'shuffle_options','show_correct_answers','required',
    'availability_starts_at','availability_ends_at'
  ];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'ASSESSMENT_PAYLOAD_REQUIRED' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_payload) key
    where not key = any(v_allowed)
  ) then
    raise exception 'ASSESSMENT_UNKNOWN_FIELD' using errcode = '22023';
  end if;
  if not (p_payload ? 'course_id') then
    raise exception 'ASSESSMENT_COURSE_REQUIRED' using errcode = '22023';
  end if;
  if nullif(btrim(p_payload ->> 'title'), '') is null then
    raise exception 'ASSESSMENT_TITLE_REQUIRED' using errcode = '22023';
  end if;

  v_course_id := (p_payload ->> 'course_id')::uuid;
  v_scope := coalesce(
    (p_payload ->> 'scope')::public.assessment_scope,
    'course'::public.assessment_scope
  );
  v_module_id := case
    when p_payload ? 'module_id' and p_payload -> 'module_id' <> 'null'::jsonb
      then (p_payload ->> 'module_id')::uuid
    else null
  end;
  v_lesson_id := case
    when p_payload ? 'lesson_id' and p_payload -> 'lesson_id' <> 'null'::jsonb
      then (p_payload ->> 'lesson_id')::uuid
    else null
  end;
  v_module_id := private.resolve_assessment_module_id(
    v_course_id, v_scope, v_module_id, v_lesson_id
  );

  insert into public.assessments(
    course_id,
    module_id,
    lesson_id,
    scope,
    title,
    description,
    passing_score,
    max_attempts,
    time_limit_minutes,
    shuffle_questions,
    shuffle_options,
    show_correct_answers,
    required,
    availability_starts_at,
    availability_ends_at,
    created_by_user_id,
    updated_by_user_id
  ) values (
    v_course_id,
    v_module_id,
    v_lesson_id,
    v_scope,
    btrim(p_payload ->> 'title'),
    case
      when p_payload ? 'description' and p_payload -> 'description' <> 'null'::jsonb
        then nullif(btrim(p_payload ->> 'description'), '')
      else null
    end,
    coalesce((p_payload ->> 'passing_score')::numeric, 70),
    coalesce((p_payload ->> 'max_attempts')::smallint, 3),
    case
      when p_payload ? 'time_limit_minutes' and p_payload -> 'time_limit_minutes' <> 'null'::jsonb
        then (p_payload ->> 'time_limit_minutes')::integer
      else null
    end,
    coalesce((p_payload ->> 'shuffle_questions')::boolean, false),
    coalesce((p_payload ->> 'shuffle_options')::boolean, false),
    coalesce((p_payload ->> 'show_correct_answers')::boolean, false),
    coalesce((p_payload ->> 'required')::boolean, true),
    case
      when p_payload ? 'availability_starts_at' and p_payload -> 'availability_starts_at' <> 'null'::jsonb
        then (p_payload ->> 'availability_starts_at')::timestamptz
      else null
    end,
    case
      when p_payload ? 'availability_ends_at' and p_payload -> 'availability_ends_at' <> 'null'::jsonb
        then (p_payload ->> 'availability_ends_at')::timestamptz
      else null
    end,
    v_actor,
    v_actor
  ) returning * into v_assessment;

  perform private.log_assessment_event(
    v_assessment.id,
    'created'::public.assessment_event_type,
    v_assessment.version,
    null,
    null,
    jsonb_build_object('scope', v_assessment.scope)
  );
  return v_assessment;
end;
$$;

create or replace function private.update_assessment(
  p_assessment_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns public.assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_current public.assessments;
  v_updated public.assessments;
  v_course_id uuid;
  v_scope public.assessment_scope;
  v_module_id uuid;
  v_lesson_id uuid;
  v_allowed text[] := array[
    'course_id','module_id','lesson_id','scope','title','description',
    'passing_score','max_attempts','time_limit_minutes','shuffle_questions',
    'shuffle_options','show_correct_answers','required',
    'availability_starts_at','availability_ends_at'
  ];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or p_payload = '{}'::jsonb then
    raise exception 'ASSESSMENT_PATCH_REQUIRED' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_payload) key
    where not key = any(v_allowed)
  ) then
    raise exception 'ASSESSMENT_UNKNOWN_FIELD' using errcode = '22023';
  end if;

  select * into v_current
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_current.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  if v_current.version <> p_expected_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if p_payload ? 'title' and nullif(btrim(p_payload ->> 'title'), '') is null then
    raise exception 'ASSESSMENT_TITLE_REQUIRED' using errcode = '22023';
  end if;
  if p_payload ? 'description'
     and p_payload -> 'description' <> 'null'::jsonb
     and nullif(btrim(p_payload ->> 'description'), '') is null then
    raise exception 'ASSESSMENT_DESCRIPTION_EMPTY' using errcode = '22023';
  end if;

  v_course_id := case
    when p_payload ? 'course_id' then (p_payload ->> 'course_id')::uuid
    else v_current.course_id
  end;
  v_scope := case
    when p_payload ? 'scope' then (p_payload ->> 'scope')::public.assessment_scope
    else v_current.scope
  end;
  v_module_id := case
    when p_payload ? 'module_id' then
      case when p_payload -> 'module_id' = 'null'::jsonb then null else (p_payload ->> 'module_id')::uuid end
    else v_current.module_id
  end;
  v_lesson_id := case
    when p_payload ? 'lesson_id' then
      case when p_payload -> 'lesson_id' = 'null'::jsonb then null else (p_payload ->> 'lesson_id')::uuid end
    else v_current.lesson_id
  end;
  v_module_id := private.resolve_assessment_module_id(
    v_course_id, v_scope, v_module_id, v_lesson_id
  );

  update public.assessments set
    course_id = v_course_id,
    module_id = v_module_id,
    lesson_id = v_lesson_id,
    scope = v_scope,
    title = case when p_payload ? 'title' then btrim(p_payload ->> 'title') else title end,
    description = case
      when p_payload ? 'description' then
        case when p_payload -> 'description' = 'null'::jsonb then null else btrim(p_payload ->> 'description') end
      else description
    end,
    passing_score = case when p_payload ? 'passing_score' then (p_payload ->> 'passing_score')::numeric else passing_score end,
    max_attempts = case when p_payload ? 'max_attempts' then (p_payload ->> 'max_attempts')::smallint else max_attempts end,
    time_limit_minutes = case
      when p_payload ? 'time_limit_minutes' then
        case when p_payload -> 'time_limit_minutes' = 'null'::jsonb then null else (p_payload ->> 'time_limit_minutes')::integer end
      else time_limit_minutes
    end,
    shuffle_questions = case when p_payload ? 'shuffle_questions' then (p_payload ->> 'shuffle_questions')::boolean else shuffle_questions end,
    shuffle_options = case when p_payload ? 'shuffle_options' then (p_payload ->> 'shuffle_options')::boolean else shuffle_options end,
    show_correct_answers = case when p_payload ? 'show_correct_answers' then (p_payload ->> 'show_correct_answers')::boolean else show_correct_answers end,
    required = case when p_payload ? 'required' then (p_payload ->> 'required')::boolean else required end,
    availability_starts_at = case
      when p_payload ? 'availability_starts_at' then
        case when p_payload -> 'availability_starts_at' = 'null'::jsonb then null else (p_payload ->> 'availability_starts_at')::timestamptz end
      else availability_starts_at
    end,
    availability_ends_at = case
      when p_payload ? 'availability_ends_at' then
        case when p_payload -> 'availability_ends_at' = 'null'::jsonb then null else (p_payload ->> 'availability_ends_at')::timestamptz end
      else availability_ends_at
    end,
    updated_by_user_id = v_actor,
    version = version + 1
  where id = p_assessment_id
  returning * into v_updated;

  perform private.log_assessment_event(
    v_updated.id,
    'updated'::public.assessment_event_type,
    v_updated.version,
    null,
    null,
    jsonb_build_object(
      'fields', (select jsonb_agg(key order by key) from jsonb_object_keys(p_payload) key)
    )
  );
  return v_updated;
end;
$$;

create or replace function private.create_assessment_question(
  p_assessment_id uuid,
  p_expected_assessment_version integer,
  p_payload jsonb
)
returns public.assessment_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_assessment public.assessments;
  v_question public.assessment_questions;
  v_question_type public.assessment_question_type;
  v_options jsonb;
  v_order integer;
  v_allowed text[] := array['question_type','prompt','explanation','points','required','options'];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'QUESTION_PAYLOAD_REQUIRED' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_payload) key
    where not key = any(v_allowed)
  ) then
    raise exception 'QUESTION_UNKNOWN_FIELD' using errcode = '22023';
  end if;
  if not (p_payload ? 'question_type') then
    raise exception 'QUESTION_TYPE_REQUIRED' using errcode = '22023';
  end if;
  if nullif(btrim(p_payload ->> 'prompt'), '') is null then
    raise exception 'QUESTION_PROMPT_REQUIRED' using errcode = '22023';
  end if;

  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  if v_assessment.version <> p_expected_assessment_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  v_question_type := (p_payload ->> 'question_type')::public.assessment_question_type;
  v_options := p_payload -> 'options';
  perform private.validate_assessment_options(v_question_type, v_options);

  select coalesce(max(ordem), -1) + 1 into v_order
  from public.assessment_questions
  where assessment_id = p_assessment_id;

  insert into public.assessment_questions(
    assessment_id,
    question_type,
    prompt,
    explanation,
    ordem,
    points,
    required,
    created_by_user_id,
    updated_by_user_id
  ) values (
    p_assessment_id,
    v_question_type,
    btrim(p_payload ->> 'prompt'),
    case
      when p_payload ? 'explanation' and p_payload -> 'explanation' <> 'null'::jsonb
        then nullif(btrim(p_payload ->> 'explanation'), '')
      else null
    end,
    v_order,
    coalesce((p_payload ->> 'points')::numeric, 1),
    coalesce((p_payload ->> 'required')::boolean, true),
    v_actor,
    v_actor
  ) returning * into v_question;

  insert into public.assessment_options(question_id, option_text, ordem, is_correct)
  select
    v_question.id,
    btrim(option ->> 'text'),
    ordinality::integer - 1,
    (option ->> 'is_correct')::boolean
  from jsonb_array_elements(v_options) with ordinality as items(option, ordinality);

  update public.assessments set
    version = version + 1,
    updated_by_user_id = v_actor
  where id = p_assessment_id
  returning * into v_assessment;

  perform private.log_assessment_event(
    p_assessment_id,
    'question_created'::public.assessment_event_type,
    v_question.version,
    v_question.id,
    null,
    jsonb_build_object('assessment_version', v_assessment.version)
  );
  return v_question;
end;
$$;

create or replace function private.update_assessment_question(
  p_question_id uuid,
  p_expected_question_version integer,
  p_payload jsonb
)
returns public.assessment_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_question public.assessment_questions;
  v_updated public.assessment_questions;
  v_assessment public.assessments;
  v_question_type public.assessment_question_type;
  v_options jsonb;
  v_allowed text[] := array['question_type','prompt','explanation','points','required','options'];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or p_payload = '{}'::jsonb then
    raise exception 'QUESTION_PATCH_REQUIRED' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_payload) key
    where not key = any(v_allowed)
  ) then
    raise exception 'QUESTION_UNKNOWN_FIELD' using errcode = '22023';
  end if;

  select * into v_question
  from public.assessment_questions
  where id = p_question_id and deleted_at is null
  for update;
  if not found then
    raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_question.status = 'archived'::public.assessment_status then
    raise exception 'QUESTION_ARCHIVED' using errcode = '55000';
  end if;
  if v_question.version <> p_expected_question_version then
    raise exception 'QUESTION_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select * into v_assessment
  from public.assessments
  where id = v_question.assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  if p_payload ? 'prompt' and nullif(btrim(p_payload ->> 'prompt'), '') is null then
    raise exception 'QUESTION_PROMPT_REQUIRED' using errcode = '22023';
  end if;
  if p_payload ? 'explanation'
     and p_payload -> 'explanation' <> 'null'::jsonb
     and nullif(btrim(p_payload ->> 'explanation'), '') is null then
    raise exception 'QUESTION_EXPLANATION_EMPTY' using errcode = '22023';
  end if;

  v_question_type := case
    when p_payload ? 'question_type'
      then (p_payload ->> 'question_type')::public.assessment_question_type
    else v_question.question_type
  end;

  if p_payload ? 'options' then
    v_options := p_payload -> 'options';
  else
    select jsonb_agg(
      jsonb_build_object('text', option_text, 'is_correct', is_correct)
      order by ordem
    ) into v_options
    from public.assessment_options
    where question_id = p_question_id;
  end if;
  perform private.validate_assessment_options(v_question_type, v_options);

  update public.assessment_questions set
    question_type = v_question_type,
    prompt = case when p_payload ? 'prompt' then btrim(p_payload ->> 'prompt') else prompt end,
    explanation = case
      when p_payload ? 'explanation' then
        case when p_payload -> 'explanation' = 'null'::jsonb then null else btrim(p_payload ->> 'explanation') end
      else explanation
    end,
    points = case when p_payload ? 'points' then (p_payload ->> 'points')::numeric else points end,
    required = case when p_payload ? 'required' then (p_payload ->> 'required')::boolean else required end,
    updated_by_user_id = v_actor,
    version = version + 1
  where id = p_question_id
  returning * into v_updated;

  if p_payload ? 'options' then
    delete from public.assessment_options where question_id = p_question_id;
    insert into public.assessment_options(question_id, option_text, ordem, is_correct)
    select
      p_question_id,
      btrim(option ->> 'text'),
      ordinality::integer - 1,
      (option ->> 'is_correct')::boolean
    from jsonb_array_elements(v_options) with ordinality as items(option, ordinality);

    perform private.log_assessment_event(
      v_assessment.id,
      'options_replaced'::public.assessment_event_type,
      v_updated.version,
      v_updated.id,
      null,
      jsonb_build_object('option_count', jsonb_array_length(v_options))
    );
  end if;

  update public.assessments set
    version = version + 1,
    updated_by_user_id = v_actor
  where id = v_assessment.id
  returning * into v_assessment;

  perform private.log_assessment_event(
    v_assessment.id,
    'question_updated'::public.assessment_event_type,
    v_updated.version,
    v_updated.id,
    null,
    jsonb_build_object(
      'assessment_version', v_assessment.version,
      'fields', (select jsonb_agg(key order by key) from jsonb_object_keys(p_payload) key)
    )
  );
  return v_updated;
end;
$$;

create or replace function private.reorder_assessment_questions(
  p_assessment_id uuid,
  p_expected_assessment_version integer,
  p_items jsonb
)
returns public.assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_assessment public.assessments;
  v_count integer;
  v_offset integer;
  v_item jsonb;
  v_question public.assessment_questions;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'QUESTION_ORDER_ARRAY_REQUIRED' using errcode = '22023';
  end if;

  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  if v_assessment.version <> p_expected_assessment_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select count(*) into v_count
  from public.assessment_questions
  where assessment_id = p_assessment_id
    and deleted_at is null
    and status <> 'archived'::public.assessment_status;

  if jsonb_array_length(p_items) <> v_count then
    raise exception 'QUESTION_ORDER_MUST_COVER_ACTIVE_ASSESSMENT' using errcode = '22023';
  end if;
  if (select count(distinct item ->> 'id') from jsonb_array_elements(p_items) item) <> v_count
     or (select count(distinct (item ->> 'order')::integer) from jsonb_array_elements(p_items) item) <> v_count
     or exists (
       select 1 from jsonb_array_elements(p_items) item
       where (item ->> 'order')::integer < 0
          or (item ->> 'order')::integer >= v_count
     ) then
    raise exception 'QUESTION_ORDER_INVALID' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_question
    from public.assessment_questions
    where id = (v_item ->> 'id')::uuid
      and assessment_id = p_assessment_id
      and deleted_at is null
      and status <> 'archived'::public.assessment_status
    for update;
    if not found then
      raise exception 'QUESTION_ORDER_ITEM_INVALID' using errcode = '22023';
    end if;
    if v_question.version <> (v_item ->> 'version')::integer then
      raise exception 'QUESTION_VERSION_CONFLICT' using errcode = '40001';
    end if;
  end loop;

  select coalesce(max(ordem), 0) + 1000 into v_offset
  from public.assessment_questions
  where assessment_id = p_assessment_id;

  update public.assessment_questions set
    ordem = v_offset + ordem,
    version = version + 1,
    updated_by_user_id = v_actor
  where assessment_id = p_assessment_id
    and deleted_at is null
    and status <> 'archived'::public.assessment_status;

  for v_item in select value from jsonb_array_elements(p_items) loop
    update public.assessment_questions
    set ordem = (v_item ->> 'order')::integer
    where id = (v_item ->> 'id')::uuid;
  end loop;

  update public.assessments set
    version = version + 1,
    updated_by_user_id = v_actor
  where id = p_assessment_id
  returning * into v_assessment;

  perform private.log_assessment_event(
    p_assessment_id,
    'questions_reordered'::public.assessment_event_type,
    v_assessment.version,
    null,
    null,
    jsonb_build_object('items', p_items)
  );
  return v_assessment;
end;
$$;

create or replace function private.publish_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns public.assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_assessment public.assessments;
  v_question public.assessment_questions;
  v_options jsonb;
begin
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  if v_assessment.version <> p_expected_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.assessment_questions
    where assessment_id = p_assessment_id
      and deleted_at is null
      and status <> 'archived'::public.assessment_status
  ) then
    raise exception 'ASSESSMENT_QUESTION_REQUIRED' using errcode = '22023';
  end if;

  for v_question in
    select * from public.assessment_questions
    where assessment_id = p_assessment_id
      and deleted_at is null
      and status <> 'archived'::public.assessment_status
    order by ordem
    for update
  loop
    select jsonb_agg(
      jsonb_build_object('text', option_text, 'is_correct', is_correct)
      order by ordem
    ) into v_options
    from public.assessment_options
    where question_id = v_question.id;
    perform private.validate_assessment_options(v_question.question_type, v_options);
  end loop;

  update public.assessment_questions set
    status = 'published'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where assessment_id = p_assessment_id
    and deleted_at is null
    and status <> 'archived'::public.assessment_status;

  update public.assessments set
    status = 'published'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where id = p_assessment_id
  returning * into v_assessment;

  perform private.log_assessment_event(
    p_assessment_id,
    'published'::public.assessment_event_type,
    v_assessment.version
  );
  return v_assessment;
end;
$$;

create or replace function private.unpublish_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns public.assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_assessment public.assessments;
begin
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'published'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_PUBLISHED' using errcode = '55000';
  end if;
  if v_assessment.version <> p_expected_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.assessment_attempts
    where assessment_id = p_assessment_id
      and status = 'in_progress'::public.assessment_attempt_status
  ) then
    raise exception 'ASSESSMENT_HAS_ACTIVE_ATTEMPTS' using errcode = '55006';
  end if;

  update public.assessment_questions set
    status = 'draft'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where assessment_id = p_assessment_id
    and deleted_at is null
    and status = 'published'::public.assessment_status;

  update public.assessments set
    status = 'draft'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where id = p_assessment_id
  returning * into v_assessment;

  perform private.log_assessment_event(
    p_assessment_id,
    'unpublished'::public.assessment_event_type,
    v_assessment.version
  );
  return v_assessment;
end;
$$;

create or replace function private.archive_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns public.assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_assessment public.assessments;
begin
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id and deleted_at is null
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status = 'archived'::public.assessment_status then
    raise exception 'ASSESSMENT_ALREADY_ARCHIVED' using errcode = '55000';
  end if;
  if v_assessment.version <> p_expected_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.assessment_attempts
    where assessment_id = p_assessment_id
      and status = 'in_progress'::public.assessment_attempt_status
  ) then
    raise exception 'ASSESSMENT_HAS_ACTIVE_ATTEMPTS' using errcode = '55006';
  end if;

  update public.assessment_questions set
    status = 'archived'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where assessment_id = p_assessment_id
    and deleted_at is null
    and status <> 'archived'::public.assessment_status;

  update public.assessments set
    status = 'archived'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where id = p_assessment_id
  returning * into v_assessment;

  perform private.log_assessment_event(
    p_assessment_id,
    'archived'::public.assessment_event_type,
    v_assessment.version
  );
  return v_assessment;
end;
$$;

create or replace function private.delete_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assessment public.assessments;
begin
  perform private.assert_curriculum_admin();
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id
  for update;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_assessment.status <> 'archived'::public.assessment_status then
    raise exception 'ASSESSMENT_ARCHIVE_REQUIRED' using errcode = '55000';
  end if;
  if v_assessment.version <> p_expected_version then
    raise exception 'ASSESSMENT_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.assessment_attempts
    where assessment_id = p_assessment_id
  ) then
    raise exception 'ASSESSMENT_HAS_ATTEMPTS' using errcode = '23503';
  end if;

  perform private.log_assessment_event(
    p_assessment_id,
    'deleted'::public.assessment_event_type,
    v_assessment.version
  );
  delete from public.assessments where id = p_assessment_id;
  return true;
end;
$$;

create or replace function private.archive_assessment_question(
  p_question_id uuid,
  p_expected_version integer
)
returns public.assessment_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.assert_curriculum_admin();
  v_question public.assessment_questions;
  v_assessment public.assessments;
begin
  select * into v_question
  from public.assessment_questions
  where id = p_question_id and deleted_at is null
  for update;
  if not found then
    raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_question.version <> p_expected_version then
    raise exception 'QUESTION_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select * into v_assessment
  from public.assessments
  where id = v_question.assessment_id and deleted_at is null
  for update;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;

  update public.assessment_questions set
    status = 'archived'::public.assessment_status,
    version = version + 1,
    updated_by_user_id = v_actor
  where id = p_question_id
  returning * into v_question;

  update public.assessments set
    version = version + 1,
    updated_by_user_id = v_actor
  where id = v_assessment.id
  returning * into v_assessment;

  perform private.log_assessment_event(
    v_assessment.id,
    'question_archived'::public.assessment_event_type,
    v_question.version,
    v_question.id,
    null,
    jsonb_build_object('assessment_version', v_assessment.version)
  );
  return v_question;
end;
$$;

create or replace function private.delete_assessment_question(
  p_question_id uuid,
  p_expected_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question public.assessment_questions;
  v_assessment public.assessments;
begin
  perform private.assert_curriculum_admin();
  select * into v_question
  from public.assessment_questions
  where id = p_question_id
  for update;
  if not found then
    raise exception 'QUESTION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_question.status <> 'archived'::public.assessment_status then
    raise exception 'QUESTION_ARCHIVE_REQUIRED' using errcode = '55000';
  end if;
  if v_question.version <> p_expected_version then
    raise exception 'QUESTION_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select * into v_assessment
  from public.assessments
  where id = v_question.assessment_id and deleted_at is null
  for update;
  if v_assessment.status <> 'draft'::public.assessment_status then
    raise exception 'ASSESSMENT_MUST_BE_DRAFT' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.assessment_attempts
    where assessment_id = v_assessment.id
  ) then
    raise exception 'QUESTION_HAS_ATTEMPT_HISTORY' using errcode = '23503';
  end if;

  perform private.log_assessment_event(
    v_assessment.id,
    'question_deleted'::public.assessment_event_type,
    v_question.version,
    v_question.id
  );
  delete from public.assessment_questions where id = p_question_id;
  update public.assessments set version = version + 1
  where id = v_assessment.id;
  return true;
end;
$$;

create function public.create_assessment(p_payload jsonb)
returns public.assessments
language sql
security invoker
set search_path = ''
as $$ select private.create_assessment(p_payload) $$;

create function public.update_assessment(
  p_assessment_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns public.assessments
language sql
security invoker
set search_path = ''
as $$ select private.update_assessment(p_assessment_id, p_expected_version, p_payload) $$;

create function public.create_assessment_question(
  p_assessment_id uuid,
  p_expected_assessment_version integer,
  p_payload jsonb
)
returns public.assessment_questions
language sql
security invoker
set search_path = ''
as $$ select private.create_assessment_question(p_assessment_id, p_expected_assessment_version, p_payload) $$;

create function public.update_assessment_question(
  p_question_id uuid,
  p_expected_question_version integer,
  p_payload jsonb
)
returns public.assessment_questions
language sql
security invoker
set search_path = ''
as $$ select private.update_assessment_question(p_question_id, p_expected_question_version, p_payload) $$;

create function public.reorder_assessment_questions(
  p_assessment_id uuid,
  p_expected_assessment_version integer,
  p_items jsonb
)
returns public.assessments
language sql
security invoker
set search_path = ''
as $$ select private.reorder_assessment_questions(p_assessment_id, p_expected_assessment_version, p_items) $$;

create function public.publish_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns public.assessments
language sql
security invoker
set search_path = ''
as $$ select private.publish_assessment(p_assessment_id, p_expected_version) $$;

create function public.unpublish_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns public.assessments
language sql
security invoker
set search_path = ''
as $$ select private.unpublish_assessment(p_assessment_id, p_expected_version) $$;

create function public.archive_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns public.assessments
language sql
security invoker
set search_path = ''
as $$ select private.archive_assessment(p_assessment_id, p_expected_version) $$;

create function public.delete_assessment(
  p_assessment_id uuid,
  p_expected_version integer
)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.delete_assessment(p_assessment_id, p_expected_version) $$;

create function public.archive_assessment_question(
  p_question_id uuid,
  p_expected_version integer
)
returns public.assessment_questions
language sql
security invoker
set search_path = ''
as $$ select private.archive_assessment_question(p_question_id, p_expected_version) $$;

create function public.delete_assessment_question(
  p_question_id uuid,
  p_expected_version integer
)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.delete_assessment_question(p_question_id, p_expected_version) $$;

revoke all on function private.log_assessment_event(uuid, public.assessment_event_type, integer, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.resolve_assessment_module_id(uuid, public.assessment_scope, uuid, uuid) from public, anon, authenticated;
revoke all on function private.assert_assessment_draft(uuid) from public, anon, authenticated;
revoke all on function private.validate_assessment_options(public.assessment_question_type, jsonb) from public, anon, authenticated;
revoke all on function private.create_assessment(jsonb) from public, anon, authenticated;
revoke all on function private.update_assessment(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function private.create_assessment_question(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function private.update_assessment_question(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function private.reorder_assessment_questions(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function private.publish_assessment(uuid, integer) from public, anon, authenticated;
revoke all on function private.unpublish_assessment(uuid, integer) from public, anon, authenticated;
revoke all on function private.archive_assessment(uuid, integer) from public, anon, authenticated;
revoke all on function private.delete_assessment(uuid, integer) from public, anon, authenticated;
revoke all on function private.archive_assessment_question(uuid, integer) from public, anon, authenticated;
revoke all on function private.delete_assessment_question(uuid, integer) from public, anon, authenticated;

revoke all on function public.create_assessment(jsonb) from public, anon;
revoke all on function public.update_assessment(uuid, integer, jsonb) from public, anon;
revoke all on function public.create_assessment_question(uuid, integer, jsonb) from public, anon;
revoke all on function public.update_assessment_question(uuid, integer, jsonb) from public, anon;
revoke all on function public.reorder_assessment_questions(uuid, integer, jsonb) from public, anon;
revoke all on function public.publish_assessment(uuid, integer) from public, anon;
revoke all on function public.unpublish_assessment(uuid, integer) from public, anon;
revoke all on function public.archive_assessment(uuid, integer) from public, anon;
revoke all on function public.delete_assessment(uuid, integer) from public, anon;
revoke all on function public.archive_assessment_question(uuid, integer) from public, anon;
revoke all on function public.delete_assessment_question(uuid, integer) from public, anon;

grant execute on function public.create_assessment(jsonb) to authenticated, service_role;
grant execute on function public.update_assessment(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function public.create_assessment_question(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function public.update_assessment_question(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function public.reorder_assessment_questions(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function public.publish_assessment(uuid, integer) to authenticated, service_role;
grant execute on function public.unpublish_assessment(uuid, integer) to authenticated, service_role;
grant execute on function public.archive_assessment(uuid, integer) to authenticated, service_role;
grant execute on function public.delete_assessment(uuid, integer) to authenticated, service_role;
grant execute on function public.archive_assessment_question(uuid, integer) to authenticated, service_role;
grant execute on function public.delete_assessment_question(uuid, integer) to authenticated, service_role;
