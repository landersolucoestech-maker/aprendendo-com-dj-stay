begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select has_type('public','frontend_error_maintenance_action','frontend error maintenance action enum exists');
select has_table('public','frontend_error_maintenance_events','frontend error maintenance audit table exists');
select has_column('public','frontend_error_maintenance_events','actor_user_id','maintenance audit preserves actor');
select has_column('public','frontend_error_maintenance_events','retention_days','maintenance audit preserves retention');
select has_column('public','frontend_error_maintenance_events','cutoff_at','maintenance audit preserves cutoff');
select has_column('public','frontend_error_maintenance_events','affected_rows','maintenance audit preserves affected rows');
select has_check('public','frontend_error_maintenance_events','maintenance audit has validation checks');

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.frontend_error_maintenance_events'::regclass),
  'frontend error maintenance audit forces RLS'
);
select is(
  (select count(*)::integer from pg_policies where schemaname='public' and tablename='frontend_error_maintenance_events'),
  1,
  'maintenance audit exposes one direct-deny policy'
);
select ok(
  exists(
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='frontend_error_maintenance_events'
      and policyname='frontend_error_maintenance_direct_access_denied'
      and permissive='RESTRICTIVE'
      and qual='false'
      and with_check='false'
  ),
  'maintenance audit policy is restrictive and denies direct access'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name='frontend_error_maintenance_events' and grantee in ('anon','authenticated')),
  0,
  'client roles have no direct maintenance audit grants'
);
select ok(
  exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='frontend_error_maintenance_events' and grantee='service_role' and privilege_type='SELECT'),
  'service role retains maintenance audit access'
);
select has_pk('public','frontend_error_maintenance_events','maintenance audit has primary key');
select has_fk('public','frontend_error_maintenance_events','maintenance audit has actor foreign key');
select has_index('public','frontend_error_maintenance_events','frontend_error_maintenance_events_actor_idx','maintenance actor foreign key is indexed');
select has_index('public','frontend_error_maintenance_events','frontend_error_maintenance_events_created_idx','maintenance history is indexed by creation');

select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0,
  'capture serializes quota checks with an advisory transaction lock'
);
select ok(
  position('hashtextextended' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0,
  'capture derives the advisory lock from the authenticated user'
);
select ok(
  position('v_recent_count >= 120' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0,
  'capture limits distinct incidents to one hundred twenty per rolling hour'
);
select ok(
  position('FRONTEND_ERROR_RATE_LIMITED' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0,
  'capture exposes an explicit quota error'
);
select ok(
  position('where event_id = p_event_id' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure))
  < position('select count(*)::integer' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)),
  'same-user duplicate detection occurs before quota consumption'
);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='purge_frontend_error_events'),
  1,
  'private retention function exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='purge_frontend_error_events'),
  'private retention function is security definer'
);
select ok(
  (select r.rolbypassrls from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.proname='purge_frontend_error_events'),
  'private retention owner intentionally bypasses RLS'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='purge_frontend_error_events'),
  1,
  'public retention RPC exists'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='purge_frontend_error_events' and p.prosecdef),
  0,
  'public retention RPC is security invoker'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='purge_frontend_error_events' and grantee='anon'),
  0,
  'anonymous users cannot execute retention'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='purge_frontend_error_events' and grantee='authenticated'),
  1,
  'authenticated users can execute the admin-guarded retention RPC'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0,
  'retention requires owner administrator role'
);
select ok(
  position('not between 30 and 3650' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0
  and position('not between 1 and 5000' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0,
  'retention and batch limits are bounded'
);
select ok(
  position('for update skip locked' in lower(pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure))) > 0,
  'retention uses bounded concurrent-safe row locking'
);
select ok(
  position('resolved' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0
  and position('ignored' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0
  and position('resolved_at < v_cutoff' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0,
  'retention deletes only old closed incidents'
);
select ok(
  position('insert into public.frontend_error_maintenance_events' in pg_get_functiondef('private.purge_frontend_error_events(integer,integer)'::regprocedure)) > 0,
  'every retention execution writes an audit event'
);
select is((select count(*)::integer from public.frontend_error_maintenance_events),0,'maintenance audit starts empty');
select ok(
  not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='frontend_error_maintenance_events'
      and (column_name ilike '%ip%' or column_name ilike '%user_agent%')
  ),
  'maintenance audit stores no raw IP or user agent'
);
select ok(
  not exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('purge_frontend_error_events')
      and p.prosecdef
  ),
  'no public retention function uses security definer'
);

select * from finish();
rollback;
