begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users(id,email) values
 ('b2000000-0000-4000-8000-000000000201','b20-attr-admin@example.test'),
 ('b2000000-0000-4000-8000-000000000202','b20-attr-affiliate-one@example.test'),
 ('b2000000-0000-4000-8000-000000000203','b20-attr-affiliate-two@example.test'),
 ('b2000000-0000-4000-8000-000000000204','b20-attr-buyer@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='b2000000-0000-4000-8000-000000000201';
update public.user_roles set role='afiliado' where user_id in ('b2000000-0000-4000-8000-000000000202','b2000000-0000-4000-8000-000000000203');

insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values
 ('b2070000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','image','published','b20-attr-cover.webp','b20-attr-cover.webp','webp','image/webp',2000,'b20:test:attr:cover:0001',statement_timestamp(),statement_timestamp()),
 ('b2070000-0000-4000-8000-000000000202','b2000000-0000-4000-8000-000000000201','b2000000-0000-4000-8000-000000000201','image','published','b20-attr-thumb.webp','b20-attr-thumb.webp','webp','image/webp',1000,'b20:test:attr:thumb:0001',statement_timestamp(),statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000201","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000201","is_anonymous":false}',true);
select set_config('test.b20_attr_course_id',(select id::text from public.create_course(jsonb_build_object(
 'title','Curso Atribuição B20','slug','curso-atribuicao-b20-test','short_description','Curso para validar atribuição de afiliados.',
 'description','Curso publicado para testes de last-click e autoindicação da fase B20.','category','Produção musical','language_code','pt-BR','level','beginner',
 'objectives',jsonb_build_array('Validar atribuição'),'prerequisites',jsonb_build_array('Conta autenticada'),
 'cover_asset_id','b2070000-0000-4000-8000-000000000201','thumbnail_asset_id','b2070000-0000-4000-8000-000000000202',
 'price_amount',100.00,'currency_code','BRL','completion_mode','percentage','completion_required_percent',80,
 'certificate_enabled',false,'release_mode','immediate','affiliate_eligible',true,'preview_enabled',false
))),false);
select set_config('test.b20_attr_module_id',(select id::text from public.create_module(current_setting('test.b20_attr_course_id')::uuid,'{"title":"Módulo Atribuição B20","status":"published"}'::jsonb)),false);
select public.create_lesson(current_setting('test.b20_attr_module_id')::uuid,'{"title":"Aula Atribuição B20","status":"published","content_kind":"text","text_content":"Conteúdo de atribuição."}'::jsonb);
select public.publish_course(current_setting('test.b20_attr_course_id')::uuid,1);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000204","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000204","is_anonymous":false}',true);
select throws_ok(
  $$select public.request_affiliate_profile('Comprador comum')$$,
  '42501','AFFILIATE_ROLE_REQUIRED',
  'student cannot request an affiliate profile'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000202","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000202","is_anonymous":false}',true);
select lives_ok($$select public.request_affiliate_profile('Afiliado Um')$$,'first affiliate can request a profile');
select is((select status::text from public.affiliate_profiles where user_id='b2000000-0000-4000-8000-000000000202'),'pending','requested profile starts pending');
select throws_ok(
  $$select public.create_affiliate_link('course',current_setting('test.b20_attr_course_id')::uuid,'/marketplace')$$,
  '42501','AFFILIATE_PROFILE_NOT_ACTIVE',
  'pending affiliate cannot create a link'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select lives_ok($$select public.request_affiliate_profile('Afiliado Dois')$$,'second affiliate can request a profile');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000201","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000201","is_anonymous":false}',true);
select lives_ok($$select public.admin_set_affiliate_profile_status('b2000000-0000-4000-8000-000000000202','active',null)$$,'admin activates first affiliate');
select lives_ok($$select public.admin_set_affiliate_profile_status('b2000000-0000-4000-8000-000000000203','active',null)$$,'admin activates second affiliate');
select lives_ok($$select public.admin_configure_affiliate_terms('course',current_setting('test.b20_attr_course_id')::uuid,1000,30,true)$$,'admin configures explicit affiliate terms');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000202","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000202","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_attr_link_one',(select code from public.create_affiliate_link('course',current_setting('test.b20_attr_course_id')::uuid,'/marketplace')),false)$$,'first affiliate creates a link');
select is((select count(*)::integer from public.affiliate_links where affiliate_user_id='b2000000-0000-4000-8000-000000000202' and status='active'),1,'active link is unique and persisted');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_attr_link_two',(select code from public.create_affiliate_link('course',current_setting('test.b20_attr_course_id')::uuid,'/marketplace')),false)$$,'second affiliate creates a link');

reset role;
select set_config('request.jwt.claims','{"role":"anon","is_anonymous":true}',true);
set local role anon;
select ok((public.record_affiliate_click(current_setting('test.b20_attr_link_one'),'b2060000-0000-4000-8000-000000000201','/marketplace','https://source-one.test','Browser One')->>'accepted')::boolean,'first anonymous click is accepted');
reset role;
select is((select count(*)::integer from public.affiliate_clicks),1,'first click is persisted once');
select is((select char_length(visitor_token_hash) from public.affiliate_clicks limit 1),64,'visitor token is stored only as SHA-256');
select is((select char_length(user_agent_hash) from public.affiliate_clicks limit 1),64,'user agent is stored only as SHA-256');
select isnt((select visitor_token_hash from public.affiliate_clicks limit 1),'b2060000-0000-4000-8000-000000000201','raw visitor token is not stored');
set local role anon;
select ok((public.record_affiliate_click(current_setting('test.b20_attr_link_two'),'b2060000-0000-4000-8000-000000000201','/marketplace','https://source-two.test','Browser Two')->>'accepted')::boolean,'second anonymous click is accepted');
reset role;
select is((select count(*)::integer from public.affiliate_attributions),2,'last-click preserves both attribution records');
select is((select status::text from public.affiliate_attributions where affiliate_user_id='b2000000-0000-4000-8000-000000000202'),'invalidated','older attribution is invalidated');
select is((select status::text from public.affiliate_attributions where affiliate_user_id='b2000000-0000-4000-8000-000000000203'),'active','most recent attribution remains active');
select ok((select invalidation_reason ilike '%last-click%' from public.affiliate_attributions where affiliate_user_id='b2000000-0000-4000-8000-000000000202'),'replacement reason records last-click');
select is((select commission_bps from public.affiliate_attributions where affiliate_user_id='b2000000-0000-4000-8000-000000000203'),1000,'attribution freezes configured commission rate');
select ok((select terms_id is not null from public.affiliate_attributions where affiliate_user_id='b2000000-0000-4000-8000-000000000203'),'attribution freezes configured terms identity');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000204","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000204","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_attr_buyer_intent',(select id::text from public.prepare_checkout_intent_with_attribution('course',current_setting('test.b20_attr_course_id')::uuid,null,'b2050000-0000-4000-8000-000000000201','b2060000-0000-4000-8000-000000000201')),false)$$,'buyer prepares attributed checkout');
select is((select attribution.affiliate_user_id from public.checkout_intents intent join public.affiliate_attributions attribution on attribution.id=intent.affiliate_attribution_id where intent.id=current_setting('test.b20_attr_buyer_intent')::uuid),'b2000000-0000-4000-8000-000000000203'::uuid,'checkout uses the last affiliate click');
select is((select item_snapshot->'affiliate'->>'affiliate_user_id' from public.checkout_intents where id=current_setting('test.b20_attr_buyer_intent')::uuid),'b2000000-0000-4000-8000-000000000203','checkout snapshot freezes affiliate identity');

reset role;
select set_config('request.jwt.claims','{"role":"anon","is_anonymous":true}',true);
set local role anon;
select ok((public.record_affiliate_click(current_setting('test.b20_attr_link_two'),'b2060000-0000-4000-8000-000000000202','/marketplace','https://self.test','Self Browser')->>'accepted')::boolean,'self-referral click can be recorded before authentication is known');

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000203","role":"authenticated","session_id":"b2040000-0000-4000-8000-000000000203","is_anonymous":false}',true);
select lives_ok($$select set_config('test.b20_attr_self_intent',(select id::text from public.prepare_checkout_intent_with_attribution('course',current_setting('test.b20_attr_course_id')::uuid,null,'b2050000-0000-4000-8000-000000000202','b2060000-0000-4000-8000-000000000202')),false)$$,'affiliate can prepare a normal checkout');
select ok((select affiliate_attribution_id is null from public.checkout_intents where id=current_setting('test.b20_attr_self_intent')::uuid),'self-referral is not attached to checkout');
select is((select status::text from public.affiliate_attributions where visitor_token_hash=encode(extensions.digest('b2060000-0000-4000-8000-000000000202','sha256'),'hex')),'invalidated','self-referral attribution is invalidated');
select ok((select invalidation_reason ilike '%Autoindicação%' from public.affiliate_attributions where visitor_token_hash=encode(extensions.digest('b2060000-0000-4000-8000-000000000202','sha256'),'hex')),'self-referral invalidation is explicit');

select * from finish();
rollback;
