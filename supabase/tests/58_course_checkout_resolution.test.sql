begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_function('private','resolve_course_checkout_subject',array['text'],'private course checkout resolver exists');
select has_function('public','resolve_course_checkout_subject',array['text'],'public course checkout resolver exists');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='resolve_course_checkout_subject'),'private resolver is security definer');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='resolve_course_checkout_subject'),'public resolver is security invoker');
select is((select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='resolve_course_checkout_subject'),'s','private resolver is stable');
select is((select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='resolve_course_checkout_subject'),'s','public resolver is stable');
select ok(not has_function_privilege('anon','public.resolve_course_checkout_subject(text)','EXECUTE'),'anonymous cannot resolve checkout subjects');
select ok(has_function_privilege('authenticated','public.resolve_course_checkout_subject(text)','EXECUTE'),'authenticated users can resolve checkout subjects');
select ok(not has_function_privilege('anon','private.resolve_course_checkout_subject(text)','EXECUTE'),'anonymous cannot execute the private resolver');
select ok(has_function_privilege('authenticated','private.resolve_course_checkout_subject(text)','EXECUTE'),'authenticated can reach the private resolver through the wrapper');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('courses','enrollments') and grantee='anon'),0,'resolver adds no anonymous table grants');

insert into auth.users(id,email) values
 ('b8900000-0000-4000-8000-000000000101','b89-student@example.test'),
 ('b8900000-0000-4000-8000-000000000102','b89-affiliate@example.test');
update public.user_roles set role='afiliado' where user_id='b8900000-0000-4000-8000-000000000102';

insert into public.courses (
  id,title,slug,status,short_description,description,category,language_code,level,
  objectives,prerequisites,price_amount,currency_code,availability_starts_at,
  release_mode,published_at
) values
(
  'b8900000-0000-4000-8000-000000000201','Curso Checkout B89','curso-checkout-b89','published',
  'Curso elegível para checkout.','Curso publicado usado para validar a resolução autenticada.','Produção musical','pt-BR','beginner',
  array['Concluir a compra com segurança'],array['Conta autenticada'],199.90,'BRL',null,'immediate',statement_timestamp()
),
(
  'b8900000-0000-4000-8000-000000000202','Curso Futuro B89','curso-futuro-b89','published',
  'Curso ainda indisponível.','Curso fora da janela de disponibilidade.','Produção musical','pt-BR','beginner',
  array['Não liberar antes da data'],array[]::text[],99.90,'BRL',statement_timestamp()+interval '1 day','immediate',statement_timestamp()
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b8900000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b8900000-0000-4000-8000-000000000301","is_anonymous":false}',true);
select matches(public.resolve_course_checkout_subject('curso-checkout-b89')->>'course_id','^[0-9a-f-]{36}$','student resolves the persisted course identifier');
select is(public.resolve_course_checkout_subject('curso-checkout-b89')->>'slug','curso-checkout-b89','resolver preserves the canonical slug');
select is((public.resolve_course_checkout_subject('curso-checkout-b89')->>'checkout_eligible')::boolean,true,'available course is checkout eligible');
select is((public.resolve_course_checkout_subject('curso-checkout-b89')->>'already_enrolled')::boolean,false,'student without enrollment is not marked as owner');
select throws_ok(
 $$select public.resolve_course_checkout_subject('Slug Inválido')$$,
 '22023','COURSE_SLUG_INVALID','invalid slug is rejected before lookup'
);
select throws_ok(
 $$select public.resolve_course_checkout_subject('curso-futuro-b89')$$,
 'P0002','COURSE_NOT_AVAILABLE_FOR_CHECKOUT','future course cannot be resolved for checkout'
);
reset role;

insert into public.enrollments (
  user_id,course_id,status,source,starts_at,expires_at
) values (
  'b8900000-0000-4000-8000-000000000101',
  'b8900000-0000-4000-8000-000000000201',
  'active','manual_grant',statement_timestamp(),null
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b8900000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b8900000-0000-4000-8000-000000000302","is_anonymous":false}',true);
select is(public.resolve_course_checkout_subject('curso-checkout-b89')->>'course_id',null,'active enrollment suppresses the checkout subject identifier');
select is((public.resolve_course_checkout_subject('curso-checkout-b89')->>'already_enrolled')::boolean,true,'active enrollment is reported explicitly');
select is((public.resolve_course_checkout_subject('curso-checkout-b89')->>'checkout_eligible')::boolean,false,'active enrollment blocks an accidental second checkout');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b8900000-0000-4000-8000-000000000102","role":"authenticated","session_id":"b8900000-0000-4000-8000-000000000303","is_anonymous":false}',true);
select throws_ok(
 $$select public.resolve_course_checkout_subject('curso-checkout-b89')$$,
 '42501','COURSE_BUYER_ROLE_REQUIRED','affiliate role cannot buy a course it cannot consume'
);
reset role;

select * from finish();
rollback;
