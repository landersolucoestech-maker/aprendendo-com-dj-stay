begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_my_payment_history'),1,'private student payment history exists');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_my_payment_history'),'private student history is security definer');
select ok((select r.rolbypassrls from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='private' and p.proname='get_my_payment_history'),'private student history owner bypasses RLS intentionally');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_payment_history'),1,'public student payment history exists');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_my_payment_history' and p.prosecdef),0,'public student history is security invoker');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='get_my_payment_history' and grantee='anon'),0,'anonymous users cannot execute student history');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and routine_name='get_my_payment_history' and grantee='authenticated'),1,'authenticated users can execute own history');
select ok(position('AUTH_REQUIRED' in pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure)) > 0,'student history requires authentication');
select ok(position('payment_order.user_id = v_user_id' in pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure)) > 0,'student history scopes orders to auth uid');
select ok(position('least(coalesce(p_limit, 50), 100)' in pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure)) > 0,'student history limit is bounded');
select ok(position('greatest(coalesce(p_offset, 0), 0)' in pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure)) > 0,'student history offset is nonnegative');
select ok(position('left join lateral' in lower(pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure))) > 0,'student history resolves latest attempt and entitlement');
select ok(position('order by payment_order.created_at desc, payment_order.id desc' in lower(pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure))) > 0,'student history has stable descending order');
select ok(position('payload' in lower(pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure))) = 0,'student history does not expose provider payload');
select ok(position('payment_provider_events' in lower(pg_get_functiondef('private.get_my_payment_history(integer,integer)'::regprocedure))) = 0,'student history does not expose provider event table');

select * from finish();
rollback;
