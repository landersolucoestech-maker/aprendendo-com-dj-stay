begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select is(
  (
    select count(*)::integer
    from pg_proc function_record
    join pg_namespace schema_record on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'public'
      and function_record.proname in (
        'request_affiliate_profile',
        'admin_set_affiliate_profile_status',
        'admin_configure_affiliate_terms',
        'create_affiliate_link',
        'deactivate_affiliate_link',
        'record_affiliate_click',
        'prepare_checkout_intent_with_attribution',
        'admin_create_affiliate_payout',
        'admin_mark_affiliate_payout_paid',
        'admin_cancel_affiliate_payout',
        'get_affiliate_portal',
        'get_affiliate_admin_dashboard'
      )
  ),
  12,
  'twelve public B20 wrappers exist'
);

select is(
  (
    select count(*)::integer
    from pg_proc function_record
    join pg_namespace schema_record on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'public'
      and function_record.prosecdef
      and function_record.proname in (
        'request_affiliate_profile',
        'admin_set_affiliate_profile_status',
        'admin_configure_affiliate_terms',
        'create_affiliate_link',
        'deactivate_affiliate_link',
        'record_affiliate_click',
        'prepare_checkout_intent_with_attribution',
        'admin_create_affiliate_payout',
        'admin_mark_affiliate_payout_paid',
        'admin_cancel_affiliate_payout',
        'get_affiliate_portal',
        'get_affiliate_admin_dashboard'
      )
  ),
  0,
  'no public B20 wrapper uses security definer'
);

select is(
  (
    select count(*)::integer
    from pg_proc function_record
    join pg_namespace schema_record on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'private'
      and function_record.proname in (
        'request_affiliate_profile',
        'admin_set_affiliate_profile_status',
        'admin_configure_affiliate_terms',
        'create_affiliate_link',
        'deactivate_affiliate_link',
        'record_affiliate_click',
        'prepare_checkout_intent_with_attribution',
        'admin_create_affiliate_payout',
        'admin_mark_affiliate_payout_paid',
        'admin_cancel_affiliate_payout',
        'get_affiliate_portal',
        'get_affiliate_admin_dashboard'
      )
  ),
  12,
  'twelve private B20 implementations exist'
);

select ok(
  (
    select bool_and(function_record.prosecdef)
    from pg_proc function_record
    join pg_namespace schema_record on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'private'
      and function_record.proname in (
        'request_affiliate_profile',
        'admin_set_affiliate_profile_status',
        'admin_configure_affiliate_terms',
        'create_affiliate_link',
        'deactivate_affiliate_link',
        'record_affiliate_click',
        'prepare_checkout_intent_with_attribution',
        'admin_create_affiliate_payout',
        'admin_mark_affiliate_payout_paid',
        'admin_cancel_affiliate_payout',
        'get_affiliate_portal',
        'get_affiliate_admin_dashboard'
      )
  ),
  'private B20 implementations use security definer'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and grantee = 'anon'
      and routine_name in (
        'request_affiliate_profile',
        'admin_set_affiliate_profile_status',
        'admin_configure_affiliate_terms',
        'create_affiliate_link',
        'deactivate_affiliate_link',
        'record_affiliate_click',
        'prepare_checkout_intent_with_attribution',
        'admin_create_affiliate_payout',
        'admin_mark_affiliate_payout_paid',
        'admin_cancel_affiliate_payout',
        'get_affiliate_portal',
        'get_affiliate_admin_dashboard'
      )
  ),
  1,
  'anonymous can execute only the public click wrapper'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and grantee = 'authenticated'
      and routine_name in (
        'request_affiliate_profile',
        'admin_set_affiliate_profile_status',
        'admin_configure_affiliate_terms',
        'create_affiliate_link',
        'deactivate_affiliate_link',
        'record_affiliate_click',
        'prepare_checkout_intent_with_attribution',
        'admin_create_affiliate_payout',
        'admin_mark_affiliate_payout_paid',
        'admin_cancel_affiliate_payout',
        'get_affiliate_portal',
        'get_affiliate_admin_dashboard'
      )
  ),
  12,
  'authenticated can execute all public B20 wrappers'
);

select has_index('public','affiliate_profiles','affiliate_profiles_created_by_idx','affiliate profile creator FK is indexed');
select has_index('public','affiliate_subject_terms','affiliate_subject_terms_updated_by_idx','affiliate terms updater FK is indexed');
select has_index('public','affiliate_payouts','affiliate_payouts_paid_by_idx','affiliate payout payer FK is indexed');
select has_index('public','affiliate_events','affiliate_events_actor_idx','affiliate event actor FK is indexed');

select * from finish();
rollback;
