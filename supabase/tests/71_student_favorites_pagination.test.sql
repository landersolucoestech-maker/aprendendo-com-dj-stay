begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create temporary table b106_fixture (
  alpha_id uuid not null,
  beta_id uuid not null,
  course_old_id uuid not null,
  course_middle_id uuid not null,
  course_recent_id uuid not null,
  course_archived_id uuid not null,
  beta_course_id uuid not null
) on commit drop;

insert into b106_fixture values (
  'b1060000-0000-4000-8000-000000000001',
  'b1060000-0000-4000-8000-000000000002',
  'b1060000-0000-4000-8000-000000000101',
  'b1060000-0000-4000-8000-000000000102',
  'b1060000-0000-4000-8000-000000000103',
  'b1060000-0000-4000-8000-000000000104',
  'b1060000-0000-4000-8000-000000000105'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  alpha_id,'authenticated','authenticated','alpha-b106@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Alpha B106"}'::jsonb,
  '2026-08-03T13:00:00Z'::timestamptz,'2026-08-03T13:00:00Z'::timestamptz
from b106_fixture
union all
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  beta_id,'authenticated','authenticated','beta-b106@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Beta B106"}'::jsonb,
  '2026-08-03T13:01:00Z'::timestamptz,'2026-08-03T13:01:00Z'::timestamptz
from b106_fixture;

insert into public.courses(
  id,title,slug,status,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select
  course_old_id,'Curso Alpha Antigo','curso-alpha-antigo-b106',
  'published'::public.course_status,'manual',true,100,alpha_id,alpha_id
from b106_fixture;

insert into public.courses(
  id,title,slug,status,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select
  course_middle_id,'Curso Alpha Intermediário','curso-alpha-intermediario-b106',
  'published'::public.course_status,'manual',true,100,alpha_id,alpha_id
from b106_fixture;

insert into public.courses(
  id,title,slug,status,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select
  course_recent_id,'Curso Alpha Recente','curso-alpha-recente-b106',
  'published'::public.course_status,'manual',true,100,alpha_id,alpha_id
from b106_fixture;

insert into public.courses(
  id,title,slug,status,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select
  course_archived_id,'Curso Alpha Arquivado','curso-alpha-arquivado-b106',
  'archived'::public.course_status,'manual',true,100,alpha_id,alpha_id
from b106_fixture;

insert into public.courses(
  id,title,slug,status,completion_mode,certificate_enabled,
  certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select
  beta_course_id,'Curso Beta Exclusivo','curso-beta-exclusivo-b106',
  'published'::public.course_status,'manual',true,100,beta_id,beta_id
from b106_fixture;

insert into public.student_favorites(
  id,user_id,subject_type,subject_id,created_at
)
select
  'b1060000-0000-4000-8000-000000000201'::uuid,
  alpha_id,'course'::public.student_favorite_subject_type,course_old_id,
  '2026-08-03T13:10:00Z'::timestamptz
from b106_fixture;

insert into public.student_favorites(
  id,user_id,subject_type,subject_id,created_at
)
select
  'b1060000-0000-4000-8000-000000000202'::uuid,
  alpha_id,'course'::public.student_favorite_subject_type,course_middle_id,
  '2026-08-03T13:20:00Z'::timestamptz
from b106_fixture;

insert into public.student_favorites(
  id,user_id,subject_type,subject_id,created_at
)
select
  'b1060000-0000-4000-8000-000000000203'::uuid,
  alpha_id,'course'::public.student_favorite_subject_type,course_recent_id,
  '2026-08-03T13:30:00Z'::timestamptz
from b106_fixture;

insert into public.student_favorites(
  id,user_id,subject_type,subject_id,created_at
)
select
  'b1060000-0000-4000-8000-000000000204'::uuid,
  alpha_id,'course'::public.student_favorite_subject_type,course_archived_id,
  '2026-08-03T13:40:00Z'::timestamptz
from b106_fixture;

insert into public.student_favorites(
  id,user_id,subject_type,subject_id,created_at
)
select
  'b1060000-0000-4000-8000-000000000205'::uuid,
  beta_id,'course'::public.student_favorite_subject_type,beta_course_id,
  '2026-08-03T13:50:00Z'::timestamptz
from b106_fixture;

select has_function(
  'public','get_my_student_favorites',array['integer','integer'],
  'public favorite pagination RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated','public.get_my_student_favorites(integer,integer)','EXECUTE'
  ),
  'authenticated may execute favorite pagination RPC'
);
select ok(
  not has_function_privilege(
    'anon','public.get_my_student_favorites(integer,integer)','EXECUTE'
  ),
  'anonymous cannot execute favorite pagination RPC'
);
select set_config('request.jwt.claims','{}',true);
select throws_ok(
  $$select public.get_my_student_favorites(20,0)$$,
  '42501','AUTH_REQUIRED',
  'favorite pagination requires authentication'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select alpha_id from b106_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_my_student_favorites(1,0)->>'total')::integer,
  3,
  'favorite total excludes unavailable items'
);
select is(
  jsonb_array_length(public.get_my_student_favorites(1,0)->'favorites'),
  1,
  'favorite pagination returns one item'
);
select is(
  public.get_my_student_favorites(1,0)->'favorites'->0->>'title',
  'Curso Alpha Recente',
  'first favorite page starts with newest available item'
);
select is(
  public.get_my_student_favorites(1,1)->'favorites'->0->>'title',
  'Curso Alpha Intermediário',
  'favorite offset returns second available item'
);
select isnt(
  public.get_my_student_favorites(1,0)->'favorites'->0->>'id',
  public.get_my_student_favorites(1,1)->'favorites'->0->>'id',
  'adjacent favorite pages do not overlap'
);
select is(
  public.get_my_student_favorites(1,2)->'favorites'->0->>'title',
  'Curso Alpha Antigo',
  'second favorite offset returns oldest available item'
);
select is(
  jsonb_array_length(public.get_my_student_favorites(1,99)->'favorites'),
  0,
  'offset beyond favorites returns an empty page'
);
select is(
  (public.get_my_student_favorites(1,99)->>'total')::integer,
  3,
  'favorite total remains independent from offset'
);
select is(
  jsonb_array_length(public.get_my_student_favorites(0,0)->'favorites'),
  1,
  'zero favorite limit is clamped to one'
);
select is(
  public.get_my_student_favorites(1,-10)->'favorites'->0->>'title',
  'Curso Alpha Recente',
  'negative favorite offset is clamped to zero'
);
select is(
  public.get_my_student_favorites(1,0)->'favorites'->0->>'action_path',
  '/aluno/cursos/' || (select course_recent_id::text from b106_fixture),
  'course favorite preserves internal action path'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select beta_id from b106_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_my_student_favorites(20,0)->>'total')::integer,
  1,
  'student sees only own favorite total'
);
select is(
  public.get_my_student_favorites(20,0)->'favorites'->0->>'title',
  'Curso Beta Exclusivo',
  'student sees only own favorite page'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select alpha_id from b106_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  public.toggle_my_student_favorite(
    'course'::public.student_favorite_subject_type,
    (select course_old_id from b106_fixture)
  )->>'is_favorite',
  'false',
  'removing a favorite outside the first page succeeds'
);
select is(
  (public.get_my_student_favorites(1,0)->>'total')::integer,
  2,
  'favorite total refreshes after removing another page item'
);

select * from finish();
rollback;
