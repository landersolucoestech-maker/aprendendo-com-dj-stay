begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_frontend_error_maintenance_history'),
  1,
  'private maintenance history function exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_frontend_error_maintenance_history'),
  'private history function is security definer'
);
select ok(
  (select r.rolbypassrls from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.proname='get_frontend_error_maintenance_history'),
  'private history owner intentionally bypasses RLS'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_frontend_error_maintenance_history'),
  1,
  'public maintenance history RPC exists'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_frontend_error_maintenance_history' and p.prosecdef),
  0,
  'public history RPC is security invoker'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='get_frontend_error_maintenance_history' and grantee='anon'),
  0,
  'anonymous users cannot execute maintenance history'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='get_frontend_error_maintenance_history' and grantee='authenticated'),
  1,
  'authenticated users can execute admin-guarded history RPC'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.get_frontend_error_maintenance_history(integer,integer)'::regprocedure)) > 0,
  'history requires owner administrator role'
);
select ok(
  position('least(coalesce(p_limit, 50), 200)' in pg_get_functiondef('private.get_frontend_error_maintenance_history(integer,integer)'::regprocedure)) > 0,
  'history limit is bounded to two hundred rows'
);
select ok(
  position('greatest(coalesce(p_offset, 0), 0)' in pg_get_functiondef('private.get_frontend_error_maintenance_history(integer,integer)'::regprocedure)) > 0,
  'history offset cannot be negative'
);
select ok(
  position('''total''' in pg_get_functiondef('private.get_frontend_error_maintenance_history(integer,integer)'::regprocedure)) > 0,
  'history returns total count'
);
select ok(
  position('order by created_at desc, id desc' in lower(pg_get_functiondef('private.get_frontend_error_maintenance_history(integer,integer)'::regprocedure))) > 0,
  'history has stable descending order'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name='frontend_error_maintenance_events' and grantee in ('anon','authenticated')),
  0,
  'history does not require direct client table grants'
);
select ok(
  not exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='get_frontend_error_maintenance_history' and p.prosecdef
  ),
  'no public history wrapper uses security definer'
);

select * from finish();
rollback;
