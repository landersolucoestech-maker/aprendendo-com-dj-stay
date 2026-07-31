begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_type('public','checkout_subject_type','checkout subject enum exists');
select has_type('public','checkout_intent_status','checkout intent status enum exists');
select has_type('public','checkout_intent_event_type','checkout intent event enum exists');
select has_type('public','payment_order_status','payment order status enum exists');
select has_type('public','payment_attempt_status','payment attempt status enum exists');
select has_type('public','payment_billing_type','payment billing type enum exists');
select has_type('public','payment_provider_event_status','provider event status enum exists');

select has_table('public','checkout_intents','checkout intents table exists');
select has_table('public','checkout_intent_events','checkout intent events table exists');
select has_table('public','payment_orders','payment orders table exists');
select has_table('public','payment_attempts','payment attempts table exists');
select has_table('public','payment_provider_events','provider events table exists');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in (
 'public.checkout_intents'::regclass,
 'public.checkout_intent_events'::regclass,
 'public.payment_orders'::regclass,
 'public.payment_attempts'::regclass,
 'public.payment_provider_events'::regclass
)),'all payment tables force RLS');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name in ('checkout_intents','checkout_intent_events','payment_orders','payment_attempts','payment_provider_events') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')),0,'authenticated cannot mutate payment tables');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='anon' and table_schema='public' and table_name in ('checkout_intents','checkout_intent_events','payment_orders','payment_attempts','payment_provider_events')),0,'anonymous has no payment table grants');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('prepare_checkout_intent','claim_checkout_provider_request','complete_checkout_provider_request','fail_checkout_provider_request','process_asaas_payment_webhook')),5,'five public payment RPCs exist');
select ok((select bool_and(not p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('prepare_checkout_intent','claim_checkout_provider_request','complete_checkout_provider_request','fail_checkout_provider_request','process_asaas_payment_webhook')),'public payment RPCs are security invoker');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='anon' and routine_name in ('prepare_checkout_intent','claim_checkout_provider_request','complete_checkout_provider_request','fail_checkout_provider_request','process_asaas_payment_webhook')),0,'anonymous cannot execute payment RPCs');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='authenticated' and routine_name in ('prepare_checkout_intent','claim_checkout_provider_request','complete_checkout_provider_request','fail_checkout_provider_request','process_asaas_payment_webhook')),1,'authenticated can execute only quote preparation');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='service_role' and routine_name in ('claim_checkout_provider_request','complete_checkout_provider_request','fail_checkout_provider_request','process_asaas_payment_webhook')),4,'provider mutation RPCs are service-role only');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename in ('checkout_intents','checkout_intent_events','payment_orders','payment_attempts','payment_provider_events')),5,'payment tables expose five read policies');

select has_pk('public','checkout_intents','checkout intents have primary key');
select has_pk('public','checkout_intent_events','checkout events have primary key');
select has_pk('public','payment_orders','payment orders have primary key');
select has_pk('public','payment_attempts','payment attempts have primary key');
select has_pk('public','payment_provider_events','provider events have primary key');

select has_index('public','checkout_intents','checkout_intents_user_idempotency_uidx','checkout is idempotent per user');
select has_index('public','payment_attempts','payment_attempts_provider_checkout_uidx','provider checkout is unique');
select has_index('public','payment_attempts','payment_attempts_provider_payment_uidx','provider payment is unique');
select has_index('public','payment_provider_events','payment_provider_events_provider_event_uidx','provider events are idempotent');
select is((select count(*)::integer from public.checkout_intents)+(select count(*)::integer from public.checkout_intent_events)+(select count(*)::integer from public.payment_orders)+(select count(*)::integer from public.payment_attempts)+(select count(*)::integer from public.payment_provider_events),0,'payment schema starts empty');

select * from finish();
rollback;
