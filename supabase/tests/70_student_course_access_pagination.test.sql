begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select has_function(
  'public','get_student_course_access',
  array['integer','integer','integer'],
  'student course access RPC exists'
);
select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.get_student_course_access(integer,integer,integer)'::regprocedure
  ),
  'student course access is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_student_course_access(integer,integer,integer)',
    'EXECUTE'
  ),
  'anonymous role cannot execute course access'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_student_course_access(integer,integer,integer)',
    'EXECUTE'
  ),
  'authenticated role can execute course access'
);

select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select public.get_student_course_access(20,0,3)$$,
  '42501','AUTHENTICATION_REQUIRED',
  'unauthenticated request is rejected'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
values
(
  '00000000-0000-0000-0000-000000000000',
  'b1120000-0000-4000-8000-000000000001',
  'authenticated','authenticated','student-b112@example.test','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'b1120000-0000-4000-8000-000000000002',
  'authenticated','authenticated','other-b112@example.test','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
);

set local session_replication_role = replica;
insert into public.courses(
  id,title,slug,status,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
values
(
  'b1120000-0000-4000-8000-000000000101',
  'Curso Ativo B112','curso-ativo-b112','published','manual',true,100,
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000001'
),
(
  'b1120000-0000-4000-8000-000000000102',
  'Curso Expirado B112','curso-expirado-b112','published','manual',true,100,
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000001'
),
(
  'b1120000-0000-4000-8000-000000000103',
  'Curso Arquivado B112','curso-arquivado-b112','archived','manual',true,100,
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000001'
);

insert into public.enrollments(
  id,user_id,course_id,status,source,granted_by_user_id,
  starts_at,expires_at,created_at,updated_at
)
values
(
  'b1120000-0000-4000-8000-000000000201',
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000101',
  'active','manual_grant','b1120000-0000-4000-8000-000000000001',
  current_timestamp - interval '2 days',current_timestamp + interval '30 days',
  current_timestamp - interval '3 hours',current_timestamp - interval '3 hours'
),
(
  'b1120000-0000-4000-8000-000000000202',
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000102',
  'active','manual_grant','b1120000-0000-4000-8000-000000000001',
  current_timestamp - interval '30 days',current_timestamp - interval '1 day',
  current_timestamp - interval '2 hours',current_timestamp - interval '2 hours'
),
(
  'b1120000-0000-4000-8000-000000000203',
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000103',
  'active','manual_grant','b1120000-0000-4000-8000-000000000001',
  current_timestamp - interval '2 days',null,
  current_timestamp - interval '1 hour',current_timestamp - interval '1 hour'
),
(
  'b1120000-0000-4000-8000-000000000204',
  'b1120000-0000-4000-8000-000000000001',
  'b1120000-0000-4000-8000-000000000101',
  'revoked','manual_grant','b1120000-0000-4000-8000-000000000001',
  current_timestamp - interval '5 days',null,
  current_timestamp,current_timestamp
),
(
  'b1120000-0000-4000-8000-000000000205',
  'b1120000-0000-4000-8000-000000000002',
  'b1120000-0000-4000-8000-000000000101',
  'active','manual_grant','b1120000-0000-4000-8000-000000000002',
  current_timestamp - interval '1 day',null,
  current_timestamp,current_timestamp
);
set local session_replication_role = origin;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1120000-0000-4000-8000-000000000001',
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_student_course_access(2,0,3)->>'total')::integer,
  4,
  'total includes complete enrollment history for current student'
);
select is(
  (public.get_student_course_access(2,0,3)->>'active_total')::integer,
  1,
  'active total uses status course publication and server clock'
);
select is(
  jsonb_array_length(public.get_student_course_access(2,0,3)->'active_enrollments'),
  1,
  'active sample contains only server-valid enrollment'
);
select is(
  public.get_student_course_access(2,0,3)->'active_enrollments'->0->'courses'->>'title',
  'Curso Ativo B112',
  'active sample exposes expected course'
);
select is(
  jsonb_array_length(public.get_student_course_access(2,0,3)->'enrollments'),
  2,
  'history page respects requested limit'
);
select is(
  public.get_student_course_access(2,0,3)->'enrollments'->0->>'access_active',
  'false',
  'newest revoked enrollment is not active'
);
select is(
  public.get_student_course_access(2,1,3)->'enrollments'->0->'enrollment'->>'id',
  'b1120000-0000-4000-8000-000000000203',
  'offset returns deterministic next enrollment'
);
select is(
  public.get_student_course_access(2,2,3)->'enrollments'->0->>'access_active',
  'false',
  'archived course enrollment is inactive on its page'
);
select is(
  jsonb_array_length(public.get_student_course_access(0,-5,0)->'enrollments'),
  1,
  'zero limit and negative offset are clamped'
);
select is(
  jsonb_object_length(public.get_student_course_access(20,0,3)),
  4,
  'read model exposes only totals active sample and page'
);
select is(
  (public.get_student_course_access(1,3,1)->>'total')::integer,
  4,
  'total remains independent from page offset'
);
select ok(
  position('current_timestamp' in lower(pg_get_functiondef('public.get_student_course_access(integer,integer,integer)'::regprocedure))) > 0,
  'active access is calculated with database clock'
);

select * from finish();
rollback;
