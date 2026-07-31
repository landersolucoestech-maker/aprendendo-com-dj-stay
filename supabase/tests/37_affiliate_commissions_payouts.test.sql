begin;
create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users(id,email) values
 ('b2000000-0000-4000-8000-000000000301','b20-pay-admin@example.test'),
 ('b2000000-0000-4000-8000-000000000302','b20-pay-affiliate@example.test'),
 ('b2000000-0000-4000-8000-000000000303','b20-pay-buyer@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b2000000-0000-4000-8000-000000000301';
update public.user_roles set role='afiliado' where user_id='b2000000-0000-4000-8000-000000000302';

insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values
 ('b2070000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000301','image','published','b20-pay-cover.webp','b20-pay-cover.webp','webp','image/webp',2000,'b20:test:pay:cover:0001',statement_timestamp(),statement_timestamp()),
 ('b2070000-0000-4000-8000-000000000302','b2000000-0000-4000-8000-000000000301','b2000000-0000-4000-8000-000000000301','image','published','b20-pay-thumb.webp','b20-pay-thumb.webp','webp','image/webp',1000,'b20:test:pay:thumb:0001',statement_timestamp(),statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select set_config('test.b20_pay_course_id',(select id::text from public.create_course(jsonb_build_object(
 'title','Curso Comissão B20','slug','curso-comissao-b20-test','short_description','Curso para validar comissão e repasse.',
 'description','Curso publicado para testes financeiros do portal de afiliados B20.','category','Produção musical','language_code','pt-BR','level','beginner',
 'objectives',jsonb_build_array('Validar comissão'),'prerequisites',jsonb_build_array('Conta autenticada'),
 'cover_asset_id','b2070000-0000-4000-8000-000000000301','thumbnail_asset_id','b2070000-0000-4000-8000-000000000302',
 'price_amount',100.00,'currency_code','BRL','completion_mode','percentage','completion_required_percent',80,
 'certificate_enabled',false,'release_mode','immediate','affiliate_eligible',true,'preview_enabled',false
))),false);
select set_config('test.b20_pay_module_id',(select id::text from public.create_module(current_setting('test.b20_pay_course_id')::uuid,'{"title":"Módulo Comissão B20","status":"published"}'::jsonb)),false);
select public.create_lesson(current_setting('test.b20_pay_module_id')::uuid,'{"title":"Aula Comissão B20","status":"published","content_kind":"text","text_content":"Conteúdo financeiro."}'::jsonb);
select public.publish_course(current_setting('test.b20_pay_course_id')::uuid,1);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select lives_ok($$select public.request_affiliate_profile('Afiliado Financeiro')$$,'affiliate requests profile');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select lives_ok($$select public.admin_set_affiliate_profile_status('b2000000-0000-4000-8000-000000000302','active',null)$$,'admin activates affiliate');
select lives_ok($$select public.admin_configure_affiliate_terms('course',current_setting('test.b20_pay_course_id')::uuid,1000,30,true)$$,'admin configures ten percent commission');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_pay_link',(select code from public.create_affiliate_link('course',current_setting('test.b20_pay_course_id')::uuid,'/marketplace')),false)$$,'affiliate creates financial test link');

reset role;
set local role anon;
select ok((public.record_affiliate_click(current_setting('test.b20_pay_link'),'b2060000-0000-4000-8000-000000000301','/marketplace','https://financial.test','Financial Browser')->>'accepted')::boolean,'anonymous financial click is accepted');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000303","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000303","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_pay_intent',(select id::text from public.prepare_checkout_intent_with_attribution('course',current_setting('test.b20_pay_course_id')::uuid,null,'b2050000-0000-4000-8000-000000000301','b2060000-0000-4000-8000-000000000301')),false)$$,'buyer prepares attributed checkout');
select ok((select affiliate_attribution_id is not null from public.checkout_intents where id=current_setting('test.b20_pay_intent')::uuid),'checkout stores attribution before provider request');

reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select lives_ok($$select set_config('test.b20_pay_request_token',(public.claim_checkout_provider_request(current_setting('test.b20_pay_intent')::uuid,'b2000000-0000-4000-8000-000000000303',120)->>'request_token'),false)$$,'service role claims provider request');
select lives_ok($$select public.complete_checkout_provider_request(current_setting('test.b20_pay_intent')::uuid,'b2000000-0000-4000-8000-000000000303',current_setting('test.b20_pay_request_token')::uuid,'chk_b20_pay_001','https://sandbox.asaas.com/checkout/b20-pay',statement_timestamp()+interval '30 minutes')$$,'provider checkout completion creates order');
select ok((select affiliate_attribution_id is not null from public.payment_orders where checkout_intent_id=current_setting('test.b20_pay_intent')::uuid),'order receives checkout attribution');
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b20_pay_paid','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b20_pay_paid','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b20_pay_001','externalReference',current_setting('test.b20_pay_intent'),'value',100.00,'billingType','PIX','status','RECEIVED')))$$,
 'paid webhook processes affiliate conversion'
);
select is((select status::text from public.payment_orders where checkout_intent_id=current_setting('test.b20_pay_intent')::uuid),'paid','order becomes paid');
select is((select status::text from public.enrollments where user_id='b2000000-0000-4000-8000-000000000303' and course_id=current_setting('test.b20_pay_course_id')::uuid),'active','paid order grants course access');
select is((select status::text from public.affiliate_attributions where converted_order_id=(select id from public.payment_orders where checkout_intent_id=current_setting('test.b20_pay_intent')::uuid)),'converted','attribution becomes converted');
select is((select count(*)::integer from public.affiliate_commissions),1,'one commission is created');
select is((select commission_bps from public.affiliate_commissions),1000,'commission uses frozen ten percent rate');
select is((select basis_amount_cents from public.affiliate_commissions),10000,'commission basis equals paid order amount');
select is((select commission_amount_cents from public.affiliate_commissions),1000,'commission amount equals ten reais');
select is((select status::text from public.affiliate_commissions),'available','paid conversion makes commission available');
select ok((public.process_asaas_payment_webhook('evt_b20_pay_paid','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b20_pay_paid','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b20_pay_001','externalReference',current_setting('test.b20_pay_intent'),'value',100.00,'billingType','PIX','status','RECEIVED')))->>'duplicate')::boolean,'duplicate payment event is idempotent');
select is((select count(*)::integer from public.affiliate_commissions),1,'duplicate payment does not duplicate commission');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_pay_payout',(select id::text from public.admin_create_affiliate_payout('b2000000-0000-4000-8000-000000000302',array[(select id from public.affiliate_commissions)]::uuid[],'Repasse B20')),false)$$,'admin creates audited payout draft');
select is((select status::text from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),'draft','payout starts as draft');
select is((select amount_cents from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),1000,'payout total equals selected commission');
select is((select count(*)::integer from public.affiliate_payout_items where payout_id=current_setting('test.b20_pay_payout')::uuid),1,'payout stores exact commission item');
select is((select status::text from public.affiliate_commissions),'held','draft payout reserves commission');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select throws_ok(
 $$select public.admin_mark_affiliate_payout_paid(current_setting('test.b20_pay_payout')::uuid,'AFFILIATE-CANNOT-PAY')$$,
 '42501','ADMIN_ROLE_REQUIRED',
 'affiliate cannot mark own payout paid'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select lives_ok($$select public.admin_mark_affiliate_payout_paid(current_setting('test.b20_pay_payout')::uuid,'PIX-B20-PAYOUT-001')$$,'admin marks payout paid with external reference');
select is((select status::text from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),'paid','payout becomes paid');
select is((select external_reference from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),'PIX-B20-PAYOUT-001','payout stores external payment reference');
select is((select status::text from public.affiliate_commissions),'paid','commission becomes paid');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select is((public.get_affiliate_portal()->'summary'->>'paid_cents')::integer,1000,'affiliate portal reports paid commission');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select is((public.get_affiliate_admin_dashboard()->'summary'->>'paid_cents')::integer,1000,'admin portal reports paid commission');

reset role;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b20_pay_refund','PAYMENT_REFUNDED',jsonb_build_object('id','evt_b20_pay_refund','event','PAYMENT_REFUNDED','payment',jsonb_build_object('id','pay_b20_pay_001','externalReference',current_setting('test.b20_pay_intent'),'value',100.00,'billingType','PIX','status','REFUNDED')))$$,
 'refund after payout is processed'
);
select is((select status::text from public.payment_orders where checkout_intent_id=current_setting('test.b20_pay_intent')::uuid),'refunded','order records refund');
select is((select status::text from public.payment_entitlements),'revoked','refund revokes purchased entitlement');
select is((select status::text from public.affiliate_commissions),'paid','paid commission history is not overwritten by refund');
select ok((select (details->>'clawback_due')::boolean from public.affiliate_events where event_type='commission_reversed' order by created_at desc limit 1),'refund after payout records clawback due');

select * from finish();
rollback;