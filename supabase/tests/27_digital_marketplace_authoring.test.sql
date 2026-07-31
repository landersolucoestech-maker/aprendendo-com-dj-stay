begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users(id,email) values ('b1600000-0000-4000-8000-000000000101','b16-authoring-admin@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b1600000-0000-4000-8000-000000000101';
insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,published_at)
values
 ('b1610000-0000-4000-8000-000000000101','b1600000-0000-4000-8000-000000000101','b1600000-0000-4000-8000-000000000101','digital_product','published','pack.zip','pack.zip','zip','application/zip',4096,'marketplace:authoring:file:01',statement_timestamp()),
 ('b1610000-0000-4000-8000-000000000102','b1600000-0000-4000-8000-000000000101','b1600000-0000-4000-8000-000000000101','image','published','cover.png','cover.png','png','image/png',2048,'marketplace:authoring:cover:1',statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000101","is_anonymous":false}',true);

select lives_ok(
 $$select public.create_digital_product(jsonb_build_object('title','Pack Authoring','slug','pack-authoring','short_description','Validação do CMS.','description','Produto utilizado no teste de autoria da fase B16.','cover_asset_id','b1610000-0000-4000-8000-000000000102','price_amount',49.90,'currency_code','BRL','affiliate_eligible',true))$$,
 'product creation succeeds'
);
select is((select status::text from public.digital_products where slug='pack-authoring'),'draft','product starts in draft');
select is((select version from public.digital_products where slug='pack-authoring'),1,'new product starts at version one');
select throws_ok(
 $$select public.update_digital_product((select id from public.digital_products where slug='pack-authoring'),999,'{"title":"Conflito"}'::jsonb)$$,
 '40001',null,'stale product version is rejected'
);
select throws_ok(
 $$select public.publish_digital_product((select id from public.digital_products where slug='pack-authoring'),1)$$,
 '22023',null,'product cannot publish without license and deliverable'
);
select lives_ok(
 $$select public.create_digital_product_license((select id from public.digital_products where slug='pack-authoring'),jsonb_build_object('kind','commercial','title','Licença comercial','terms_text','Licença comercial para uma pessoa, sem revenda ou redistribuição dos arquivos originais.','is_default',true))$$,
 'first license can be created'
);
select is((select version from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-authoring') and kind='commercial'),1,'first license receives version one');
select lives_ok(
 $$select public.publish_digital_product_license((select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-authoring') and kind='commercial'))$$,
 'license publication succeeds'
);
select is((select status::text from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-authoring') and kind='commercial'),'published','license publishes through lifecycle RPC');
select ok((select is_default from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-authoring') and kind='commercial'),'first published license becomes default');

reset role;
set local role service_role;
select throws_ok(
 $$update public.digital_product_licenses set terms_text='Alteração indevida dos termos publicados.' where product_id=(select id from public.digital_products where slug='pack-authoring') and kind='commercial'$$,
 '22023',null,'published license terms are immutable'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1600000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b1620000-0000-4000-8000-000000000101","is_anonymous":false}',true);

select throws_ok(
 $$select public.attach_digital_product_deliverable((select id from public.digital_products where slug='pack-authoring'),'b1610000-0000-4000-8000-000000000102','{"title":"Inválido"}'::jsonb)$$,
 '22023',null,'image asset cannot become a digital deliverable'
);
select lives_ok(
 $$select public.attach_digital_product_deliverable((select id from public.digital_products where slug='pack-authoring'),'b1610000-0000-4000-8000-000000000101','{"title":"Pack principal","position":0,"required":true}'::jsonb)$$,
 'published digital product asset can be attached'
);
select is((select version from public.digital_products where slug='pack-authoring'),4,'license and deliverable changes increment product version');
select lives_ok(
 $$select public.publish_digital_product((select id from public.digital_products where slug='pack-authoring'),4)$$,
 'complete product publication succeeds'
);
select is((select status::text from public.digital_products where slug='pack-authoring'),'published','complete product publishes');
select is((select count(*)::integer from public.digital_product_events),5,'creation through publication is audited');
select throws_ok(
 $$select public.update_digital_product((select id from public.digital_products where slug='pack-authoring'),5,'{"title":"Edição publicada"}'::jsonb)$$,
 '22023',null,'published product cannot be edited directly'
);
select lives_ok(
 $$select public.unpublish_digital_product((select id from public.digital_products where slug='pack-authoring'),5)$$,
 'published product can be unpublished'
);
select is((select status::text from public.digital_products where slug='pack-authoring'),'draft','published product returns to draft');
select lives_ok(
 $$select public.create_digital_product_license((select id from public.digital_products where slug='pack-authoring'),jsonb_build_object('kind','personal','title','Licença pessoal','terms_text','Licença pessoal intransferível, sem redistribuição ou compartilhamento público dos arquivos originais.','is_default',true))$$,
 'second license kind can be authored in draft'
);
select lives_ok(
 $$select public.publish_digital_product_license((select id from public.digital_product_licenses where product_id=(select id from public.digital_products where slug='pack-authoring') and kind='personal'))$$,
 'second license kind can publish'
);
select is((select count(*)::integer from public.digital_product_licenses where status='published'),2,'multiple published license kinds are supported');
select is((select count(*)::integer from public.digital_product_licenses where status='published' and is_default),1,'only one published license is default');
select is((select kind::text from public.digital_product_licenses where status='published' and is_default),'personal','default license can switch without mutating terms');
select lives_ok(
 $$select public.archive_digital_product((select id from public.digital_products where slug='pack-authoring'),(select version from public.digital_products where slug='pack-authoring'))$$,
 'draft product can be archived'
);
select is((select status::text from public.digital_products where slug='pack-authoring'),'archived','product reaches archived status');
select ok(public.delete_digital_product((select id from public.digital_products where slug='pack-authoring'),(select version from public.digital_products where slug='pack-authoring')),'archived product is soft deleted');

reset role;
set local role service_role;
select ok((select deleted_at is not null from public.digital_products where slug='pack-authoring'),'soft deletion preserves the product row');
reset role;

select * from finish();
rollback;
