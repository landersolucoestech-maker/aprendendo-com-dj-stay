begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users(id,email) values
 ('b1800000-0000-4000-8000-000000000201','b18-payment-owner@example.test'),
 ('b1800000-0000-4000-8000-000000000202','b18-payment-other@example.test'),
 ('b1800000-0000-4000-8000-000000000203','b18-payment-admin@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b1800000-0000-4000-8000-000000000203';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1800000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b1840000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select set_config(
  'test.b18_webhook_course_id',
  (
    select id::text
    from public.create_course(
      jsonb_build_object(
        'title','Curso Webhook B18',
        'slug','curso-webhook-b18',
        'short_description','Curso usado para validar eventos financeiros.',
        'description','Fixture de curso para o teste de webhook e fulfillment.',
        'category','Produção musical',
        'language_code','pt-BR',
        'level','beginner',
        'objectives',jsonb_build_array('Validar pagamento assíncrono'),
        'prerequisites',jsonb_build_array('Conta autenticada'),
        'price_amount',100.00,
        'currency_code','BRL',
        'completion_mode','percentage',
        'completion_required_percent',80,
        'certificate_enabled',false,
        'release_mode','immediate',
        'affiliate_eligible',false,
        'preview_enabled',false
      )
    )
  ),
  false
);
reset role;

insert into public.checkout_intents(
  id,user_id,subject_type,subject_id,status,provider,provider_checkout_id,provider_checkout_url,
  amount_cents,currency_code,title_snapshot,item_snapshot,idempotency_key,expires_at
) values (
  'b1810000-0000-4000-8000-000000000201',
  'b1800000-0000-4000-8000-000000000201',
  'course',
  current_setting('test.b18_webhook_course_id')::uuid,
  'checkout_created',
  'asaas',
  'chk_b18_webhook_001',
  'https://sandbox.asaas.com/checkout/b18-webhook',
  10000,
  'BRL',
  'Curso Webhook B18',
  jsonb_build_object(
    'subject_type','course',
    'subject_id',current_setting('test.b18_webhook_course_id'),
    'amount_cents',10000,
    'currency_code','BRL'
  ),
  'b1850000-0000-4000-8000-000000000201',
  statement_timestamp()+interval '30 minutes'
);

select is((select count(*)::integer from public.payment_orders where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),1,'checkout trigger creates one order');
select is((select count(*)::integer from public.payment_attempts where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),1,'checkout trigger creates one attempt');

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b18_created','PAYMENT_CREATED',jsonb_build_object('id','evt_b18_created','event','PAYMENT_CREATED','payment',jsonb_build_object('id','pay_b18_001','externalReference','b1810000-0000-4000-8000-000000000201','value',100.00,'billingType','PIX','status','PENDING')))$$,
 'payment created webhook is persisted'
);
select is((select status::text from public.payment_attempts where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'pending','created event marks attempt pending');
select is((select status::text from public.payment_orders where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'payment_pending','created event marks order payment pending');
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b18_received','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b18_received','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b18_001','externalReference','b1810000-0000-4000-8000-000000000201','value',100.00,'billingType','PIX','status','RECEIVED')))$$,
 'received Pix webhook confirms financial state'
);
select is((select status::text from public.payment_attempts where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'received','received event marks attempt received');
select is((select status::text from public.payment_orders where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'paid','received event marks order paid');
select is((select billing_type::text from public.payment_attempts where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'pix','Pix billing type is persisted');
select is((select provider_payment_id from public.payment_attempts where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'pay_b18_001','provider payment id is bound to the attempt');
select ok((select public.process_asaas_payment_webhook('evt_b18_received','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b18_received','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b18_001','externalReference','b1810000-0000-4000-8000-000000000201','value',100.00,'billingType','PIX','status','RECEIVED')))->>'duplicate')::boolean,'duplicate webhook is acknowledged idempotently');
select is((select count(*)::integer from public.payment_provider_events where provider_event_id in ('evt_b18_created','evt_b18_received')),2,'duplicate webhook does not create another event');
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b18_old_created','PAYMENT_CREATED',jsonb_build_object('id','evt_b18_old_created','event','PAYMENT_CREATED','payment',jsonb_build_object('id','pay_b18_001','externalReference','b1810000-0000-4000-8000-000000000201','value',100.00,'billingType','PIX','status','PENDING')))$$,
 'out-of-order old event is accepted without regression'
);
select is((select status::text from public.payment_attempts where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'received','old created event cannot regress received payment');
select ok((select public.process_asaas_payment_webhook('evt_b18_mismatch','PAYMENT_CONFIRMED',jsonb_build_object('id','evt_b18_mismatch','event','PAYMENT_CONFIRMED','payment',jsonb_build_object('id','pay_b18_001','externalReference','b1810000-0000-4000-8000-000000000201','value',99.99,'billingType','PIX','status','CONFIRMED')))->>'failed')::boolean,'snapshot mismatch is reported as failed');
select is((select status::text from public.payment_provider_events where provider_event_id='evt_b18_mismatch'),'failed','snapshot mismatch remains persisted for audit');
select is((select status::text from public.payment_orders where checkout_intent_id='b1810000-0000-4000-8000-000000000201'),'paid','invalid event cannot regress paid order');
select ok((select public.process_asaas_payment_webhook('evt_b18_conflict','PAYMENT_CONFIRMED',jsonb_build_object('id','evt_b18_conflict','event','PAYMENT_CONFIRMED','payment',jsonb_build_object('id','pay_b18_other','externalReference','b1810000-0000-4000-8000-000000000201','value',100.00,'billingType','PIX','status','CONFIRMED')))->>'failed')::boolean,'conflicting provider payment is rejected');
select is((select status::text from public.payment_provider_events where provider_event_id='evt_b18_conflict'),'failed','provider payment conflict is persisted');
select is((select count(*)::integer from public.enrollments where user_id='b1800000-0000-4000-8000-000000000201' and course_id=current_setting('test.b18_webhook_course_id')::uuid),1,'payment confirmation grants one course enrollment through B19');
select is((select count(*)::integer from public.payment_entitlements where user_id='b1800000-0000-4000-8000-000000000201' and status='active'),1,'payment confirmation creates one active entitlement');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1800000-0000-4000-8000-000000000201","role":"authenticated","session_id":"b1840000-0000-4000-8000-000000000201","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_orders),1,'owner can read own order');
select is((select count(*)::integer from public.payment_provider_events),0,'ordinary user cannot read provider events');
select throws_ok(
 $$select public.process_asaas_payment_webhook('evt_forbidden','PAYMENT_CREATED','{}'::jsonb)$$,
 '42501',null,'authenticated user cannot execute webhook processor'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1800000-0000-4000-8000-000000000202","role":"authenticated","session_id":"b1840000-0000-4000-8000-000000000202","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_orders),0,'another user cannot read the owner order');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1800000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b1840000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_provider_events),5,'administrator can audit all unique provider events');
reset role;

select * from finish();
rollback;
