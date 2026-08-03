begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create temporary table b105_fixture (
  alpha_id uuid not null,
  beta_id uuid not null
) on commit drop;

insert into b105_fixture values (
  'b1050000-0000-4000-8000-000000000001',
  'b1050000-0000-4000-8000-000000000002'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  alpha_id,'authenticated','authenticated','alpha-b105@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Alpha B105"}'::jsonb,
  '2026-08-03T12:00:00Z'::timestamptz,'2026-08-03T12:00:00Z'::timestamptz
from b105_fixture
union all
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  beta_id,'authenticated','authenticated','beta-b105@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Beta B105"}'::jsonb,
  '2026-08-03T12:01:00Z'::timestamptz,'2026-08-03T12:01:00Z'::timestamptz
from b105_fixture;

insert into public.student_notifications(
  id,user_id,type,title,message,idempotency_key,read_at,created_at
)
select
  'b1050000-0000-4000-8000-000000000101'::uuid,
  alpha_id,'system'::public.student_notification_type,
  'Alpha antiga','Mensagem alpha antiga','b105-alpha-antiga',
  '2026-08-03T12:30:00Z'::timestamptz,
  '2026-08-03T12:10:00Z'::timestamptz
from b105_fixture
union all
select
  'b1050000-0000-4000-8000-000000000102'::uuid,
  alpha_id,'payment_confirmed'::public.student_notification_type,
  'Alpha intermediária','Mensagem alpha intermediária','b105-alpha-intermediaria',
  null,'2026-08-03T12:20:00Z'::timestamptz
from b105_fixture
union all
select
  'b1050000-0000-4000-8000-000000000103'::uuid,
  alpha_id,'support_reply'::public.student_notification_type,
  'Alpha recente','Mensagem alpha recente','b105-alpha-recente',
  null,'2026-08-03T12:30:00Z'::timestamptz
from b105_fixture
union all
select
  'b1050000-0000-4000-8000-000000000104'::uuid,
  beta_id,'certificate_issued'::public.student_notification_type,
  'Beta exclusiva','Mensagem beta exclusiva','b105-beta-exclusiva',
  null,'2026-08-03T12:40:00Z'::timestamptz
from b105_fixture;

select has_function(
  'public','get_my_student_notifications',array['integer','integer'],
  'public notification pagination RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_my_student_notifications(integer,integer)',
    'EXECUTE'
  ),
  'authenticated may execute notification pagination RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_my_student_notifications(integer,integer)',
    'EXECUTE'
  ),
  'anonymous cannot execute notification pagination RPC'
);
select set_config('request.jwt.claims','{}',true);
select throws_ok(
  $$select public.get_my_student_notifications(20,0)$$,
  '42501','AUTH_REQUIRED',
  'notification pagination requires authentication'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select alpha_id from b105_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_my_student_notifications(1,0)->>'total')::integer,
  3,
  'pagination total remains complete'
);
select is(
  (public.get_my_student_notifications(1,0)->>'unread_count')::integer,
  2,
  'unread total remains complete'
);
select is(
  jsonb_array_length(public.get_my_student_notifications(1,0)->'notifications'),
  1,
  'pagination returns one notification'
);
select is(
  public.get_my_student_notifications(1,0)->'notifications'->0->>'title',
  'Alpha recente',
  'first notification page starts with newest item'
);
select is(
  public.get_my_student_notifications(1,1)->'notifications'->0->>'title',
  'Alpha intermediária',
  'notification offset returns second item'
);
select isnt(
  public.get_my_student_notifications(1,0)->'notifications'->0->>'id',
  public.get_my_student_notifications(1,1)->'notifications'->0->>'id',
  'adjacent notification pages do not overlap'
);
select is(
  public.get_my_student_notifications(1,2)->'notifications'->0->>'title',
  'Alpha antiga',
  'second notification offset returns oldest item'
);
select is(
  jsonb_array_length(public.get_my_student_notifications(1,99)->'notifications'),
  0,
  'offset beyond the history returns an empty page'
);
select is(
  (public.get_my_student_notifications(1,99)->>'total')::integer,
  3,
  'total remains independent from notification offset'
);
select is(
  jsonb_array_length(public.get_my_student_notifications(0,0)->'notifications'),
  1,
  'zero notification limit is clamped to one'
);
select is(
  public.get_my_student_notifications(1,-10)->'notifications'->0->>'title',
  'Alpha recente',
  'negative notification offset is clamped to zero'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select beta_id from b105_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_my_student_notifications(20,0)->>'total')::integer,
  1,
  'student sees only own notification total'
);
select is(
  public.get_my_student_notifications(20,0)->'notifications'->0->>'title',
  'Beta exclusiva',
  'student sees only own notification page'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select alpha_id from b105_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.mark_all_my_student_notifications_read()->>'updated')::integer,
  2,
  'mark all updates unread notifications across all pages'
);
select is(
  (public.get_my_student_notifications(1,0)->>'unread_count')::integer,
  0,
  'unread total refreshes independently from page size'
);

select * from finish();
rollback;
