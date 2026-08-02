begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

select ok(
  exists(select 1 from pg_extension where extname='pg_cron'),
  'pg_cron extension is enabled'
);
select has_function(
  'private',
  'assert_checkout_expiration_executor',
  array[]::text[],
  'cron executor assertion exists'
);
select has_function(
  'private',
  'expire_due_checkout_intents',
  array['integer'],
  'scheduled expiration batch exists'
);
select ok(
  not has_function_privilege('anon','private.assert_checkout_expiration_executor()','EXECUTE'),
  'anonymous cannot execute the cron assertion'
);
select ok(
  not has_function_privilege('authenticated','private.assert_checkout_expiration_executor()','EXECUTE'),
  'authenticated cannot execute the cron assertion'
);
select ok(
  not has_function_privilege('service_role','private.assert_checkout_expiration_executor()','EXECUTE'),
  'service role cannot invoke the cron-only assertion directly'
);
select ok(
  not has_function_privilege('anon','private.expire_due_checkout_intents(integer)','EXECUTE'),
  'anonymous cannot execute the expiration batch'
);
select ok(
  not has_function_privilege('authenticated','private.expire_due_checkout_intents(integer)','EXECUTE'),
  'authenticated cannot execute the expiration batch'
);
select ok(
  has_function_privilege('service_role','private.expire_due_checkout_intents(integer)','EXECUTE'),
  'service role keeps the B91 batch grant'
);
select ok(not has_schema_privilege('anon','cron','USAGE'),'anonymous cannot use the cron schema');
select ok(not has_schema_privilege('authenticated','cron','USAGE'),'authenticated cannot use the cron schema');
select ok(not has_schema_privilege('service_role','cron','USAGE'),'service role cannot manage cron jobs');
select ok(has_schema_privilege('postgres','cron','USAGE'),'postgres can manage cron jobs');
select is(
  (select count(*)::integer from cron.job where jobname='expire-due-checkout-intents'),
  1,
  'exactly one named checkout expiration job exists'
);
select is(
  (select schedule from cron.job where jobname='expire-due-checkout-intents'),
  '*/5 * * * *',
  'checkout expiration runs every five minutes'
);
select is(
  (select username from cron.job where jobname='expire-due-checkout-intents'),
  'postgres',
  'checkout expiration job runs as postgres'
);
select is(
  (select database from cron.job where jobname='expire-due-checkout-intents'),
  current_database(),
  'checkout expiration job targets the current database'
);
select is(
  (select active from cron.job where jobname='expire-due-checkout-intents'),
  true,
  'checkout expiration job is active'
);
select is(
  (select command from cron.job where jobname='expire-due-checkout-intents'),
  'select private.expire_due_checkout_intents(100);',
  'checkout expiration job calls only the private bounded batch'
);

insert into auth.users(id,email)
values ('b9200000-0000-4000-8000-000000000101','b92-cron@example.test');

insert into public.courses (
  id,title,slug,status,short_description,description,category,language_code,level,
  objectives,prerequisites,price_amount,currency_code,release_mode,published_at
) values (
  'b9200000-0000-4000-8000-000000000201','Curso Cron B92','curso-cron-b92','published',
  'Curso para o cron de expiração.','Curso usado para provar a execução interna do batch agendado.',
  'Produção musical','pt-BR','beginner',array['Validar cron'],array[]::text[],89.90,'BRL',
  'immediate',statement_timestamp()
);

insert into public.checkout_intents (
  id,user_id,subject_type,subject_id,status,provider,provider_checkout_id,provider_checkout_url,
  amount_cents,currency_code,title_snapshot,item_snapshot,idempotency_key,expires_at
) values (
  'b9200000-0000-4000-8000-000000000301','b9200000-0000-4000-8000-000000000101',
  'course','b9200000-0000-4000-8000-000000000201','checkout_created','asaas',
  'checkout-b92-due','https://sandbox.asaas.com/checkout/b92-due',8990,'BRL','Curso Cron B92',
  jsonb_build_object(
    'subject_type','course',
    'subject_id','b9200000-0000-4000-8000-000000000201',
    'amount_cents',8990,
    'currency_code','BRL'
  ),
  'b9200000-0000-4000-8000-000000000401',statement_timestamp()-interval '1 minute'
);

select is(
  private.expire_due_checkout_intents(100),
  1,
  'postgres can execute the same bounded batch used by cron'
);
select is(
  (select status::text from public.checkout_intents where id='b9200000-0000-4000-8000-000000000301'),
  'expired',
  'cron batch expires the checkout intent'
);
select is(
  (select status::text from public.payment_orders where checkout_intent_id='b9200000-0000-4000-8000-000000000301'),
  'expired',
  'cron batch expires the payment order'
);
select is(
  (select status::text from public.payment_attempts where checkout_intent_id='b9200000-0000-4000-8000-000000000301'),
  'expired',
  'cron batch expires the payment attempt'
);
select is(
  (select count(*)::integer from public.checkout_intent_events where checkout_intent_id='b9200000-0000-4000-8000-000000000301' and event_type='expired'),
  1,
  'cron batch records one expiration event'
);
select is(private.expire_due_checkout_intents(100),0,'cron batch is idempotent after reconciliation');
select throws_ok(
  $$select private.expire_due_checkout_intents(1001)$$,
  '22023',
  'CHECKOUT_EXPIRATION_LIMIT_INVALID',
  'cron execution preserves the bounded batch limit'
);
select is(
  (select count(*)::integer from cron.job where jobname='expire-due-checkout-intents'),
  1,
  'batch execution does not duplicate or mutate the schedule'
);

select * from finish();
rollback;
