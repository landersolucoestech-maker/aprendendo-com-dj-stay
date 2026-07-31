begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

select has_type('public','affiliate_profile_status','affiliate profile status enum exists');
select has_type('public','affiliate_link_status','affiliate link status enum exists');
select has_type('public','affiliate_attribution_status','affiliate attribution status enum exists');
select has_type('public','affiliate_commission_status','affiliate commission status enum exists');
select has_type('public','affiliate_payout_status','affiliate payout status enum exists');
select has_type('public','affiliate_event_type','affiliate event type enum exists');
select has_table('public','affiliate_profiles','affiliate profiles table exists');
select has_table('public','affiliate_subject_terms','affiliate terms table exists');
select has_table('public','affiliate_links','affiliate links table exists');
select has_table('public','affiliate_clicks','affiliate clicks table exists');
select has_table('public','affiliate_attributions','affiliate attributions table exists');
select has_table('public','affiliate_commissions','affiliate commissions table exists');
select has_table('public','affiliate_payouts','affiliate payouts table exists');
select has_table('public','affiliate_payout_items','affiliate payout items table exists');
select has_table('public','affiliate_events','affiliate events table exists');
select has_column('public','checkout_intents','affiliate_attribution_id','checkout stores affiliate attribution');
select has_column('public','payment_orders','affiliate_attribution_id','payment order stores affiliate attribution');
select has_column('public','affiliate_attributions','terms_id','attribution freezes terms identity');
select has_column('public','affiliate_attributions','commission_bps','attribution freezes commission rate');
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in (
  'public.affiliate_profiles'::regclass,
  'public.affiliate_subject_terms'::regclass,
  'public.affiliate_links'::regclass,
  'public.affiliate_clicks'::regclass,
  'public.affiliate_attributions'::regclass,
  'public.affiliate_commissions'::regclass,
  'public.affiliate_payouts'::regclass,
  'public.affiliate_payout_items'::regclass,
  'public.affiliate_events'::regclass
)),'all affiliate tables force RLS');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name like 'affiliate_%' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')),0,'authenticated cannot mutate affiliate tables directly');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='anon' and table_schema='public' and table_name like 'affiliate_%'),0,'anonymous has no affiliate table grants');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename like 'affiliate_%'),9,'affiliate tables expose nine owner or admin read policies');
select has_index('public','affiliate_profiles','affiliate_profiles_code_uidx','profile codes are unique');
select has_index('public','affiliate_links','affiliate_links_code_uidx','link codes are unique');
select has_index('public','affiliate_links','affiliate_links_one_active_subject_uidx','one active link exists per affiliate and subject');
select has_index('public','affiliate_attributions','affiliate_attributions_active_visitor_subject_uidx','last-click attribution has one active visitor and subject');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='affiliate_commissions' and indexdef ilike 'create unique index%order_id%'),'one commission exists per order');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='affiliate_commissions' and indexdef ilike 'create unique index%attribution_id%'),'one commission exists per attribution');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='affiliate_payout_items' and indexdef ilike 'create unique index%commission_id%'),'a commission belongs to at most one payout');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.commission_adjustment_events'::regclass and tgname='commission_adjustments_apply_affiliate_commission'),'financial adjustments drive affiliate commissions');
select is((select count(*)::integer from pg_trigger where not tgisinternal and tgname in ('affiliate_profiles_set_updated_at','affiliate_subject_terms_set_updated_at','affiliate_links_set_updated_at','affiliate_attributions_set_updated_at','affiliate_commissions_set_updated_at','affiliate_payouts_set_updated_at')),6,'six mutable affiliate tables update timestamps');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('affiliate_is_admin','log_affiliate_event','affiliate_subject_is_available','prepare_checkout_intent_with_attribution','apply_affiliate_commission_adjustment')),5,'five private affiliate helpers exist');
select ok((select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('affiliate_is_admin','log_affiliate_event','affiliate_subject_is_available','prepare_checkout_intent_with_attribution','apply_affiliate_commission_adjustment')),'private affiliate helpers are security definer');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='private' and grantee in ('anon','authenticated') and routine_name in ('affiliate_is_admin','log_affiliate_event','affiliate_subject_is_available','prepare_checkout_intent_with_attribution','apply_affiliate_commission_adjustment')),0,'client roles cannot execute private affiliate helpers');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('request_affiliate_profile','admin_set_affiliate_profile_status','admin_configure_affiliate_terms','create_affiliate_link','deactivate_affiliate_link','record_affiliate_click','prepare_checkout_intent_with_attribution','admin_create_affiliate_payout','admin_mark_affiliate_payout_paid','admin_cancel_affiliate_payout','get_affiliate_portal','get_affiliate_admin_dashboard')),12,'twelve public affiliate RPCs exist');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='anon' and routine_name in ('request_affiliate_profile','admin_set_affiliate_profile_status','admin_configure_affiliate_terms','create_affiliate_link','deactivate_affiliate_link','record_affiliate_click','prepare_checkout_intent_with_attribution','admin_create_affiliate_payout','admin_mark_affiliate_payout_paid','admin_cancel_affiliate_payout','get_affiliate_portal','get_affiliate_admin_dashboard')),1,'anonymous can execute only the click RPC');
select is((select count(*)::integer from public.affiliate_profiles)+(select count(*)::integer from public.affiliate_subject_terms)+(select count(*)::integer from public.affiliate_links)+(select count(*)::integer from public.affiliate_clicks)+(select count(*)::integer from public.affiliate_attributions)+(select count(*)::integer from public.affiliate_commissions)+(select count(*)::integer from public.affiliate_payouts)+(select count(*)::integer from public.affiliate_payout_items)+(select count(*)::integer from public.affiliate_events),0,'affiliate schema starts empty');

select * from finish();
rollback;