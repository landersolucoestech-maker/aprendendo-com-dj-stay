begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create temporary table b107_fixture (
  alpha_id uuid not null,
  beta_id uuid not null,
  alpha_old_intent_id uuid not null,
  alpha_middle_intent_id uuid not null,
  alpha_recent_intent_id uuid not null,
  beta_intent_id uuid not null
) on commit drop;

insert into b107_fixture values (
  'b1070000-0000-4000-8000-000000000001',
  'b1070000-0000-4000-8000-000000000002',
  'b1070000-0000-4000-8000-000000000101',
  'b1070000-0000-4000-8000-000000000102',
  'b1070000-0000-4000-8000-000000000103',
  'b1070000-0000-4000-8000-000000000104'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  alpha_id,'authenticated','authenticated','alpha-b107@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Alpha B107"}'::jsonb,
  '2026-08-03T14:00:00Z'::timestamptz,'2026-08-03T14:00:00Z'::timestamptz
from b107_fixture
union all
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  beta_id,'authenticated','authenticated','beta-b107@example.test','',now(),
  '{}'::jsonb,'{"full_name":"Aluno Beta B107"}'::jsonb,
  '2026-08-03T14:01:00Z'::timestamptz,'2026-08-03T14:01:00Z'::timestamptz
from b107_fixture;

insert into public.checkout_intents(
  id,user_id,subject_type,subject_id,status,amount_cents,currency_code,
  title_snapshot,item_snapshot,idempotency_key,created_at,updated_at
)
select
  alpha_old_intent_id,alpha_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000201'::uuid,
  'prepared'::public.checkout_intent_status,10000,'BRL','Pedido Alpha Antigo',
  '{}'::jsonb,'b1070000-0000-4000-8000-000000000301'::uuid,
  '2026-08-03T14:10:00Z'::timestamptz,'2026-08-03T14:10:00Z'::timestamptz
from b107_fixture
union all
select
  alpha_middle_intent_id,alpha_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000202'::uuid,
  'prepared'::public.checkout_intent_status,20000,'BRL','Pedido Alpha Intermediário',
  '{}'::jsonb,'b1070000-0000-4000-8000-000000000302'::uuid,
  '2026-08-03T14:20:00Z'::timestamptz,'2026-08-03T14:20:00Z'::timestamptz
from b107_fixture
union all
select
  alpha_recent_intent_id,alpha_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000203'::uuid,
  'prepared'::public.checkout_intent_status,30000,'BRL','Pedido Alpha Recente',
  '{}'::jsonb,'b1070000-0000-4000-8000-000000000303'::uuid,
  '2026-08-03T14:30:00Z'::timestamptz,'2026-08-03T14:30:00Z'::timestamptz
from b107_fixture
union all
select
  beta_intent_id,beta_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000204'::uuid,
  'prepared'::public.checkout_intent_status,40000,'BRL','Pedido Beta Exclusivo',
  '{}'::jsonb,'b1070000-0000-4000-8000-000000000304'::uuid,
  '2026-08-03T14:40:00Z'::timestamptz,'2026-08-03T14:40:00Z'::timestamptz
from b107_fixture;

insert into public.payment_orders(
  id,user_id,checkout_intent_id,subject_type,subject_id,status,
  amount_cents,currency_code,title_snapshot,item_snapshot,payment_confirmed_at,
  created_at,updated_at
)
select
  'b1070000-0000-4000-8000-000000000401'::uuid,
  alpha_id,alpha_old_intent_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000201'::uuid,
  'refunded'::public.payment_order_status,10000,'BRL','Pedido Alpha Antigo',
  '{}'::jsonb,'2026-08-03T14:11:00Z'::timestamptz,
  '2026-08-03T14:10:00Z'::timestamptz,'2026-08-03T14:11:00Z'::timestamptz
from b107_fixture
union all
select
  'b1070000-0000-4000-8000-000000000402'::uuid,
  alpha_id,alpha_middle_intent_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000202'::uuid,
  'paid'::public.payment_order_status,20000,'BRL','Pedido Alpha Intermediário',
  '{}'::jsonb,'2026-08-03T14:21:00Z'::timestamptz,
  '2026-08-03T14:20:00Z'::timestamptz,'2026-08-03T14:21:00Z'::timestamptz
from b107_fixture
union all
select
  'b1070000-0000-4000-8000-000000000403'::uuid,
  alpha_id,alpha_recent_intent_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000203'::uuid,
  'payment_pending'::public.payment_order_status,30000,'BRL','Pedido Alpha Recente',
  '{}'::jsonb,null,
  '2026-08-03T14:30:00Z'::timestamptz,'2026-08-03T14:30:00Z'::timestamptz
from b107_fixture
union all
select
  'b1070000-0000-4000-8000-000000000404'::uuid,
  beta_id,beta_intent_id,'course'::public.checkout_subject_type,
  'b1070000-0000-4000-8000-000000000204'::uuid,
  'paid'::public.payment_order_status,40000,'BRL','Pedido Beta Exclusivo',
  '{}'::jsonb,'2026-08-03T14:41:00Z'::timestamptz,
  '2026-08-03T14:40:00Z'::timestamptz,'2026-08-03T14:41:00Z'::timestamptz
from b107_fixture;

select has_function(
  'public','get_my_payment_history',array['integer','integer'],
  'public payment history pagination RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated','public.get_my_payment_history(integer,integer)','EXECUTE'
  ),
  'authenticated may execute payment history RPC'
);
select ok(
  not has_function_privilege(
    'anon','public.get_my_payment_history(integer,integer)','EXECUTE'
  ),
  'anonymous cannot execute payment history RPC'
);
select set_config('request.jwt.claims','{}',true);
select throws_ok(
  $$select public.get_my_payment_history(20,0)$$,
  '42501','AUTH_REQUIRED',
  'payment history requires authentication'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select alpha_id from b107_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_my_payment_history(1,0)->>'total')::integer,
  3,
  'payment history total remains complete'
);
select is(
  (public.get_my_payment_history(1,0)->'summary'->>'total_orders')::integer,
  3,
  'payment summary total remains complete'
);
select is(
  (public.get_my_payment_history(1,0)->'summary'->>'pending_orders')::integer,
  1,
  'payment summary reports pending orders'
);
select is(
  (public.get_my_payment_history(1,0)->'summary'->>'paid_orders')::integer,
  1,
  'payment summary reports paid orders'
);
select is(
  (public.get_my_payment_history(1,0)->'summary'->>'refunded_orders')::integer,
  1,
  'payment summary reports refunded orders'
);
select is(
  jsonb_array_length(public.get_my_payment_history(1,0)->'orders'),
  1,
  'payment history pagination returns one order'
);
select is(
  public.get_my_payment_history(1,0)->'orders'->0->>'title',
  'Pedido Alpha Recente',
  'first payment page starts with newest order'
);
select is(
  public.get_my_payment_history(1,1)->'orders'->0->>'title',
  'Pedido Alpha Intermediário',
  'payment offset returns second order'
);
select isnt(
  public.get_my_payment_history(1,0)->'orders'->0->>'id',
  public.get_my_payment_history(1,1)->'orders'->0->>'id',
  'adjacent payment pages do not overlap'
);
select is(
  public.get_my_payment_history(1,2)->'orders'->0->>'title',
  'Pedido Alpha Antigo',
  'second payment offset returns oldest order'
);
select is(
  jsonb_array_length(public.get_my_payment_history(1,99)->'orders'),
  0,
  'offset beyond payment history returns empty page'
);
select is(
  (public.get_my_payment_history(1,99)->>'total')::integer,
  3,
  'payment total remains independent from offset'
);
select is(
  jsonb_array_length(public.get_my_payment_history(0,0)->'orders'),
  1,
  'zero payment limit is clamped to one'
);
select is(
  public.get_my_payment_history(1,-10)->'orders'->0->>'title',
  'Pedido Alpha Recente',
  'negative payment offset is clamped to zero'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub',(select beta_id from b107_fixture),
    'role','authenticated'
  )::text,
  true
);
select is(
  (public.get_my_payment_history(20,0)->>'total')::integer,
  1,
  'student sees only own payment total'
);
select is(
  public.get_my_payment_history(20,0)->'orders'->0->>'title',
  'Pedido Beta Exclusivo',
  'student sees only own payment page'
);

select * from finish();
rollback;
