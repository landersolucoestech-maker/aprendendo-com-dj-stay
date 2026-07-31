begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users(id,email) values
 ('b1900000-0000-4000-8000-000000000201','b19-product-admin@example.test'),
 ('b1900000-0000-4000-8000-000000000202','b19-product-buyer@example.test'),
 ('b1900000-0000-4000-8000-000000000203','b19-product-other@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b1900000-0000-4000-8000-000000000201';
insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,published_at)
values
 ('b1980000-0000-4000-8000-000000000201','b1900000-0000-4000-8000-000000000201','b1900000-0000-4000-8000-000000000201','digital_product','published','b19-product.zip','b19-product.zip','zip','application/zip',4096,'b19:test:product:file',statement_timestamp()),
 ('b1980000-0000-4000-8000-000000000202','b1900000-0000-4000-8000-000000000201','b1900000-0000-4000-8000-000000000201','image','published','b19-product-cover.png','b19-product-cover.png','png','image/png',2048,'b19:test:product:cover',statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1900000-0000-4000-8000-000000000201","role":"authenticated","session_id":"b1940000-0000-4000-8000-000000000201","is_anonymous":false}',true);
select public.create_digital_product(jsonb_build_object(
 'title','Pack Fulfillment B19','slug','pack-fulfillment-b19-test','short_description','Produto para validar fulfillment.',
 'description','Produto digital usado nos testes transacionais B19.','cover_asset_id','b1980000-0000-4000-8000-000000000202',
 'price_amount',59.90,'currency_code','BRL','affiliate_eligible',true
));
select public.create_digital_product_license(
 (select id from public.digital_products where slug='pack-fulfillment-b19-test'),
 jsonb_build_object('kind','commercial','title','Licença comercial B19','terms_text','Licença comercial individual, sem redistribuição dos arquivos originais.','is_default',true)
);
select public.publish_digital_product_license((select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-fulfillment-b19-test')));
select public.attach_digital_product_deliverable(
 (select id from public.digital_products where slug='pack-fulfillment-b19-test'),
 'b1980000-0000-4000-8000-000000000201',
 '{"title":"Pack Fulfillment B19","position":0,"required":true}'::jsonb
);
select public.publish_digital_product((select id from public.digital_products where slug='pack-fulfillment-b19-test'),4);
reset role;

select set_config('test.b19_product_id',(select id::text from public.digital_products where slug='pack-fulfillment-b19-test'),false);
select set_config('test.b19_license_id',(select id::text from public.digital_product_licenses where product_id=current_setting('test.b19_product_id')::uuid and is_default),false);
insert into public.checkout_intents(
 id,user_id,subject_type,subject_id,license_id,status,provider,provider_checkout_id,provider_checkout_url,
 amount_cents,currency_code,title_snapshot,item_snapshot,idempotency_key,expires_at
) values (
 'b1910000-0000-4000-8000-000000000201','b1900000-0000-4000-8000-000000000202','digital_product',current_setting('test.b19_product_id')::uuid,current_setting('test.b19_license_id')::uuid,
 'checkout_created','asaas','chk_b19_product_001','https://sandbox.asaas.com/checkout/b19-product',5990,'BRL','Pack Fulfillment B19',
 jsonb_build_object(
   'subject_type','digital_product','subject_id',current_setting('test.b19_product_id'),'amount_cents',5990,'currency_code','BRL',
   'license',private.digital_product_license_snapshot(current_setting('test.b19_license_id')::uuid)
 ),
 'b1950000-0000-4000-8000-000000000201',statement_timestamp()+interval '30 minutes'
);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_product_paid','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b19_product_paid','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b19_product_001','externalReference','b1910000-0000-4000-8000-000000000201','value',59.90,'billingType','PIX','status','RECEIVED')))$$,
 'paid product event completes atomically'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201'),'paid','product order becomes paid');
select is((select status::text from public.digital_product_accesses where source='purchase' and source_reference=(select id::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201')),'active','paid product grants active access');
select is((select source::text from public.digital_product_accesses where source_reference=(select id::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201')),'purchase','product access records purchase source');
select is((select source_reference from public.digital_product_accesses where source_reference=(select id::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201')),(select id::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201'),'product access references its payment order');
select ok((select access.license_snapshot=orders.item_snapshot->'license' from public.digital_product_accesses access join public.payment_orders orders on access.source_reference=orders.id::text where orders.checkout_intent_id='b1910000-0000-4000-8000-000000000201'),'product access preserves exact license snapshot');
select is((select status::text from public.payment_entitlements),'active','product entitlement starts active');
select is((select count(*)::integer from public.payment_entitlement_events where event_type='granted'),1,'product grant is audited once');
select is((select count(*)::integer from public.commission_adjustment_events where kind='accrue'),1,'paid product emits commission accrual signal');
select ok((select public.process_asaas_payment_webhook('evt_b19_product_paid','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b19_product_paid','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b19_product_001','externalReference','b1910000-0000-4000-8000-000000000201','value',59.90,'billingType','PIX','status','RECEIVED')))->>'duplicate')::boolean,'duplicate product payment is idempotent');
select is((select count(*)::integer from public.digital_product_accesses where source='purchase'),1,'duplicate payment does not duplicate product access');

select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_product_cb','PAYMENT_CHARGEBACK_REQUESTED',jsonb_build_object('id','evt_b19_product_cb','event','PAYMENT_CHARGEBACK_REQUESTED','payment',jsonb_build_object('id','pay_b19_product_001','externalReference','b1910000-0000-4000-8000-000000000201','value',59.90,'billingType','PIX','status','CHARGEBACK_REQUESTED')))$$,
 'product chargeback request is processed'
);
select is((select status::text from public.digital_product_accesses where source='purchase'),'suspended','chargeback suspends product access');
select is((select status::text from public.payment_entitlements),'suspended','chargeback suspends product entitlement');
select is((select count(*)::integer from public.commission_adjustment_events where kind='hold'),1,'product chargeback emits commission hold signal');

select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_product_restored','PAYMENT_RECEIVED',jsonb_build_object('id','evt_b19_product_restored','event','PAYMENT_RECEIVED','payment',jsonb_build_object('id','pay_b19_product_001','externalReference','b1910000-0000-4000-8000-000000000201','value',59.90,'billingType','PIX','status','RECEIVED')))$$,
 'conclusive product event restores won chargeback'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201'),'chargeback_won','product order records won chargeback');
select is((select status::text from public.digital_product_accesses where source='purchase'),'active','won chargeback restores product access');
select is((select status::text from public.payment_entitlements),'active','won chargeback restores product entitlement');
select is((select count(*)::integer from public.payment_entitlement_events where event_type='restored'),1,'product restoration is audited once');

select lives_ok(
 $$select public.process_asaas_payment_webhook('evt_b19_product_refund','PAYMENT_REFUNDED',jsonb_build_object('id','evt_b19_product_refund','event','PAYMENT_REFUNDED','payment',jsonb_build_object('id','pay_b19_product_001','externalReference','b1910000-0000-4000-8000-000000000201','value',59.90,'billingType','PIX','status','REFUNDED')))$$,
 'refunded product event revokes access'
);
select is((select status::text from public.payment_orders where checkout_intent_id='b1910000-0000-4000-8000-000000000201'),'chargeback_lost','product order records lost chargeback');
select is((select status::text from public.digital_product_accesses where source='purchase'),'revoked','refund revokes product access');
select is((select status::text from public.payment_entitlements),'revoked','refund revokes product entitlement');
select is((select array_agg(event_type::text order by created_at) from public.payment_entitlement_events),array['granted','suspended','restored','revoked']::text[],'product entitlement history preserves every transition');
select is((select array_agg(kind::text order by created_at) from public.commission_adjustment_events),array['accrue','hold','restore','reverse']::text[],'product commission signals preserve financial sequence');
select is((select count(*)::integer from public.digital_product_accesses where source='purchase'),1,'revocation preserves product access history row');
select ok((select access.license_snapshot=orders.item_snapshot->'license' from public.digital_product_accesses access join public.payment_orders orders on access.source_reference=orders.id::text where orders.checkout_intent_id='b1910000-0000-4000-8000-000000000201'),'revocation preserves licensed terms');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1900000-0000-4000-8000-000000000202","role":"authenticated","session_id":"b1940000-0000-4000-8000-000000000202","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_entitlements),1,'buyer can read product entitlement history');
select is((select count(*)::integer from public.commission_adjustment_events),0,'buyer cannot read commission adjustment signals');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1900000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b1940000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select is((select count(*)::integer from public.payment_entitlements),0,'another user cannot read product entitlement history');
reset role;

select * from finish();
rollback;
