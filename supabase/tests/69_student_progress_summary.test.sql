begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_function(
  'public',
  'get_student_progress_summary',
  array[]::text[],
  'student progress summary RPC exists'
);
select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.get_student_progress_summary()'::regprocedure
  ),
  'student progress summary is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_student_progress_summary()',
    'EXECUTE'
  ),
  'anonymous role cannot execute student progress summary'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_student_progress_summary()',
    'EXECUTE'
  ),
  'authenticated role can execute student progress summary'
);

select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  $$select public.get_student_progress_summary()$$,
  '42501',
  'AUTHENTICATION_REQUIRED',
  'unauthenticated request is rejected'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
values
(
  '00000000-0000-0000-0000-000000000000',
  'b1110000-0000-4000-8000-000000000001',
  'authenticated','authenticated','student-a-b111@example.test','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'b1110000-0000-4000-8000-000000000002',
  'authenticated','authenticated','student-b-b111@example.test','',now(),
  '{}'::jsonb,'{}'::jsonb,now(),now()
);

set local session_replication_role = replica;
insert into public.progresso_aulas(
  id,user_id,aula_id,progresso_percentual,tempo_assistido,completada,
  ultima_visualizacao,created_at,updated_at
)
values
(
  'b1110000-0000-4000-8000-000000000101',
  'b1110000-0000-4000-8000-000000000001',
  'b1110000-0000-4000-8000-000000000201',
  20,120,false,now(),now(),now()
),
(
  'b1110000-0000-4000-8000-000000000102',
  'b1110000-0000-4000-8000-000000000001',
  'b1110000-0000-4000-8000-000000000202',
  80,480,true,now(),now(),now()
),
(
  'b1110000-0000-4000-8000-000000000103',
  'b1110000-0000-4000-8000-000000000001',
  'b1110000-0000-4000-8000-000000000203',
  100,600,true,now(),now(),now()
),
(
  'b1110000-0000-4000-8000-000000000104',
  'b1110000-0000-4000-8000-000000000002',
  'b1110000-0000-4000-8000-000000000204',
  100,600,true,now(),now(),now()
);
set local session_replication_role = origin;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1110000-0000-4000-8000-000000000001',
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_student_progress_summary()->>'started_lessons')::integer,
  3,
  'summary counts only current student started lessons'
);
select is(
  (public.get_student_progress_summary()->>'completed_lessons')::integer,
  2,
  'summary counts current student completed lessons'
);
select is(
  (public.get_student_progress_summary()->>'average_progress_percent')::integer,
  67,
  'summary rounds current student average progress'
);
select is(
  jsonb_object_length(public.get_student_progress_summary()),
  3,
  'summary exposes only three aggregate fields'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1110000-0000-4000-8000-000000000002',
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_student_progress_summary()->>'started_lessons')::integer,
  1,
  'second student sees only own started lessons'
);
select is(
  (public.get_student_progress_summary()->>'completed_lessons')::integer,
  1,
  'second student sees only own completed lessons'
);
select is(
  (public.get_student_progress_summary()->>'average_progress_percent')::integer,
  100,
  'second student sees only own average progress'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub','b1110000-0000-4000-8000-000000000003',
    'role','authenticated'
  )::text,
  true
);
select is(
  public.get_student_progress_summary(),
  jsonb_build_object(
    'started_lessons',0,
    'completed_lessons',0,
    'average_progress_percent',0
  ),
  'student without progress receives coherent zero summary'
);

select * from finish();
rollback;
