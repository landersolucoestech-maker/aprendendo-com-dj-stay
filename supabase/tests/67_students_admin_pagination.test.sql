begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

create temporary table b101_fixture (
  admin_id uuid not null,
  alpha_id uuid not null,
  beta_id uuid not null,
  gamma_id uuid not null,
  course_id uuid not null,
  alpha_enrollment_id uuid not null,
  beta_enrollment_id uuid not null,
  gamma_enrollment_id uuid not null
) on commit drop;

insert into b101_fixture values (
  'b1010000-0000-4000-8000-000000000001',
  'b1010000-0000-4000-8000-000000000002',
  'b1010000-0000-4000-8000-000000000003',
  'b1010000-0000-4000-8000-000000000004',
  'b1010000-0000-4000-8000-000000000005',
  'b1010000-0000-4000-8000-000000000102',
  'b1010000-0000-4000-8000-000000000103',
  'b1010000-0000-4000-8000-000000000104'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
select '00000000-0000-0000-0000-000000000000'::uuid, admin_id,
  'authenticated','authenticated','admin-b101@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Administrador B101"}'::jsonb,
  '2026-08-01T08:00:00Z'::timestamptz,'2026-08-01T08:00:00Z'::timestamptz
from b101_fixture
union all
select '00000000-0000-0000-0000-000000000000'::uuid, alpha_id,
  'authenticated','authenticated','alpha-b101@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Alpha"}'::jsonb,
  '2026-08-01T09:00:00Z'::timestamptz,'2026-08-01T09:00:00Z'::timestamptz
from b101_fixture
union all
select '00000000-0000-0000-0000-000000000000'::uuid, beta_id,
  'authenticated','authenticated','beta-b101@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Beta"}'::jsonb,
  '2026-08-01T10:00:00Z'::timestamptz,'2026-08-01T10:00:00Z'::timestamptz
from b101_fixture
union all
select '00000000-0000-0000-0000-000000000000'::uuid, gamma_id,
  'authenticated','authenticated','gamma-b101@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Gamma"}'::jsonb,
  '2026-08-01T11:00:00Z'::timestamptz,'2026-08-01T11:00:00Z'::timestamptz
from b101_fixture;

update public.user_roles
set role = 'administrador_proprietario'::public.app_role
where user_id = (select admin_id from b101_fixture);

insert into public.courses(
  id,title,slug,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select course_id,'Curso Acadêmico B101','curso-academico-b101','manual',true,100,admin_id,admin_id
from b101_fixture;

insert into public.enrollments(
  id,user_id,course_id,status,source,granted_by_user_id,created_at,updated_at
)
select alpha_enrollment_id,alpha_id,course_id,'active','manual_grant',admin_id,
  '2026-08-01T12:00:00Z'::timestamptz,'2026-08-01T12:00:00Z'::timestamptz
from b101_fixture
union all
select beta_enrollment_id,beta_id,course_id,'active','manual_grant',admin_id,
  '2026-08-01T13:00:00Z'::timestamptz,'2026-08-01T13:00:00Z'::timestamptz
from b101_fixture
union all
select gamma_enrollment_id,gamma_id,course_id,'active','manual_grant',admin_id,
  '2026-08-01T14:00:00Z'::timestamptz,'2026-08-01T14:00:00Z'::timestamptz
from b101_fixture;

insert into public.certificates(
  id,code,enrollment_id,user_id,course_id,student_name_snapshot,
  course_title_snapshot,completion_percent_snapshot,status,issued_by_user_id,
  issued_at,revoked_at,revoked_by_user_id,revocation_reason
)
select
  'b1010000-0000-4000-8000-000000000202','DJSTAY-00000000000000000001',
  alpha_enrollment_id,alpha_id,course_id,'Aluno Alpha','Curso Acadêmico B101',0,
  'issued',admin_id,'2026-08-01T15:00:00Z'::timestamptz,null,null,null
from b101_fixture
union all
select
  'b1010000-0000-4000-8000-000000000203','DJSTAY-00000000000000000002',
  beta_enrollment_id,beta_id,course_id,'Aluno Beta','Curso Acadêmico B101',0,
  'revoked',admin_id,'2026-08-01T16:00:00Z'::timestamptz,
  '2026-08-01T16:30:00Z'::timestamptz,admin_id,'Revogação B101 comprovada'
from b101_fixture
union all
select
  'b1010000-0000-4000-8000-000000000204','DJSTAY-00000000000000000003',
  gamma_enrollment_id,gamma_id,course_id,'Aluno Gamma','Curso Acadêmico B101',0,
  'issued',admin_id,'2026-08-01T17:00:00Z'::timestamptz,null,null,null
from b101_fixture;

select has_function(
  'private','get_students_admin_dashboard',
  array['text','integer','integer','integer','integer','integer','integer'],
  'private paginated academic dashboard exists'
);
select has_function(
  'public','get_students_admin_dashboard',
  array['text','integer','integer','integer','integer','integer','integer'],
  'public paginated academic dashboard exists'
);
select hasnt_function(
  'public','get_students_admin_dashboard',array['text','integer','integer'],
  'legacy partially paginated dashboard signature is removed'
);
select ok(
  (select prosecdef from pg_proc where oid = 'private.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)'::regprocedure),
  'private academic dashboard is security definer'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)'::regprocedure),
  'public academic dashboard is security invoker'
);
select ok(
  not has_function_privilege('anon', 'public.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)', 'EXECUTE'),
  'anonymous role cannot execute academic dashboard'
);
select ok(
  has_function_privilege('authenticated', 'public.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)', 'EXECUTE'),
  'authenticated role may reach guarded academic wrapper'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub',(select alpha_id from b101_fixture),'role','authenticated')::text,
  true
);
select throws_ok(
  $$select public.get_students_admin_dashboard(null,1,0,1,0,1,0)$$,
  '42501','ADMIN_REQUIRED',
  'student cannot inspect academic administration'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub',(select admin_id from b101_fixture),'role','authenticated')::text,
  true
);

select is(
  (public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'totals'->>'students')::integer,
  3,
  'academic dashboard reports complete student total'
);
select is(
  (public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'totals'->>'enrollments')::integer,
  3,
  'academic dashboard reports complete enrollment total'
);
select is(
  (public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'totals'->>'certificates')::integer,
  3,
  'academic dashboard reports complete certificate total'
);
select is(
  (public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'totals'->>'valid_certificates')::integer,
  2,
  'academic dashboard reports issued certificate total'
);
select is(
  jsonb_array_length(public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'students'),
  1,
  'student page respects independent limit'
);
select is(
  public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'students'->0->>'name',
  'Aluno Gamma',
  'student page starts with newest student'
);
select is(
  public.get_students_admin_dashboard(null,1,1,1,0,1,0)->'students'->0->>'name',
  'Aluno Beta',
  'student offset returns next student'
);
select isnt(
  public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'students'->0->>'user_id',
  public.get_students_admin_dashboard(null,1,1,1,0,1,0)->'students'->0->>'user_id',
  'adjacent student pages do not overlap'
);
select is(
  jsonb_array_length(public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'enrollments'),
  1,
  'enrollment page respects independent limit'
);
select is(
  public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'enrollments'->0->>'user_id',
  (select gamma_id::text from b101_fixture),
  'enrollment page starts with newest enrollment'
);
select is(
  public.get_students_admin_dashboard(null,1,0,1,1,1,0)->'enrollments'->0->>'user_id',
  (select beta_id::text from b101_fixture),
  'enrollment offset returns next enrollment'
);
select is(
  jsonb_array_length(public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'certificates'),
  1,
  'certificate page respects independent limit'
);
select is(
  public.get_students_admin_dashboard(null,1,0,1,0,1,0)->'certificates'->0->>'student_name',
  'Aluno Gamma',
  'certificate page starts with newest certificate'
);
select is(
  public.get_students_admin_dashboard(null,1,0,1,0,1,1)->'certificates'->0->>'student_name',
  'Aluno Beta',
  'certificate offset returns next certificate'
);
select is(
  (public.get_students_admin_dashboard('beta',25,0,25,0,25,0)->'totals'->>'students')::integer,
  1,
  'search filters student total'
);
select is(
  (public.get_students_admin_dashboard('beta',25,0,25,0,25,0)->'totals'->>'enrollments')::integer,
  1,
  'search filters enrollment total'
);
select is(
  (public.get_students_admin_dashboard('beta',25,0,25,0,25,0)->'totals'->>'certificates')::integer,
  1,
  'search filters certificate total'
);
select ok(
  jsonb_array_length(public.get_students_admin_dashboard('beta',25,0,25,0,25,0)->'students') = 1
  and jsonb_array_length(public.get_students_admin_dashboard('beta',25,0,25,0,25,0)->'enrollments') = 1
  and jsonb_array_length(public.get_students_admin_dashboard('beta',25,0,25,0,25,0)->'certificates') = 1,
  'search filters all three academic collections'
);
select is(
  (public.get_students_admin_dashboard('BETA-B101@EXAMPLE.TEST',25,0,25,0,25,0)->'totals'->>'students')::integer,
  1,
  'email search is case insensitive'
);
select is(
  (public.get_students_admin_dashboard('ausente',25,0,25,0,25,0)->'totals'->>'students')::integer,
  0,
  'unknown search returns zero students'
);
select ok(
  jsonb_array_length(public.get_students_admin_dashboard('ausente',25,0,25,0,25,0)->'students') = 0
  and jsonb_array_length(public.get_students_admin_dashboard('ausente',25,0,25,0,25,0)->'enrollments') = 0
  and jsonb_array_length(public.get_students_admin_dashboard('ausente',25,0,25,0,25,0)->'certificates') = 0,
  'unknown search returns empty academic pages'
);
select is(
  jsonb_array_length(public.get_students_admin_dashboard('ausente',1,0,1,0,1,0)->'courses'),
  1,
  'course catalogue remains available independently from student search'
);
select ok(
  jsonb_array_length(public.get_students_admin_dashboard(null,0,0,0,0,0,0)->'students') = 1
  and jsonb_array_length(public.get_students_admin_dashboard(null,0,0,0,0,0,0)->'enrollments') = 1
  and jsonb_array_length(public.get_students_admin_dashboard(null,0,0,0,0,0,0)->'certificates') = 1,
  'zero limits are clamped independently to one'
);
select ok(
  public.get_students_admin_dashboard(null,1,-10,1,-10,1,-10)->'students'->0->>'name' = 'Aluno Gamma'
  and public.get_students_admin_dashboard(null,1,-10,1,-10,1,-10)->'enrollments'->0->>'user_id' = (select gamma_id::text from b101_fixture)
  and public.get_students_admin_dashboard(null,1,-10,1,-10,1,-10)->'certificates'->0->>'student_name' = 'Aluno Gamma',
  'negative offsets are clamped independently to zero'
);
select ok(
  position('order by user_record.created_at desc, user_record.id desc' in lower(pg_get_functiondef('private.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('order by enrollment_record.created_at desc, enrollment_record.id desc' in lower(pg_get_functiondef('private.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('order by certificate_record.issued_at desc, certificate_record.id desc' in lower(pg_get_functiondef('private.get_students_admin_dashboard(text,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0,
  'all academic pages use deterministic ordering'
);
select is(
  (public.get_students_admin_dashboard(null,1,2,1,2,1,2)->'totals'->>'students')::integer,
  3,
  'totals remain independent from all page offsets'
);

select * from finish();
rollback;
