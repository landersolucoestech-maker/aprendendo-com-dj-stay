begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function(
  'public',
  'get_student_course_detail_access',
  array['uuid'],
  'student course detail access RPC exists'
);
select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.get_student_course_detail_access(uuid)'::regprocedure
  ),
  'student course detail access is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_student_course_detail_access(uuid)',
    'EXECUTE'
  ),
  'anonymous role cannot execute student course detail access'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_student_course_detail_access(uuid)',
    'EXECUTE'
  ),
  'authenticated role can execute student course detail access'
);

select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000101')$$,
  '42501',
  'AUTHENTICATION_REQUIRED',
  'unauthenticated request is rejected'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1130000-0000-4000-8000-000000000001',
    'role','authenticated'
  )::text,
  true
);
select throws_ok(
  $$select public.get_student_course_detail_access(null::uuid)$$,
  '22023',
  'COURSE_ID_REQUIRED',
  'null course identifier is rejected'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
values
(
  '00000000-0000-0000-0000-000000000000',
  'b1130000-0000-4000-8000-000000000001',
  'authenticated','authenticated','student-a-b113@example.test','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'b1130000-0000-4000-8000-000000000002',
  'authenticated','authenticated','student-b-b113@example.test','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
);

set local session_replication_role = replica;
insert into public.courses(
  id,title,slug,status,published_at,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
values
(
  'b1130000-0000-4000-8000-000000000101',
  'Curso Ativo B113','curso-ativo-b113','published',current_timestamp,
  'manual',true,100,
  'b1130000-0000-4000-8000-000000000001',
  'b1130000-0000-4000-8000-000000000001'
),
(
  'b1130000-0000-4000-8000-000000000102',
  'Curso Expirado B113','curso-expirado-b113','published',current_timestamp,
  'manual',true,100,
  'b1130000-0000-4000-8000-000000000001',
  'b1130000-0000-4000-8000-000000000001'
),
(
  'b1130000-0000-4000-8000-000000000103',
  'Curso Arquivado B113','curso-arquivado-b113','archived',null,
  'manual',true,100,
  'b1130000-0000-4000-8000-000000000001',
  'b1130000-0000-4000-8000-000000000001'
),
(
  'b1130000-0000-4000-8000-000000000104',
  'Curso Outro Aluno B113','curso-outro-aluno-b113','published',current_timestamp,
  'manual',true,100,
  'b1130000-0000-4000-8000-000000000002',
  'b1130000-0000-4000-8000-000000000002'
);

insert into public.enrollments(
  id,user_id,course_id,status,source,granted_by_user_id,
  starts_at,expires_at,created_at,updated_at
)
values
(
  'b1130000-0000-4000-8000-000000000201',
  'b1130000-0000-4000-8000-000000000001',
  'b1130000-0000-4000-8000-000000000101',
  'active','manual_grant','b1130000-0000-4000-8000-000000000001',
  current_timestamp - interval '2 days',current_timestamp + interval '30 days',
  current_timestamp - interval '3 hours',current_timestamp - interval '3 hours'
),
(
  'b1130000-0000-4000-8000-000000000202',
  'b1130000-0000-4000-8000-000000000001',
  'b1130000-0000-4000-8000-000000000102',
  'active','manual_grant','b1130000-0000-4000-8000-000000000001',
  current_timestamp - interval '30 days',current_timestamp - interval '1 day',
  current_timestamp - interval '2 hours',current_timestamp - interval '2 hours'
),
(
  'b1130000-0000-4000-8000-000000000203',
  'b1130000-0000-4000-8000-000000000001',
  'b1130000-0000-4000-8000-000000000103',
  'active','manual_grant','b1130000-0000-4000-8000-000000000001',
  current_timestamp - interval '2 days',null,
  current_timestamp - interval '1 hour',current_timestamp - interval '1 hour'
),
(
  'b1130000-0000-4000-8000-000000000204',
  'b1130000-0000-4000-8000-000000000002',
  'b1130000-0000-4000-8000-000000000104',
  'active','manual_grant','b1130000-0000-4000-8000-000000000002',
  current_timestamp - interval '1 day',null,
  current_timestamp,current_timestamp
);
set local session_replication_role = origin;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1130000-0000-4000-8000-000000000001',
    'role','authenticated'
  )::text,
  true
);
select ok(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000101') is not null,
  'active published enrollment grants course detail access'
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000101')->>'id',
  'b1130000-0000-4000-8000-000000000201',
  'course detail exposes expected enrollment'
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000101')->>'course_id',
  'b1130000-0000-4000-8000-000000000101',
  'course detail is restricted to requested course'
);
select is(
  (
    select count(*)::integer
    from jsonb_object_keys(
      public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000101')
    )
  ),
  11,
  'course detail exposes only enrollment projection fields'
);
select is(
  (
    select count(*)::integer
    from jsonb_object_keys(
      public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000101')->'courses'
    )
  ),
  4,
  'course detail exposes only course summary fields'
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000102'),
  null::jsonb,
  'expired enrollment does not grant course detail access'
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000103'),
  null::jsonb,
  'archived course does not grant course detail access'
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000104'),
  null::jsonb,
  'current student cannot access another student course'
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000999'),
  null::jsonb,
  'unknown course returns no access'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1130000-0000-4000-8000-000000000002',
    'role','authenticated'
  )::text,
  true
);
select is(
  public.get_student_course_detail_access('b1130000-0000-4000-8000-000000000104')->>'id',
  'b1130000-0000-4000-8000-000000000204',
  'second student sees own targeted enrollment'
);
select ok(
  position('current_timestamp' in lower(pg_get_functiondef('public.get_student_course_detail_access(uuid)'::regprocedure))) > 0
    and position('enrollment_record.user_id = v_user_id' in lower(pg_get_functiondef('public.get_student_course_detail_access(uuid)'::regprocedure))) > 0,
  'course detail access uses database clock and authenticated user filter'
);

select * from finish();
rollback;
