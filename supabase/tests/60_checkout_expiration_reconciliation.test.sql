begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

select has_function('private','checkout_order_is_financially_terminal',array['payment_order_status'],'terminal order helper exists');
select has_function('private','reconcile_checkout_intent_expiration',array['uuid','uuid'],'private expiration reconciler exists');
select has_function('private','expire_due_checkout_intents',array['integer'],'private expiration batch exists');
select has_function('public','reconcile_my_checkout_return',array['uuid'],'authenticated reconciliation RPC exists');
select has_function('public','expire_due_checkout_intents',array['integer'],'service expiration RPC exists');
select ok(not has_function_privilege('anon','public.reconcile_my_checkout_return(uuid)','EXECUTE'),'anonymous cannot reconcile a checkout');
select ok(has_function_privilege('authenticated','public.reconcile_my_checkout_return(uuid)','EXECUTE'),'authenticated user can reconcile their checkout');
select ok(not has_function_privilege('authenticated','public.expire_due_checkout_intents(integer)','EXECUTE'),'authenticated user cannot run the expiration batch');
select ok(has_function_privilege('service_role','public.expire_due_checkout_intents(integer)','EXECUTE'),'service role can run the expiration batch');
select ok(private.checkout_order_is_financially_terminal('paid'),'paid order is financially terminal');
select ok(private.checkout_order_is_financially_terminal('refunded'),'refunded order is financially terminal');
select ok(not private.checkout_order_is_financially_terminal('payment_pending'),'pending order is not financially terminal');

insert into auth.users(id,email) values
 ('b9100000-0000-4000-8000-000000000101','b91-owner@example.test'),
 ('b9100000-0000-4000-8000-000000000102','b91-other@example.test');

insert into public.courses (
  id,title,slug,status,short_description,description,category,language_code,level,
  objectives,prerequisites,price_amount,currency_code,release_mode,published_at
) values (
  'b9100000-0000-4000-8000-000000000201','Curso Expiração B91','curso-expiracao-b91','published',
  'Curso para validar expiração.','Curso usado nos testes de reconciliação de checkout.','Produção musical','pt-BR','beginner',
  array['Validar vencimento transacional'],array[]::text[],149.90,'BRL','immediate',statement_timestamp()
);

insert into public.checkout_intents (
  id,user_id,subject_type,subject_id,status,provider,provider_checkout_id,provider_checkout_url,
  amount_cents,currency_code,title_snapshot,item_snapshot,idempotency_key,expires_at
) values
(
  'b9100000-0000-4000-8000-000000000301','b9100000-0000-4000-8000-000000000101','course',
  'b9100000-0000-4000-8000-000000000201','checkout_created','asaas','checkout-b91-due',
  'https://sandbox.asaas.com/checkout/b91-due',14990,'BRL','Curso Expiração B91',
  jsonb_build_object('subject_type','course','subject_id','b9100000-0000-4000-8000-000000000201','amount_cents',14990,'currency_code','BRL'),
  'b9100000-0000-4000-8000-000000000401',statement_timestamp()-interval '1 minute'
),
(
  'b9100000-0000-4000-8000-000000000302','b9100000-0000-4000-8000-000000000101','course',
  'b9100000-0000-4000-8000-000000000201','checkout_created','asaas','checkout-b91-future',
  'https://sandbox.asaas.com/checkout/b91-future',14990,'BRL','Curso Expiração B91',
  jsonb_build_object('subject_type','course','subject_id','b9100000-0000-4000-8000-000000000201','amount_cents',14990,'currency_code','BRL'),
  'b9100000-0000-4000-8000-000000000402',statement_timestamp()+interval '30 minutes'
),
(
  'b9100000-0000-4000-8000-000000000303','b9100000-0000-4000-8000-000000000101','course',
  'b9100000-0000-4000-8000-000000000201','checkout_created','asaas','checkout-b91-paid',
  'https://sandbox.asaas.com/checkout/b91-paid',14990,'BRL','Curso Expiração B91',
  jsonb_build_object('subject_type','course','subject_id','b9100000-0000-4000-8000-000000000201','amount_cents',14990,'currency_code','BRL'),
  'b9100000-0000-4000-8000-000000000403',statement_timestamp()-interval '1 minute'
),
(
  'b9100000-0000-4000-8000-000000000304','b9100000-0000-4000-8000-000000000102','course',
  'b9100000-0000-4000-8000-000000000201','checkout_created','asaas','checkout-b91-other',
  'https://sandbox.asaas.com/checkout/b91-other',14990,'BRL','Curso Expiração B91',
  jsonb_build_object('subject_type','course','subject_id','b9100000-0000-4000-8000-000000000201','amount_cents',14990,'currency_code','BRL'),
  'b9100000-0000-4000-8000-000000000404',statement_timestamp()-interval '1 minute'
),
(
  'b9100000-0000-4000-8000-000000000305','b9100000-0000-4000-8000-000000000101','course',
  'b9100000-0000-4000-8000-000000000201','checkout_created','asaas','checkout-b91-batch',
  'https://sandbox.asaas.com/checkout/b91-batch',14990,'BRL','Curso Expiração B91',
  jsonb_build_object('subject_type','course','subject_id','b9100000-0000-4000-8000-000000000201','amount_cents',14990,'currency_code','BRL'),
  'b9100000-0000-4000-8000-000000000405',statement_timestamp()-interval '1 minute'
);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.payment_orders
set status='paid', payment_confirmed_at=statement_timestamp()
where checkout_intent_id='b9100000-0000-4000-8000-000000000303';
update public.payment_attempts
set status='confirmed', billing_type='pix', provider_status='CONFIRMED', confirmed_at=statement_timestamp()
where checkout_intent_id='b9100000-0000-4000-8000-000000000303';
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b9100000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9100000-0000-4000-8000-000000000801","is_anonymous":false}',true);

select is(public.reconcile_my_checkout_return('b9100000-0000-4000-8000-000000000301')->>'intent_status','expired','due checkout becomes expired from server time');
select is(public.reconcile_my_checkout_return('b9100000-0000-4000-8000-000000000301') #>> '{order,status}','expired','due order becomes expired');
select is(public.reconcile_my_checkout_return('b9100000-0000-4000-8000-000000000301') #>> '{attempt,status}','expired','due payment attempt becomes expired');
select is((select count(*)::integer from public.checkout_intent_events where checkout_intent_id='b9100000-0000-4000-8000-000000000301' and event_type='expired'),1,'expiration is audited once');
select is(public.reconcile_my_checkout_return('b9100000-0000-4000-8000-000000000301')->>'intent_status','expired','reconciliation is idempotent');
select is((select count(*)::integer from public.checkout_intent_events where checkout_intent_id='b9100000-0000-4000-8000-000000000301' and event_type='expired'),1,'idempotent reconciliation does not duplicate audit events');
select is(public.reconcile_my_checkout_return('b9100000-0000-4000-8000-000000000302')->>'intent_status','checkout_created','future checkout remains active');
select is((public.reconcile_my_checkout_return('b9100000-0000-4000-8000-000000000304')->>'found')::boolean,false,'another user checkout remains indistinguishable from missing');
select is((select status::text from public.checkout_intents where id='b9100000-0000-4000-8000-000000000304'),'checkout_created','another user cannot mutate checkout expiration');
reset role;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select is(
  private.claim_checkout_provider_request('b9100000-0000-4000-8000-000000000303','b9100000-0000-4000-8000-000000000101',120)->>'reason',
  'CHECKOUT_ORDER_TERMINAL',
  'paid order cannot create another provider checkout'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b9100000-0000-4000-8000-000000000303'),'paid','terminal claim protection preserves the paid order');
select is((select status::text from public.checkout_intents where id='b9100000-0000-4000-8000-000000000303'),'checkout_created','terminal claim protection does not rewrite the paid intent');
select is(
  private.claim_checkout_provider_request('b9100000-0000-4000-8000-000000000301','b9100000-0000-4000-8000-000000000101',120)->>'reason',
  'CHECKOUT_INTENT_NOT_RETRYABLE',
  'expired intent cannot be reclaimed with the same idempotency key'
);
select is(public.expire_due_checkout_intents(1),1,'service batch expires one due checkout within the requested limit');
select is((select status::text from public.checkout_intents where id='b9100000-0000-4000-8000-000000000305'),'expired','service batch persists expiration');
select throws_ok(
  $$select public.expire_due_checkout_intents(0)$$,
  '22023',
  'CHECKOUT_EXPIRATION_LIMIT_INVALID',
  'service batch rejects an invalid limit'
);
reset role;

select * from finish();
rollback;
