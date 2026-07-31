begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

select has_type('public','payment_entitlement_status','payment entitlement status enum exists');
select has_type('public','payment_entitlement_event_type','payment entitlement event enum exists');
select has_type('public','commission_adjustment_kind','commission adjustment kind enum exists');
select has_table('public','payment_entitlements','payment entitlements table exists');
select has_table('public','payment_entitlement_events','payment entitlement events table exists');
select has_table('public','commission_adjustment_events','commission adjustment events table exists');
select has_column('public','digital_product_accesses','suspended_at','digital access has suspension timestamp');
select has_column('public','digital_product_accesses','suspension_reason','digital access has suspension reason');
select ok(exists(
  select 1
  from pg_type t
  join pg_enum e on e.enumtypid=t.oid
  join pg_namespace n on n.oid=t.typnamespace
  where n.nspname='public'
    and t.typname='digital_product_access_status'
    and e.enumlabel='suspended'
),'digital product access supports suspended state');
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in (
  'public.payment_entitlements'::regclass,
  'public.payment_entitlement_events'::regclass,
  'public.commission_adjustment_events'::regclass
)),'all B19 tables force RLS');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name in ('payment_entitlements','payment_entitlement_events','commission_adjustment_events') and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')),0,'authenticated cannot mutate B19 tables');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='anon' and table_schema='public' and table_name in ('payment_entitlements','payment_entitlement_events','commission_adjustment_events')),0,'anonymous has no B19 table grants');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename in ('payment_entitlements','payment_entitlement_events','commission_adjustment_events')),3,'B19 tables expose three read policies');
select has_pk('public','payment_entitlements','payment entitlements have primary key');
select has_pk('public','payment_entitlement_events','entitlement events have primary key');
select has_pk('public','commission_adjustment_events','commission events have primary key');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='payment_entitlements' and indexdef ilike 'create unique index%order_id%'),'one entitlement is stored per order');
select has_index('public','payment_entitlements','payment_entitlements_user_status_idx','entitlements are indexed by user and status');
select has_index('public','payment_entitlements','payment_entitlements_enrollment_idx','course entitlement foreign key is indexed');
select has_index('public','payment_entitlements','payment_entitlements_product_access_idx','product entitlement foreign key is indexed');
select has_index('public','payment_entitlement_events','payment_entitlement_events_provider_uidx','entitlement events are idempotent by provider event');
select has_index('public','commission_adjustment_events','commission_adjustment_events_provider_uidx','commission signals are idempotent by provider event');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.payment_entitlements'::regclass and tgname='payment_entitlements_freeze_identity'),'entitlement identity is frozen');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.payment_entitlements'::regclass and tgname='payment_entitlements_set_updated_at'),'entitlement updates are timestamped');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.payment_orders'::regclass and tgname='payment_orders_apply_entitlement'),'payment order transitions drive fulfillment');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('log_payment_entitlement_event','log_commission_adjustment_event','confirm_digital_product_purchase','grant_payment_order_entitlement','suspend_payment_order_entitlement','revoke_payment_order_entitlement','restore_payment_order_entitlement','apply_payment_order_status_transition')),8,'eight private B19 fulfillment functions exist');
select ok((select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('log_payment_entitlement_event','log_commission_adjustment_event','confirm_digital_product_purchase','grant_payment_order_entitlement','suspend_payment_order_entitlement','revoke_payment_order_entitlement','restore_payment_order_entitlement','apply_payment_order_status_transition')),'B19 fulfillment functions are security definer');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='private' and grantee in ('anon','authenticated') and routine_name in ('log_payment_entitlement_event','log_commission_adjustment_event','confirm_digital_product_purchase','grant_payment_order_entitlement','suspend_payment_order_entitlement','revoke_payment_order_entitlement','restore_payment_order_entitlement','apply_payment_order_status_transition')),0,'client roles cannot execute B19 private functions');
select ok(not exists(select 1 from pg_indexes where schemaname='public' and indexname='digital_product_accesses_one_active_uidx'),'purchase accesses are preserved independently per order');
select is((select count(*)::integer from public.payment_entitlements)+(select count(*)::integer from public.payment_entitlement_events)+(select count(*)::integer from public.commission_adjustment_events),0,'B19 schema starts empty');
select has_check('public','payment_entitlements','payment entitlements have state and subject checks');
select has_check('public','digital_product_accesses','digital accesses retain lifecycle checks');

select * from finish();
rollback;
