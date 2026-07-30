begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_type('public', 'asset_purpose', 'asset purpose enum exists');
select ok(
  (
    select array_agg(enumlabel::text order by enumsortorder)
    from pg_enum
    where enumtypid = 'public.asset_purpose'::regtype
  ) = array[
    'avatar','video','audio','image','document','sample','preset','stem','project',
    'archive','template','support_file','digital_product'
  ]::text[],
  'asset purposes are explicit and closed'
);
select has_type('public', 'asset_state', 'asset state enum exists');
select ok(
  (
    select array_agg(enumlabel::text order by enumsortorder)
    from pg_enum
    where enumtypid = 'public.asset_state'::regtype
  ) = array['pending','uploaded','processing','published','failed']::text[],
  'asset lifecycle states are explicit and closed'
);
select has_type('public', 'asset_event_type', 'asset event enum exists');
select has_table('public', 'assets', 'assets table exists');
select has_table('public', 'asset_events', 'asset audit events table exists');
select has_table('public', 'asset_access_grants', 'per-user asset grants table exists');
select hasnt_table('public', 'lesson_files', 'legacy free-form lesson paths were removed');
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_profiles' and column_name='avatar_asset_id'
  ),
  'profile stores avatar asset id'
);
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_profiles' and column_name='avatar_url'
  ),
  'profile no longer stores permanent avatar URL'
);
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.assets'::regclass), 'assets has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.asset_events'::regclass), 'asset events has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.asset_access_grants'::regclass), 'asset grants has forced RLS');
select is((select count(*)::integer from storage.buckets where id='private-assets' and public=false), 1, 'private asset bucket exists and is private');
select is((select file_size_limit from storage.buckets where id='private-assets'), 5368709120::bigint, 'bucket enforces global five-gigabyte ceiling');
select is((select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'private_assets_%'), 4, 'storage object lifecycle has four policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename in ('assets','asset_events','asset_access_grants')), 3, 'asset metadata tables expose only three read policies');
select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and p.proname in ('prepare_asset_upload','confirm_asset_upload','transition_asset_state','fail_asset_upload','grant_asset_access','revoke_asset_access')
  ),
  6,
  'six audited public RPCs use security definer'
);
select ok(
  (
    select array_agg(p.proname order by p.proname)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  ) = array[
    'confirm_asset_upload','fail_asset_upload','grant_asset_access','prepare_asset_upload',
    'revoke_asset_access','transition_asset_state'
  ]::name[],
  'no unexpected public security definer function exists'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.prosecdef),
  3,
  'private schema contains only role helpers and asset event logger as security definers'
);
select is(
  (
    select count(*)::integer
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.prosecdef and n.nspname in ('public','private')
      and p.proconfig = array['search_path=""']::text[]
  ),
  9,
  'every security definer function fixes an empty search path'
);
select is(
  (
    select count(*)::integer
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  0,
  'anon cannot execute asset RPCs'
);
select is(
  (
    select count(*)::integer
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  6,
  'authenticated role can invoke the six controlled RPCs'
);
select ok(
  not has_table_privilege('anon','public.assets','SELECT')
  and not has_table_privilege('anon','public.asset_events','SELECT')
  and not has_table_privilege('anon','public.asset_access_grants','SELECT'),
  'anon has no asset table privileges'
);
select is(
  (select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and 'anon'::name = any(roles)),
  0,
  'storage policies never target anon'
);
select is(
  (select count(*)::integer from pg_constraint where conrelid='public.assets'::regclass and contype='u' and conname='assets_unique_object_path'),
  1,
  'bucket and object path are globally unique'
);
select is(
  (select count(*)::integer from pg_trigger where not tgisinternal and tgname='assets_set_updated_at'),
  1,
  'asset timestamp trigger exists once'
);

select * from finish();
rollback;
