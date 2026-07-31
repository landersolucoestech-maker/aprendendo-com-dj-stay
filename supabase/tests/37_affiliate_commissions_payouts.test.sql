begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

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
 'description','Curso publicado para testar o ciclo financeiro do programa de afiliados.','category','Produção musical','language_code','pt-BR','level','beginner',
 'objectives',jsonb_build_array('Validar comissão'),'prerequisites',jsonb_build_array('Conta autenticada'),
 'cover_asset_id','b2070000-0000-4000-8000-000000000301','thumbnail_asset_id','b2070000-0000-4000-8000-000000000302',
 'price_amount',100.00,'currency_code','BRL','completion_mode','percentage','completion_required_percent',80,
 'certificate_enabled',false,'release_mode','immediate','affiliate_eligible',true,'preview_enabled',false
))),false);
select set_config('test.b20_pay_module_id',(select id::text from public.create_module(current_setting('test.b20_pay_course_id')::uuid,'{"title":"Módulo Comissão B20","status":"published"}'::jsonb)),false);
select public.create_lesson(current_setting('test.b20_pay_module_id')::uuid,'{"title":"Aula Comissão B20","status":"published","content_kind":"text","text_content":"Conteúdo de comissão."}'::jsonb);
select public.publish_course(current_setting('test.b20_pay_course_id')::uuid,1);
select lives_ok($$select public.admin_configure_affiliate_terms('course',current_setting('test.b20_pay_course_id')::uuid,1000,30,true)$$,'admin configures ten percent commission');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select public.request_affiliate_profile('Afiliado Financeiro');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select public.admin_set_affiliate_profile_status('b2000000-0000-4000-8000-000000000302','active',null);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select set_config('test.b20_pay_link',(select code from public.create_affiliate_link('course',current_setting('test.b20_pay_course_id')::uuid,'/marketplace')),false);

reset role;
select set_config('request.jwt.claims','{"role":"anon","is_anonymous":true}',true);
set local role anon;
select public.record_affiliate_click(current_setting('test.b20_pay_link'),'b2060000-0000-4000-8000-000000000301','/marketplace','https://pay-source.test','Payment Browser');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000303","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000303","is_anonymous":false}',true);
select set_config('test.b20_pay_intent',(select id::text from public.prepare_checkout_intent_with_attribution('course',current_setting('test.b20_pay_course_id')::uuid,null,'b2050000-0000-4000-8000-000000000301','b2060000-0000-4000-8000-000000000301')),false);

reset role;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"service_role"}',true);
select set_config('test.b20_pay_claim',(private.claim_checkout_provider_request(current_setting('test.b20_pay_intent')::uuid,'b2000000-0000-4000-8000-000000000303',120)->>'request_token'),false);
select private.complete_checkout_provider_request(current_setting('test.b20_pay_intent')::uuid,'b2000000-0000-4000-8000-000000000303',current_setting('test.b20_pay_claim')::uuid,'pay-checkout-b20','https://sandbox.asaas.com/checkout/pay-b20',statement_timestamp()+interval '30 minutes');
select set_config('test.b20_pay_attempt',(select id::text from public.payment_attempts where checkout_intent_id=current_setting('test.b20_pay_intent')::uuid),false);
select private.process_asaas_payment_webhook(
  'evt-b20-pay-1',
  'PAYMENT_RECEIVED',
  jsonb_build_object('payment',jsonb_build_object(
    'id','pay-b20-1',
    'externalReference',current_setting('test.b20_pay_intent'),
    'status','RECEIVED',
    'value',100,
    'billingType','PIX'
  ))
);

select is((select count(*)::integer from public.affiliate_commissions),1,'payment creates one affiliate commission');
select is((select amount_cents from public.affiliate_commissions),1000,'commission uses frozen ten percent rate');
select is((select status::text from public.affiliate_commissions),'available','received payment makes commission available');
select is((select order_id from public.affiliate_commissions),(select id from public.payment_orders where checkout_intent_id=current_setting('test.b20_pay_intent')::uuid),'commission is linked to payment order');
select is((select count(*)::integer from public.affiliate_events where event_type='commission_accrued'),1,'commission accrual is audited');
select private.process_asaas_payment_webhook(
  'evt-b20-pay-1',
  'PAYMENT_RECEIVED',
  jsonb_build_object('payment',jsonb_build_object(
    'id','pay-b20-1',
    'externalReference',current_setting('test.b20_pay_intent'),
    'status','RECEIVED',
    'value',100,
    'billingType','PIX'
  ))
);
select is((select count(*)::integer from public.affiliate_commissions),1,'duplicate provider event does not duplicate commission');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000303","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000303","is_anonymous":false}',true);
select throws_ok(
 $$select public.admin_create_affiliate_payout('b2000000-0000-4000-8000-000000000302',array[(select id from public.affiliate_commissions)],'Tentativa do comprador')$$,
 '42501','ADMIN_REQUIRED','non-admin cannot create affiliate payout'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_pay_payout',(select id::text from public.admin_create_affiliate_payout('b2000000-0000-4000-8000-000000000302',array[(select id from public.affiliate_commissions)],'Repasse B20')),false)$$,'admin creates a payout batch');
select is((select status::text from public.affiliate_commissions),'reserved','payout creation reserves commission');
select is((select status::text from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),'created','payout starts created');
select is((select amount_cents from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),1000,'payout amount equals selected commissions');
select is((select count(*)::integer from public.affiliate_payout_items where payout_id=current_setting('test.b20_pay_payout')::uuid),1,'payout contains selected commission item');
select throws_ok(
 $$select public.admin_mark_affiliate_payout_paid(current_setting('test.b20_pay_payout')::uuid,'')$$,
 '22023','PAYOUT_EXTERNAL_REFERENCE_INVALID','paid payout requires external reference'
);
select lives_ok($$select public.admin_mark_affiliate_payout_paid(current_setting('test.b20_pay_payout')::uuid,'PIX-END-TO-END-B20')$$,'admin marks payout paid with external reference');
select is((select status::text from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),'paid','payout becomes paid');
select is((select external_reference from public.affiliate_payouts where id=current_setting('test.b20_pay_payout')::uuid),'PIX-END-TO-END-B20','external payment reference is preserved');
select is((select status::text from public.affiliate_commissions),'paid','commission becomes paid with payout');
select is((select count(*)::integer from public.affiliate_events where event_type='payout_paid'),1,'paid payout is audited');

reset role;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"service_role"}',true);
select private.process_asaas_payment_webhook(
  'evt-b20-refund-1',
  'PAYMENT_REFUNDED',
  jsonb_build_object('payment',jsonb_build_object(
    'id','pay-b20-1',
    'externalReference',current_setting('test.b20_pay_intent'),
    'status','REFUNDED',
    'value',100,
    'billingType','PIX'
  ))
);
select is((select status::text from public.affiliate_commissions),'clawback_due','refund after payout creates clawback due');
select is((select count(*)::integer from public.affiliate_events where event_type='commission_clawback_due'),1,'clawback due is audited');
select is((select count(*)::integer from public.affiliate_commissions),1,'refund preserves commission history');
select is((select count(*)::integer from public.affiliate_payouts),1,'refund preserves payout history');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000302","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select is((public.get_affiliate_portal()->'summary'->>'paid_cents')::bigint,1000::bigint,'affiliate portal reports paid amount');
select is((public.get_affiliate_portal()->'summary'->>'clawback_due_cents')::bigint,1000::bigint,'affiliate portal reports clawback debt');
select is(jsonb_array_length(public.get_affiliate_portal()->'payouts'),1,'affiliate portal exposes own payout history');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000301","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select ok((public.get_affiliate_admin_dashboard()->'summary'->>'paid_cents')::bigint>=1000,'admin dashboard includes paid totals');
select is(jsonb_array_length(public.get_affiliate_admin_dashboard()->'payouts'),1,'admin dashboard exposes payout batch');

select * from finish();
rollback;
