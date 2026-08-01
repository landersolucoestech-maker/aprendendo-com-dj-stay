begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_payment_admin_dashboard'),
  1,
  'private payment admin dashboard exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_payment_admin_dashboard'),
  'private payment dashboard is security definer'
);
select ok(
  (select r.rolbypassrls from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.proname='get_payment_admin_dashboard'),
  'private payment dashboard owner bypasses RLS intentionally'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_payment_admin_dashboard'),
  1,
  'public payment admin dashboard exists'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_payment_admin_dashboard' and p.prosecdef),
  0,
  'public payment dashboard is security invoker'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='get_payment_admin_dashboard' and grantee='anon'),
  0,
  'anonymous users cannot execute payment dashboard'
);
select is(
  (select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='get_payment_admin_dashboard' and grantee='authenticated'),
  1,
  'authenticated users can execute admin-guarded payment dashboard'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure)) > 0,
  'payment dashboard requires owner administrator role'
);
select ok(
  position('least(coalesce(p_limit, 50), 200)' in pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure)) > 0,
  'payment dashboard limit is bounded'
);
select ok(
  position('greatest(coalesce(p_offset, 0), 0)' in pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure)) > 0,
  'payment dashboard offset is nonnegative'
);
select ok(
  position('left join auth.users' in lower(pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure))) > 0,
  'payment dashboard resolves customer email server-side'
);
select ok(
  position('left join lateral' in lower(pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure))) > 0,
  'payment dashboard resolves latest attempt and entitlement'
);
select ok(
  position('payment_confirmed_at is not null' in lower(pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure))) > 0,
  'payment dashboard reports confirmed amount'
);
select ok(
  position('order by payment_order.created_at desc, payment_order.id desc' in lower(pg_get_functiondef('private.get_payment_admin_dashboard(public.payment_order_status,public.checkout_subject_type,text,integer,integer)'::regprocedure))) > 0,
  'payment dashboard has stable descending order'
);
select is(
  (select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('payment_orders','payment_attempts','payment_entitlements','payment_provider_events') and grantee in ('anon','authenticated')),
  0,
  'payment dashboard does not add direct finance table grants'
);
select ok(
  not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_payment_admin_dashboard' and p.prosecdef),
  'no public payment wrapper uses security definer'
);

select * from finish();
rollback;
