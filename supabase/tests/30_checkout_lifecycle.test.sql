begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users(id,email) values
 ('b1800000-0000-4000-8000-000000000101','b18-admin@example.test'),
 ('b1800000-0000-4000-8000-000000000102','b18-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b1800000-0000-4000-8000-000000000101';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1800000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b1840000-0000-4000-8000-000000000101","is_anonymous":false}',true);
select set_config('test.b18_course_id',(select id::text from public.create_course(jsonb_build_object(
 'title','Curso Checkout B18','slug','curso-checkout-b18','short_description','Curso para validar cotação e checkout.',
 'description','Curso publicado usado pelo teste transacional da fase B18.','category','Produção musical',
 'language_code','pt-BR','level','beginner','price_amount',199.90,'promotional_price_amount',149.90,
 'currency_code','BRL','completion_mode','percentage','completion_required_percent',80,
 'certificate_enabled',false,'release_mode','immediate','affiliate_eligible',false,'preview_enabled',false
))),false);
select matches(current_setting('test.b18_course_id'),'^[0-9a-f-]{36}$','administrator creates the checkout course');
select set_config('test.b18_module_id',(select id::text from public.create_module(current_setting('test.b18_course_id')::uuid,'{"title":"Módulo B18","status":"published"}'::jsonb)),false);
select public.create_lesson(current_setting('test.b18_module_id')::uuid,'{"title":"Aula B18","status":"published","content_kind":"text","text_content":"Conteúdo validado para publicação."}'::jsonb);
select is((select status::text from public.publish_course(current_setting('test.b18_course_id')::uuid,1)),'published','course publishes before checkout');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1800000-0000-4000-8000-000000000102","role":"authenticated","session_id":"b1840000-0000-4000-8000-000000000102","is_anonymous":false}',true);
select throws_ok(
 $$insert into public.checkout_intents(user_id,subject_type,subject_id,amount_cents,currency_code,title_snapshot,item_snapshot,idempotency_key) values ('b1800000-0000-4000-8000-000000000102','course',current_setting('test.b18_course_id')::uuid,1,'BRL','Fraude','{}','b1850000-0000-4000-8000-000000000199')$$,
 '42501',null,'student cannot insert checkout directly'
);
select set_config('test.b18_intent_id',(select id::text from public.prepare_checkout_intent('course',current_setting('test.b18_course_id')::uuid,null,'b1850000-0000-4000-8000-000000000101')),false);
select matches(current_setting('test.b18_intent_id'),'^[0-9a-f-]{36}$','student prepares a server-side checkout quote');
select is((select amount_cents from public.checkout_intents where id=current_setting('test.b18_intent_id')::uuid),14990,'active promotional price is captured in cents');
select is((select item_snapshot->>'currency_code' from public.checkout_intents where id=current_setting('test.b18_intent_id')::uuid),'BRL','quote snapshot captures currency');
select is((select id::text from public.prepare_checkout_intent('course',current_setting('test.b18_course_id')::uuid,null,'b1850000-0000-4000-8000-000000000101')),current_setting('test.b18_intent_id'),'same idempotency key returns the original intent');
select is((select count(*)::integer from public.checkout_intents where user_id='b1800000-0000-4000-8000-000000000102'),1,'idempotent preparation creates one intent');
select throws_ok(
 $$select public.prepare_checkout_intent('digital_product','b1860000-0000-4000-8000-000000000101',null,'b1850000-0000-4000-8000-000000000101')$$,
 '23505',null,'idempotency key cannot be reused for another subject'
);
select throws_ok(
 $$select public.claim_checkout_provider_request(current_setting('test.b18_intent_id')::uuid,'b1800000-0000-4000-8000-000000000102',120)$$,
 '42501',null,'authenticated user cannot claim provider work'
);
reset role;

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('test.b18_claim',(select public.claim_checkout_provider_request(current_setting('test.b18_intent_id')::uuid,'b1800000-0000-4000-8000-000000000102',120)::text),false);
select ok((current_setting('test.b18_claim')::jsonb->>'claimed')::boolean,'service role claims checkout creation lease');
select is((select status::text from public.checkout_intents where id=current_setting('test.b18_intent_id')::uuid),'provider_creating','claimed intent enters provider creating state');
select is((select public.claim_checkout_provider_request(current_setting('test.b18_intent_id')::uuid,'b1800000-0000-4000-8000-000000000102',120)->>'claimed')::boolean,false,'concurrent provider claim is rejected');
select lives_ok(
 format(
  'select public.complete_checkout_provider_request(%L::uuid,%L::uuid,%L::uuid,%L,%L,statement_timestamp()+interval ''30 minutes'')',
  current_setting('test.b18_intent_id'),
  'b1800000-0000-4000-8000-000000000102',
  current_setting('test.b18_claim')::jsonb->>'request_token',
  'chk_b18_lifecycle_001',
  'https://sandbox.asaas.com/checkout/b18-lifecycle'
 ),
 'service role completes hosted checkout creation'
);
select is((select status::text from public.checkout_intents where id=current_setting('test.b18_intent_id')::uuid),'checkout_created','checkout intent records provider completion');
select is((select count(*)::integer from public.payment_orders where checkout_intent_id=current_setting('test.b18_intent_id')::uuid),1,'checkout completion creates one payment order');
select is((select count(*)::integer from public.payment_attempts where checkout_intent_id=current_setting('test.b18_intent_id')::uuid),1,'checkout completion creates one payment attempt');
select is((select amount_cents from public.payment_orders where checkout_intent_id=current_setting('test.b18_intent_id')::uuid),14990,'payment order preserves quoted amount');
select is((select count(*)::integer from public.checkout_intent_events where checkout_intent_id=current_setting('test.b18_intent_id')::uuid),3,'prepare claim and provider completion are audited');
select is((select count(*)::integer from public.enrollments where user_id='b1800000-0000-4000-8000-000000000102'),0,'checkout completion does not grant course access');
select is((select count(*)::integer from public.digital_product_accesses where user_id='b1800000-0000-4000-8000-000000000102'),0,'checkout completion does not grant product access');
reset role;

select * from finish();
rollback;
