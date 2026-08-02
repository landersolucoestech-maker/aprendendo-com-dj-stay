begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select has_function('private','get_my_checkout_return',array['uuid'],'private checkout return reader exists');
select has_function('public','get_my_checkout_return',array['uuid'],'public checkout return reader exists');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_my_checkout_return'),'private checkout return reader is security definer');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_checkout_return'),'public checkout return reader is security invoker');
select is((select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_my_checkout_return'),'s','private checkout return reader is stable');
select is((select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_checkout_return'),'s','public checkout return reader is stable');
select ok(not has_function_privilege('anon','public.get_my_checkout_return(uuid)','EXECUTE'),'anonymous cannot read checkout returns');
select ok(has_function_privilege('authenticated','public.get_my_checkout_return(uuid)','EXECUTE'),'authenticated users can read their checkout return');
select ok(not has_function_privilege('anon','private.get_my_checkout_return(uuid)','EXECUTE'),'anonymous cannot execute the private checkout reader');
select ok(has_function_privilege('authenticated','private.get_my_checkout_return(uuid)','EXECUTE'),'authenticated can reach the private checkout reader through the wrapper');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('checkout_intents','payment_orders','payment_attempts','payment_entitlements') and grantee='anon'),0,'checkout return adds no anonymous table grants');

insert into auth.users(id,email) values
 ('b9000000-0000-4000-8000-000000000101','b90-owner@example.test'),
 ('b9000000-0000-4000-8000-000000000102','b90-other@example.test');

insert into public.courses (
  id,title,slug,status,short_description,description,category,language_code,level,
  objectives,prerequisites,price_amount,currency_code,release_mode,published_at
) values
(
  'b9000000-0000-4000-8000-000000000201','Curso exato B90','curso-exato-b90','published',
  'Curso ligado ao retorno exato.','Curso usado para validar a correlação por checkout intent.','Produção musical','pt-BR','beginner',
  array['Validar retorno exato'],array[]::text[],199.90,'BRL','immediate',statement_timestamp()
),
(
  'b9000000-0000-4000-8000-000000000202','Curso não relacionado B90','curso-nao-relacionado-b90','published',
  'Curso não relacionado.','Curso ativo que não pode ser usado como fallback no retorno.','Produção musical','pt-BR','beginner',
  array['Não confundir matrículas'],array[]::text[],99.90,'BRL','immediate',statement_timestamp()
);

insert into public.digital_products (
  id,title,slug,short_description,description,category,status,price_amount,currency_code,published_at
) values (
  'b9000000-0000-4000-8000-000000000203','Produto exato B90','produto-exato-b90',
  'Produto ligado ao retorno.','Produto digital usado para validar o retorno compartilhado.','Material','published',79.90,'BRL',statement_timestamp()
);
insert into public.digital_product_licenses (
  id,product_id,kind,title,summary,terms_text,version,status,is_default,published_at
) values (
  'b9000000-0000-4000-8000-000000000204','b9000000-0000-4000-8000-000000000203',
  'personal','Licença pessoal B90','Uso pessoal','Termos persistidos da licença pessoal para o teste B90.',1,'published',true,statement_timestamp()
);

insert into public.checkout_intents (
  id,user_id,subject_type,subject_id,license_id,status,provider,provider_checkout_id,
  provider_checkout_url,amount_cents,currency_code,title_snapshot,item_snapshot,
  idempotency_key,expires_at
) values
(
  'b9000000-0000-4000-8000-000000000301','b9000000-0000-4000-8000-000000000101',
  'course','b9000000-0000-4000-8000-000000000201',null,'checkout_created','asaas','checkout-b90-pending',
  'https://sandbox.asaas.com/checkout/b90-pending',19990,'BRL','Curso exato B90',
  jsonb_build_object('subject_type','course','subject_id','b9000000-0000-4000-8000-000000000201','amount_cents',19990,'currency_code','BRL'),
  'b9000000-0000-4000-8000-000000000401',statement_timestamp()+interval '30 minutes'
),
(
  'b9000000-0000-4000-8000-000000000302','b9000000-0000-4000-8000-000000000101',
  'course','b9000000-0000-4000-8000-000000000201',null,'checkout_created','asaas','checkout-b90-paid-course',
  'https://sandbox.asaas.com/checkout/b90-paid-course',19990,'BRL','Curso exato B90',
  jsonb_build_object('subject_type','course','subject_id','b9000000-0000-4000-8000-000000000201','amount_cents',19990,'currency_code','BRL'),
  'b9000000-0000-4000-8000-000000000402',statement_timestamp()+interval '30 minutes'
),
(
  'b9000000-0000-4000-8000-000000000303','b9000000-0000-4000-8000-000000000102',
  'course','b9000000-0000-4000-8000-000000000201',null,'checkout_created','asaas','checkout-b90-other',
  'https://sandbox.asaas.com/checkout/b90-other',19990,'BRL','Curso de outro usuário',
  jsonb_build_object('subject_type','course','subject_id','b9000000-0000-4000-8000-000000000201','amount_cents',19990,'currency_code','BRL'),
  'b9000000-0000-4000-8000-000000000403',statement_timestamp()+interval '30 minutes'
),
(
  'b9000000-0000-4000-8000-000000000304','b9000000-0000-4000-8000-000000000101',
  'digital_product','b9000000-0000-4000-8000-000000000203','b9000000-0000-4000-8000-000000000204',
  'checkout_created','asaas','checkout-b90-paid-product','https://sandbox.asaas.com/checkout/b90-paid-product',
  7990,'BRL','Produto exato B90',
  jsonb_build_object(
    'subject_type','digital_product',
    'subject_id','b9000000-0000-4000-8000-000000000203',
    'amount_cents',7990,
    'currency_code','BRL',
    'license',private.digital_product_license_snapshot('b9000000-0000-4000-8000-000000000204')
  ),
  'b9000000-0000-4000-8000-000000000404',statement_timestamp()+interval '30 minutes'
);

insert into public.enrollments (
  id,user_id,course_id,status,source,starts_at
) values (
  'b9000000-0000-4000-8000-000000000501','b9000000-0000-4000-8000-000000000101',
  'b9000000-0000-4000-8000-000000000202','active','manual_grant',statement_timestamp()
);

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);

update public.payment_orders
set status='paid',payment_confirmed_at=statement_timestamp()
where checkout_intent_id='b9000000-0000-4000-8000-000000000302';
update public.payment_attempts
set status='confirmed',billing_type='pix',provider_status='CONFIRMED',confirmed_at=statement_timestamp()
where checkout_intent_id='b9000000-0000-4000-8000-000000000302';

update public.payment_orders
set status='paid',payment_confirmed_at=statement_timestamp()
where checkout_intent_id='b9000000-0000-4000-8000-000000000304';
update public.payment_attempts
set status='received',billing_type='credit_card',provider_status='RECEIVED',received_at=statement_timestamp()
where checkout_intent_id='b9000000-0000-4000-8000-000000000304';

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b9000000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9000000-0000-4000-8000-000000000801","is_anonymous":false}',true);

select is((public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301')->>'found')::boolean,true,'owner can load the exact pending checkout');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301')->>'checkout_intent_id','b9000000-0000-4000-8000-000000000301','response preserves the requested checkout intent');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301')->>'subject_type','course','pending response identifies the course subject');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301') #>> '{order,status}','checkout_pending','pending response returns its own order');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301') #>> '{attempt,status}','checkout_created','pending response returns its own latest attempt');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301')->'entitlement','null'::jsonb,'pending response has no invented entitlement');
select ok(not (public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301') ? 'provider_checkout_url'),'response excludes provider checkout URL');
select ok(not ((public.get_my_checkout_return('b9000000-0000-4000-8000-000000000301')->'attempt') ? 'provider_checkout_id'),'attempt excludes provider checkout identifier');
select is((public.get_my_checkout_return('b9000000-0000-4000-8000-000000000303')->>'found')::boolean,false,'another user checkout is indistinguishable from not found');

select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302')->>'title','Curso exato B90','paid course returns its own title snapshot');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302')->>'subject_id','b9000000-0000-4000-8000-000000000201','paid course returns the exact purchased course');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302') #>> '{order,status}','paid','paid course returns the exact paid order');
select ok((public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302') #>> '{order,payment_confirmed_at}') is not null,'paid course exposes confirmation timestamp');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302') #>> '{entitlement,status}','active','paid course returns active entitlement');
select is(
  public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302') #>> '{entitlement,enrollment_id}',
  (select enrollment.id::text from public.enrollments enrollment where enrollment.source='purchase' and enrollment.source_reference=(select payment_order.id::text from public.payment_orders payment_order where payment_order.checkout_intent_id='b9000000-0000-4000-8000-000000000302')),
  'paid course returns the enrollment created by fulfillment'
);
select isnt(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000302') #>> '{entitlement,enrollment_id}','b9000000-0000-4000-8000-000000000501','unrelated active enrollment is never used as fallback');

select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304')->>'subject_type','digital_product','shared return identifies a digital product');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304')->>'license_id','b9000000-0000-4000-8000-000000000204','digital return preserves the purchased license');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304') #>> '{order,status}','paid','digital product returns the exact paid order');
select is(
  public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304') #>> '{entitlement,digital_product_access_id}',
  (select access.id::text from public.digital_product_accesses access where access.source='purchase' and access.source_reference=(select payment_order.id::text from public.payment_orders payment_order where payment_order.checkout_intent_id='b9000000-0000-4000-8000-000000000304')),
  'digital product returns the access created by fulfillment'
);
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304') #>> '{entitlement,enrollment_id}',null,'digital product return cannot invent a course enrollment');
select is(public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304') #>> '{entitlement,status}','active','digital product return exposes active entitlement');
select ok(not (public.get_my_checkout_return('b9000000-0000-4000-8000-000000000304') ? 'provider_event_payload'),'return does not expose provider event payload');

reset role;
select * from finish();
rollback;
