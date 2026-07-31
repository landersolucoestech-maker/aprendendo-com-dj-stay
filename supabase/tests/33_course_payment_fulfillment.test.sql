begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users(id,email) values
 ('b1900000-0000-4000-8000-000000000101','b19-course-admin@example.test'),
 ('b1900000-0000-4000-8000-000000000102','b19-course-student@example.test'),
 ('b1900000-0000-4000-8000-000000000103','b19-course-other@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b1900000-0000-4000-8000-000000000101';
insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values
 ('b1970000-0000-4000-8000-000000000101','b1900000-0000-4000-8000-000000000101','b1900000-0000-4000-8000-000000000101','image','published','b19-course-cover.webp','b19-course-cover.webp','webp','image/webp',2000,'b19:test:course:cover',statement_timestamp(),statement_timestamp()),
 ('b1970000-0000-4000-8000-000000000102','b1900000-0000-4000-8000-000000000101','b1900000-0000-4000-8000-000000000101','image','published','b19-course-thumbnail.webp','b19-course-thumbnail.webp','webp','image/webp',1000,'b19:test:course:thumbnail',statement_timestamp(),statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1900000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b1940000-0000-4000-8000-000000000101","is_anonymous":false}',true);
select set_config('test.b19_course_id',(select id::text from public.create_course(jsonb_build_object(
 'title','Curso Fulfillment B19','slug','curso-fulfillment-b19-test','short_description','Curso para validar fulfillment atômico.',
 'description','Curso publicado para os testes transacionais da fase B19.','category','Produção musical','language_code','pt-BR','level','beginner',
 'objectives',jsonb_build_array('Validar acesso transacional'),'prerequisites',jsonb_build_array('Conta autenticada'),
 'cover_asset_id','b1970000-0000-4000-8000-000000000101','thumbnail_asset_id','b1970000-0000-4000-8000-000000000102',
 'price_amount',100.00,'currency_code','BRL','completion_mode','percentage','completion_required_percent',80,
 'certificate_enabled',false,'release_mode','immediate','affiliate_eligible',true,'preview_enabled',false
))),false);
select set_config('test.b19_module_id',(select id::text from public.create_module(current_setting('test.b19_course_id')::uuid,'{"title":"Módulo B19","status":"published"}'::jsonb)),false);
select public.create_lesson(current_setting('test.b19_module_id')::uuid,'{"title":"Aula B19","status":"published","content_kind":"text","text_content":"Conteúdo de fulfillment."}'::jsonb);
select public.publish_course(current_setting('test.b19_course_id')::uuid,1);
reset role;

insert into public.checkout_intents(
 id,user_id,subject_type,subject_id,status,provider,provider_checkout_id,provider_checkout_url,
 amount_cents,currency_code,title_snapshot,item_snapshot,idempotency_key,expires_at
) values (
 'b1910000-0000-4000-8000-000000000101','b1900000-0000-4000-8000-000000000102','course',current_setting('test.b19_course_id')::uuid,
 'checkout_created','asaas','chk_b19_course_001','https://sandbox.asaas.com/checkout/b19-course',10000,'BRL','Curso Fulfillment B19',
 jsonb_build_object('subject_type','course','subject_id',current_setting('test.b19_course_id'),'amount_cents',10000,'currency_code','BRL'),
 'b1950000-0000-4000-8000-000000000101',statement_timestamp()+interval '30 minutes'
);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_course_paid','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b19_course_paid','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','RECEIVED')))$$,
 'paid course event completes atomically'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'paid','course order becomes paid');
select is((select status::text from public.payment_attempts where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'received','course payment attempt becomes received');
select is((select status::text from public.enrollments where user_id='b1900000-0000-4000-8000-000000000102' and course_id=current_setting('test.b19_course_id')::uuid),'active','paid course grants active enrollment');
select is((select source::text from public.enrollments where user_id='b1900000-0000-4000-8000-000000000102' and course_id=current_setting('test.b19_course_id')::uuid),'purchase','course enrollment records purchase source');
select is((select status::text from public.payment_entitlements where order_id=(select id from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000101')),'active','course entitlement starts active');
select ok((select controls_access from public.payment_entitlements where order_id=(select id from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000101')),'course purchase controls its granted access');
select is((select count(*)::integer from public.payment_entitlement_events where event_type='granted'),1,'course grant is audited once');
select is((select count(*)::integer from public.commission_adjustment_events where kind='accrue'),1,'paid course emits one commission accrual signal');
select ok((select public.process_asaas_payment_webhook('evt_b19_course_paid','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b19_course_paid','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','RECEIVED')))->>'duplicate')::boolean,'duplicate paid event is idempotent');
select is((select count(*)::integer from public.payment_entitlements),1,'duplicate event does not duplicate entitlement');

select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_course_cb','PAYMENT_CHARGEBACK_REQUESTED',jsonb_build_object('id','evt_b19_course_cb','event','PAYMENT_CHARGEBACK_REQUESTED','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','CHARGEBACK_REQUESTED')))$$,
 'chargeback request is processed'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'chargeback_pending','course order enters chargeback pending');
select is((select status::text from public.payment_attempts where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'chargeback_pending','course attempt enters chargeback pending');
select is((select status::text from public.enrollments where user_id='b1900000-0000-4000-8000-000000000102' and course_id=current_setting('test.b19_course_id')::uuid),'suspended','chargeback suspends enrollment');
select is((select status::text from public.payment_entitlements),'suspended','chargeback suspends entitlement');
select is((select count(*)::integer from public.commission_adjustment_events where kind='hold'),1,'chargeback emits one commission hold signal');
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_course_dispute','PAYMENT_AWAITING_CHARGEBACK_REVERSAL',jsonb_build_object('id','evt_b19_course_dispute','event','PAYMENT_AWAITING_CHARGEBACK_REVERSAL','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','CHARGEBACK_DISPUTE')))$$,
 'won dispute awaiting reversal remains pending until financial confirmation'
);
select is((select status::text from public.payment_entitlements),'suspended','awaiting reversal does not restore access early');
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_course_restored','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b19_course_restored','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','RECEIVED')))$$,
 'conclusive received event restores won chargeback'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'chargeback_won','course order records won chargeback');
select is((select status::text from public.payment_attempts where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'chargeback_won','course attempt records won chargeback');
select is((select status::text from public.enrollments where user_id='b1900000-0000-4000-8000-000000000102' and course_id=current_setting('test.b19_course_id')::uuid),'active','won chargeback restores enrollment');
select is((select status::text from public.payment_entitlements),'active','won chargeback restores entitlement');
select is((select count(*)::integer from public.payment_entitlement_events where event_type='restored'),1,'course restoration is audited once');
select is((select count(*)::integer from public.commission_adjustment_events where kind='restore'),1,'won chargeback emits commission restore signal');

select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_course_cb_again','PAYMENT_CHARGEBACK_REQUESTED',jsonb_build_object('id','evt_b19_course_cb_again','event','PAYMENT_CHARGEBACK_REQUESTED','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','CHARGEBACK_REQUESTED')))$$,
 'second chargeback request suspends restored access'
);
select is((select status::text from public.payment_entitlements),'suspended','second chargeback suspends entitlement again');
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_course_lost','PAYMENT_REFUNDED',jsonb_build_object('id','evt_b19_course_lost','event','PAYMENT_REFUNDED','payment',jsonb_build_object('id','pay_b19_course_001','externalReference','b1910000-0000-4000-8000-000000000101','value',100.00,'billingType','PIX','status','REFUNDED')))$$,
 'refunded event concludes lost chargeback'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000101'),'chargeback_lost','course order records lost chargeback');
select is((select status::text from public.enrollments where user_id='b1900000-0000-4000-8000-000000000102' and course_id=current_setting('test.b19_course_id')::uuid),'revoked','lost chargeback revokes enrollment');
select is((select status::text from public.payment_entitlements),'revoked','lost chargeback revokes entitlement');
select is((select count(*)::integer from public.commission_adjustment_events where kind='reverse'),1,'lost chargeback emits commission reversal signal');
select is((select array_agg(event_type::text order by created_at) from public.payment_entitlement_events),array['granted','suspended','restored','suspended','revoked']::text[],'entitlement history preserves every transition');
select ok((select count(*) from public.enrollment_events)>=5,'enrollment lifecycle history is preserved');
select is((select count(*)::integer from public.payment_entitlements),1,'revocation preserves the entitlement row');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1900000-0000-4000-8000-000000000102","role":"authenticated","session_id":"b1940000-0000-4000-8000-000000000102","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_entitlements),1,'owner can read revoked entitlement history');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1900000-0000-4000-8000-000000000103","role":"authenticated","session_id":"b1940000-0000-4000-8000-000000000103","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_entitlements),0,'another student cannot read entitlement history');
reset role;

select * from finish();
rollback;
