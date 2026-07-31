begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users(id,email) values
 ('b1600000-0000-4000-8000-000000000201','b16-access-admin@example.test'),
 ('b1600000-0000-4000-8000-000000000202','b16-access-student-one@example.test'),
 ('b1600000-0000-4000-8000-000000000203','b16-access-student-two@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b1600000-0000-4000-8000-000000000201';
insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,published_at)
values ('b1610000-0000-4000-8000-000000000201','b1600000-0000-4000-8000-000000000201','b1600000-0000-4000-8000-000000000201','digital_product','published','access.zip','access.zip','zip','application/zip',4096,'marketplace:access:test:file1',statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000201","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000201","is_anonymous":false}',true);
select public.create_digital_product(jsonb_build_object('title','Pack Access Test','slug','pack-access-test','short_description','Validação de acesso.','description','Produto usado para validar isolamento e revogação da fase B16.','price_amount',79.90,'currency_code','BRL'));
select public.create_digital_product_license((select id from public.digital_products where slug='pack-access-test'),jsonb_build_object('kind','personal','title','Licença pessoal','terms_text','Licença pessoal intransferível, sem revenda, redistribuição ou disponibilização dos arquivos originais.','is_default',true));
select public.publish_digital_product_license((select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-access-test')));
select public.attach_digital_product_deliverable((select id from public.digital_products where slug='pack-access-test'),'b1610000-0000-4000-8000-000000000201',jsonb_build_object('title','Arquivo do produto'));
select public.publish_digital_product((select id from public.digital_products where slug='pack-access-test'),(select version from public.digital_products where slug='pack-access-test'));
select public.grant_digital_product_access('b1600000-0000-4000-8000-000000000202',(select id from public.digital_products where slug='pack-access-test'),(select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-access-test') and status='published'),'manual_grant',statement_timestamp()+interval '30 days','b16-access-test-reference','Acesso concedido para teste');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000202","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000202","is_anonymous":false}',true);
select throws_ok(
 $$select public.create_digital_product('{"title":"Bloqueado","slug":"bloqueado"}'::jsonb)$$,
 '42501',null,'student cannot author products'
);
select is((select count(*)::integer from public.digital_products),1,'granted student sees product');
select is((select count(*)::integer from public.digital_product_licenses),1,'granted student sees published license');
select is((select count(*)::integer from public.digital_product_deliverables),1,'granted student sees deliverable');
select is((select count(*)::integer from public.digital_product_accesses),1,'student sees only own access');
select is((select count(*)::integer from public.digital_product_events),0,'student cannot read marketplace audit events');
select is((select count(*)::integer from public.assets where id='b1610000-0000-4000-8000-000000000201'),1,'granted student sees deliverable asset');
select ok((select license_snapshot ? 'terms_text' from public.digital_product_accesses limit 1),'access stores immutable license terms snapshot');
select throws_ok(
 $$insert into public.digital_products(title,slug) values('Tentativa indevida','tentativa-indevida')$$,
 '42501',null,'student cannot mutate marketplace tables directly'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select is((select count(*)::integer from public.digital_products),1,'student without access sees published catalog product');
select is((select count(*)::integer from public.digital_product_licenses),1,'student without access sees published catalog license');
select is((select count(*)::integer from public.digital_product_deliverables),0,'student without access cannot see deliverables');
select is((select count(*)::integer from public.digital_product_accesses),0,'student cannot see another user access');
select is((select count(*)::integer from public.assets where id='b1610000-0000-4000-8000-000000000201'),0,'student without access cannot see deliverable asset');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000201","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000201","is_anonymous":false}',true);
select throws_ok(
 $$select public.grant_digital_product_access('b1600000-0000-4000-8000-000000000203',(select id from public.digital_products where slug='pack-access-test'),(select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-access-test') and status='published'),'purchase',null,'fake-purchase','Compra não confirmada')$$,
 '22023',null,'manual administration cannot fabricate purchase access'
);
select throws_ok(
 $$select public.grant_digital_product_access('b1600000-0000-4000-8000-000000000202',(select id from public.digital_products where slug='pack-access-test'),(select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-access-test') and status='published'),'manual_grant',null,'duplicate-access','Duplicado')$$,
 '23505',null,'duplicate active access is rejected'
);
select results_eq(
 $$select (public.revoke_digital_product_access((select id from public.digital_product_accesses where user_id='b1600000-0000-4000-8000-000000000202'),'Revogação de teste')).status::text$$,
 $$values('revoked'::text)$$,
 'administrator revokes access with reason'
);
select is((select count(*)::integer from public.digital_product_events where event_type in ('access_granted','access_revoked')),2,'grant and revocation are audited');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000202","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000202","is_anonymous":false}',true);
select is((select count(*)::integer from public.digital_product_deliverables),0,'revoked student immediately loses deliverables');
select is((select count(*)::integer from public.assets where id='b1610000-0000-4000-8000-000000000201'),0,'revoked student immediately loses asset');
select is((select count(*)::integer from public.digital_product_accesses where status='revoked'),1,'revoked access remains visible as history');
select ok(not private.has_active_digital_product_access('b1600000-0000-4000-8000-000000000202',(select id from public.digital_products where slug='pack-access-test')),'revoked access is no longer active');

select * from finish();
rollback;
