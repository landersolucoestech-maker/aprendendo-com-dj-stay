-- FASE B13: preserve destructive-action audit trails through logical deletion.

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

  update public.assessments set
    deleted_at = statement_timestamp(),
    updated_by_user_id = v_actor,
    version = version + 1
  where id = p_assessment_id
  returning * into v_assessment;

  perform private.log_assessment_event(
    p_assessment_id,
    'deleted'::public.assessment_event_type,
    v_assessment.version
  );
  return true;
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

  update public.assessment_questions set
    deleted_at = statement_timestamp(),
    updated_by_user_id = v_actor,
    version = version + 1
  where id = p_question_id
  returning * into v_question;

  update public.assessments set
    version = version + 1,
    updated_by_user_id = v_actor
  where id = v_assessment.id
  returning * into v_assessment;

  perform private.log_assessment_event(
    v_assessment.id,
    'question_deleted'::public.assessment_event_type,
    v_question.version,
    v_question.id,
    null,
    jsonb_build_object('assessment_version', v_assessment.version)
  );
  return true;
end;
$$;

revoke all on function private.delete_assessment(uuid, integer) from public, anon;
revoke all on function private.delete_assessment_question(uuid, integer) from public, anon;
grant execute on function private.delete_assessment(uuid, integer) to authenticated, service_role;
grant execute on function private.delete_assessment_question(uuid, integer) to authenticated, service_role;
