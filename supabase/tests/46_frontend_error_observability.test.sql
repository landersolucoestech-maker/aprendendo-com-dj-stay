begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_type('public','frontend_error_source','frontend error source enum exists');
select has_type('public','frontend_error_status','frontend error status enum exists');
select has_table('public','frontend_error_events','frontend error events table exists');
select has_column('public','frontend_error_events','event_id','frontend error has idempotency event id');
select has_column('public','frontend_error_events','source','frontend error preserves source');
select has_column('public','frontend_error_events','status','frontend error has treatment status');
select has_column('public','frontend_error_events','component_stack','frontend error preserves bounded component stack');
select has_column('public','frontend_error_events','metadata','frontend error has bounded metadata');
select has_pk('public','frontend_error_events','frontend errors have primary key');
select has_check('public','frontend_error_events','frontend errors have validation checks');

select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.frontend_error_events'::regclass),
  'frontend errors force RLS'
);
select is(
  (select count(*)::integer from pg_policies where schemaname='public' and tablename='frontend_error_events'),
  1,
  'frontend errors expose one explicit direct-deny policy'
);
select ok(
  exists(
    select 1 from pg_policies
    where schemaname='public'
      and tablename='frontend_error_events'
      and policyname='frontend_error_events_direct_access_denied'
      and permissive='RESTRICTIVE'
      and qual='false'
      and with_check='false'
  ),
  'frontend direct access policy is restrictive and denies reads and writes'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name='frontend_error_events' and grantee in ('anon','authenticated')),
  0,
  'client roles have no direct frontend error table grants'
);
select ok(
  exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='frontend_error_events' and grantee='service_role' and privilege_type='SELECT'),
  'service role retains frontend error table access'
);

select has_index('public','frontend_error_events','frontend_error_events_status_occurred_idx','frontend errors are indexed by status and occurrence');
select has_index('public','frontend_error_events','frontend_error_events_source_occurred_idx','frontend errors are indexed by source and occurrence');
select has_index('public','frontend_error_events','frontend_error_events_user_occurred_idx','frontend errors are indexed by user and occurrence');
select has_index('public','frontend_error_events','frontend_error_events_route_occurred_idx','frontend errors are indexed by route and occurrence');
select has_index('public','frontend_error_events','frontend_error_events_release_occurred_idx','frontend errors are indexed by release and occurrence');
select has_index('public','frontend_error_events','frontend_error_events_handled_by_idx','frontend error handler foreign key is covered');
select ok(
  exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.frontend_error_events'::regclass and tgname='frontend_error_events_set_updated_at'),
  'frontend error updates are timestamped'
);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status')),
  3,
  'three private frontend error functions exist'
);
select ok(
  (select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status')),
  'private frontend error functions are security definer'
);
select ok(
  (select bool_and(r.rolbypassrls) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.proname in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status')),
  'private frontend error function owners bypass RLS intentionally'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status')),
  3,
  'three public frontend error RPCs exist'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status') and p.prosecdef),
  0,
  'public frontend error RPCs are security invoker'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='anon' and routine_name in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status')),
  0,
  'anonymous users cannot execute frontend error RPCs'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='authenticated' and routine_name in ('capture_frontend_error','get_frontend_error_dashboard','update_frontend_error_status')),
  3,
  'authenticated users can execute the guarded frontend error RPCs'
);
select is((select count(*)::integer from public.frontend_error_events),0,'frontend error schema starts empty');
select ok(
  not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='frontend_error_events'
      and (column_name ilike '%ip%' or column_name ilike '%user_agent%')
  ),
  'frontend observability stores no raw IP or user agent column'
);
select ok(
  position('[EMAIL_REDACTED]' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0
  and position('[JWT_REDACTED]' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0
  and position('[TOKEN_REDACTED]' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0,
  'capture function redacts email, JWT and bearer token material'
);
select ok(
  position('AUTH_REQUIRED' in pg_get_functiondef('private.capture_frontend_error(uuid,public.frontend_error_source,text,text,text,text,text,jsonb)'::regprocedure)) > 0,
  'capture function requires an authenticated user'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.get_frontend_error_dashboard(public.frontend_error_status,public.frontend_error_source,text,integer,integer)'::regprocedure)) > 0
  and position('ADMIN_REQUIRED' in pg_get_functiondef('private.update_frontend_error_status(uuid,public.frontend_error_status,text)'::regprocedure)) > 0,
  'frontend error administration requires owner administrator role'
);
select ok(
  not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%frontend_error%' and p.prosecdef),
  'no public frontend error function uses security definer'
);

select * from finish();
rollback;
