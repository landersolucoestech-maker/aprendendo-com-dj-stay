begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

select has_function(
  'private',
  'get_academic_admin_analytics',
  array['timestamp with time zone', 'timestamp with time zone', 'uuid', 'integer'],
  'private academic analytics read model exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_academic_admin_analytics'),
  'private academic analytics is security definer'
);
select is(
  (select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_academic_admin_analytics'),
  's',
  'private academic analytics is stable'
);
select has_function(
  'public',
  'get_academic_admin_analytics',
  array['timestamp with time zone', 'timestamp with time zone', 'uuid', 'integer'],
  'public academic analytics RPC exists'
);
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_academic_admin_analytics'),
  'public academic analytics is security invoker'
);
select ok(
  not has_function_privilege('anon','public.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)','EXECUTE'),
  'anonymous users cannot inspect academic analytics'
);
select ok(
  has_function_privilege('authenticated','public.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)','EXECUTE'),
  'authenticated users can reach the owner-guarded academic analytics RPC'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)'::regprocedure)) > 0,
  'academic analytics requires owner administrator role'
);
select ok(
  position('interval ''366 days''' in pg_get_functiondef('private.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)'::regprocedure)) > 0,
  'academic analytics bounds the cohort period'
);
select ok(
  position('not between 7 and 180' in pg_get_functiondef('private.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)'::regprocedure)) > 0,
  'academic analytics bounds the inactivity threshold'
);
select ok(
  position('America/Sao_Paulo' in pg_get_functiondef('private.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)'::regprocedure)) > 0,
  'academic analytics uses the canonical application time zone'
);
select ok(
  position('enrollment.starts_at >= v_start_at' in pg_get_functiondef('private.get_academic_admin_analytics(timestamptz,timestamptz,uuid,integer)'::regprocedure)) > 0,
  'academic analytics defines the cohort by enrollment start time'
);

insert into auth.users(id,email,raw_user_meta_data) values
  ('b9700000-0000-4000-8000-000000000101','b97-owner@example.test','{"full_name":"Owner B97"}'::jsonb),
  ('b9700000-0000-4000-8000-000000000102','b97-student-one@example.test','{"full_name":"Aluno Um"}'::jsonb),
  ('b9700000-0000-4000-8000-000000000103','b97-student-two@example.test','{"full_name":"Aluno Dois"}'::jsonb),
  ('b9700000-0000-4000-8000-000000000104','b97-student-three@example.test','{"full_name":"Aluno Três"}'::jsonb);

update public.user_roles
set role='administrador_proprietario'::public.app_role
where user_id='b9700000-0000-4000-8000-000000000101';

insert into public.courses(id,title,slug,status,published_at) values
  ('b9700000-0000-4000-8000-000000000201','Curso A B97','curso-a-b97','published',statement_timestamp()-interval '90 days'),
  ('b9700000-0000-4000-8000-000000000202','Curso B B97','curso-b-b97','published',statement_timestamp()-interval '90 days');

insert into public.modulos(id,course_id,titulo,ordem,status) values
  ('b9700000-0000-4000-8000-000000000301','b9700000-0000-4000-8000-000000000201','Módulo A',0,'published'),
  ('b9700000-0000-4000-8000-000000000302','b9700000-0000-4000-8000-000000000202','Módulo B',0,'published');

insert into public.aulas(id,modulo_id,titulo,ordem,status) values
  ('b9700000-0000-4000-8000-000000000401','b9700000-0000-4000-8000-000000000301','Aula A1',0,'published'),
  ('b9700000-0000-4000-8000-000000000402','b9700000-0000-4000-8000-000000000301','Aula A2',1,'published'),
  ('b9700000-0000-4000-8000-000000000403','b9700000-0000-4000-8000-000000000302','Aula B1',0,'published'),
  ('b9700000-0000-4000-8000-000000000404','b9700000-0000-4000-8000-000000000302','Aula B2',1,'published');

insert into public.enrollments(
  id,user_id,course_id,status,source,starts_at,granted_by_user_id
) values
  ('b9700000-0000-4000-8000-000000000501','b9700000-0000-4000-8000-000000000102','b9700000-0000-4000-8000-000000000201','active','manual_grant',statement_timestamp()-interval '20 days','b9700000-0000-4000-8000-000000000101'),
  ('b9700000-0000-4000-8000-000000000502','b9700000-0000-4000-8000-000000000103','b9700000-0000-4000-8000-000000000201','active','manual_grant',statement_timestamp()-interval '20 days','b9700000-0000-4000-8000-000000000101'),
  ('b9700000-0000-4000-8000-000000000503','b9700000-0000-4000-8000-000000000104','b9700000-0000-4000-8000-000000000202','suspended','manual_grant',statement_timestamp()-interval '10 days','b9700000-0000-4000-8000-000000000101'),
  ('b9700000-0000-4000-8000-000000000504','b9700000-0000-4000-8000-000000000102','b9700000-0000-4000-8000-000000000202','active','manual_grant',statement_timestamp()-interval '2 days','b9700000-0000-4000-8000-000000000101'),
  ('b9700000-0000-4000-8000-000000000505','b9700000-0000-4000-8000-000000000103','b9700000-0000-4000-8000-000000000202','active','manual_grant',statement_timestamp()-interval '60 days','b9700000-0000-4000-8000-000000000101');

insert into public.progresso_aulas(
  user_id,aula_id,completada,progresso_percentual,tempo_assistido,ultima_visualizacao
) values
  ('b9700000-0000-4000-8000-000000000102','b9700000-0000-4000-8000-000000000401',true,100,600,statement_timestamp()-interval '2 days'),
  ('b9700000-0000-4000-8000-000000000102','b9700000-0000-4000-8000-000000000402',true,100,600,statement_timestamp()-interval '2 days'),
  ('b9700000-0000-4000-8000-000000000103','b9700000-0000-4000-8000-000000000401',true,100,600,statement_timestamp()-interval '15 days');

insert into public.certificates(
  id,code,enrollment_id,user_id,course_id,status,student_name_snapshot,
  course_title_snapshot,completion_percent_snapshot,issued_by_user_id
) values (
  'b9700000-0000-4000-8000-000000000601','DJSTAY-ABCDEF0123456789ABCD',
  'b9700000-0000-4000-8000-000000000501','b9700000-0000-4000-8000-000000000102',
  'b9700000-0000-4000-8000-000000000201','issued','Aluno Um','Curso A B97',100,
  'b9700000-0000-4000-8000-000000000101'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b9700000-0000-4000-8000-000000000102","role":"authenticated","session_id":"b9700000-0000-4000-8000-000000000802","is_anonymous":false}',true);
select throws_ok(
  $$select public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)$$,
  '42501','ADMIN_REQUIRED','student cannot inspect academic analytics'
);

select set_config('request.jwt.claims','{"sub":"b9700000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9700000-0000-4000-8000-000000000801","is_anonymous":false}',true);
select is(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{period,time_zone}','America/Sao_Paulo','analytics returns canonical time zone');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,enrollments_started}')::integer,4,'analytics counts the enrollment cohort');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,unique_students}')::integer,3,'analytics counts unique students');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,active_enrollments}')::integer,3,'analytics counts active enrollments');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,suspended_enrollments}')::integer,1,'analytics counts suspended enrollments');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,completed_all_lessons}')::integer,1,'analytics counts active enrollments that completed every published lesson');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,active_without_recent_activity}')::integer,1,'analytics counts active enrollments without recent activity');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,valid_certificates}')::integer,1,'analytics counts valid certificates in the cohort');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)#>>'{summary,average_completion_percent}')::integer,38,'analytics calculates average completion percent');
select is(jsonb_array_length(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'course_breakdown'),2,'analytics returns each course in the cohort once');
select is((select (row->>'enrollments_started')::integer from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'course_breakdown') row where row->>'course_title'='Curso A B97'),2,'course breakdown counts course A enrollments');
select is((select (row->>'average_completion_percent')::integer from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'course_breakdown') row where row->>'course_title'='Curso A B97'),75,'course breakdown calculates course A completion');
select is((select (row->>'active_without_recent_activity')::integer from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'course_breakdown') row where row->>'course_title'='Curso B B97'),0,'recent course B enrollment is not marked inactive');
select is((select (row->>'enrollment_count')::integer from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'progress_distribution') row where row->>'bucket'='not_started'),2,'progress distribution counts not-started enrollments');
select is((select (row->>'enrollment_count')::integer from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'progress_distribution') row where row->>'bucket'='progress_50_74'),1,'progress distribution counts half-complete enrollments');
select is((select (row->>'enrollment_count')::integer from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'progress_distribution') row where row->>'bucket'='completed_100'),1,'progress distribution counts fully completed enrollments');
select ok(jsonb_array_length(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'daily') >= 30,'daily cohort series includes every local day');
select is((select sum((row->>'enrollments_started')::integer) from jsonb_array_elements(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute',null,7)->'daily') row)::integer,4,'daily cohort totals match the summary');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute','b9700000-0000-4000-8000-000000000201',7)#>>'{summary,enrollments_started}')::integer,2,'course filter limits the cohort');
select is((public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute','b9700000-0000-4000-8000-000000000201',7)#>>'{summary,unique_students}')::integer,2,'course filter limits unique students');
select is(jsonb_array_length(public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp()+interval '1 minute','b9700000-0000-4000-8000-000000000201',7)->'course_breakdown'),1,'course filter returns one course breakdown');
select throws_ok($$select public.get_academic_admin_analytics(statement_timestamp(),statement_timestamp()-interval '1 day',null,30)$$,'22023','ACADEMIC_ANALYTICS_PERIOD_INVALID','analytics rejects inverted periods');
select throws_ok($$select public.get_academic_admin_analytics(statement_timestamp()-interval '367 days',statement_timestamp(),null,30)$$,'22023','ACADEMIC_ANALYTICS_PERIOD_TOO_LARGE','analytics rejects periods longer than 366 days');
select throws_ok($$select public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp(),null,6)$$,'22023','ACADEMIC_ANALYTICS_INACTIVITY_INVALID','analytics rejects inactivity below seven days');
select throws_ok($$select public.get_academic_admin_analytics(statement_timestamp()-interval '30 days',statement_timestamp(),null,181)$$,'22023','ACADEMIC_ANALYTICS_INACTIVITY_INVALID','analytics rejects inactivity above 180 days');
reset role;

select * from finish();
rollback;
