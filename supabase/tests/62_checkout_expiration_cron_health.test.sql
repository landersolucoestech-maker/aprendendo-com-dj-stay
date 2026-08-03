begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select has_function(
  'private',
  'get_checkout_expiration_cron_health',
  array['integer'],
  'private checkout cron health read model exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'get_checkout_expiration_cron_health'),
  'private checkout cron health read model is security definer'
);
select is(
  (select p.provolatile::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'get_checkout_expiration_cron_health'),
  's',
  'private checkout cron health read model is stable'
);
select ok(
  (select role.rolbypassrls from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_roles role on role.oid = p.proowner where n.nspname = 'private' and p.proname = 'get_checkout_expiration_cron_health'),
  'private checkout cron health owner intentionally bypasses RLS'
);
select has_function(
  'public',
  'get_checkout_expiration_cron_health',
  array['integer'],
  'public checkout cron health RPC exists'
);
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_checkout_expiration_cron_health'),
  'public checkout cron health RPC is security invoker'
);
select ok(
  not has_function_privilege('anon', 'public.get_checkout_expiration_cron_health(integer)', 'EXECUTE'),
  'anonymous users cannot inspect checkout cron health'
);
select ok(
  has_function_privilege('authenticated', 'public.get_checkout_expiration_cron_health(integer)', 'EXECUTE'),
  'authenticated users can reach the owner-guarded checkout cron health RPC'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.get_checkout_expiration_cron_health(integer)'::regprocedure)) > 0,
  'checkout cron health requires owner administrator role'
);
select ok(
  position('least(greatest(coalesce(p_run_limit, 10), 1), 25)' in pg_get_functiondef('private.get_checkout_expiration_cron_health(integer)'::regprocedure)) > 0,
  'checkout cron health bounds recent runs between one and twenty-five'
);
select ok(
  position('run.command' in lower(pg_get_functiondef('private.get_checkout_expiration_cron_health(integer)'::regprocedure))) = 0,
  'checkout cron health does not project the scheduled SQL command'
);
select ok(
  not has_schema_privilege('authenticated', 'cron', 'USAGE'),
  'authenticated users receive no direct usage on the cron schema'
);
select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'cron'
      and table_name in ('job', 'job_run_details')
      and grantee = 'authenticated'
  ),
  0,
  'authenticated users receive no direct cron table grants'
);

insert into auth.users(id, email) values
  ('b9300000-0000-4000-8000-000000000101', 'b93-owner@example.test'),
  ('b9300000-0000-4000-8000-000000000102', 'b93-student@example.test');

update public.user_roles
set role = 'administrador_proprietario'::public.app_role
where user_id = 'b9300000-0000-4000-8000-000000000101';

select cron.alter_job(
  (select jobid from cron.job where jobname = 'expire-due-checkout-intents'),
  active := false
);
delete from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'expire-due-checkout-intents');
select cron.alter_job(
  (select jobid from cron.job where jobname = 'expire-due-checkout-intents'),
  active := true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9300000-0000-4000-8000-000000000102","role":"authenticated","session_id":"b9300000-0000-4000-8000-000000000802","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.get_checkout_expiration_cron_health(10)$$,
  '42501',
  'ADMIN_REQUIRED',
  'student cannot inspect checkout cron health'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b9300000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9300000-0000-4000-8000-000000000801","is_anonymous":false}',
  true
);
select ok(
  (public.get_checkout_expiration_cron_health(10)->>'configured')::boolean,
  'owner sees the checkout expiration job as configured'
);
select ok(
  (public.get_checkout_expiration_cron_health(10)->>'active')::boolean,
  'owner sees the checkout expiration job as active'
);
select is(
  public.get_checkout_expiration_cron_health(10)->>'schedule',
  '*/5 * * * *',
  'owner sees the five-minute schedule'
);
select is(
  public.get_checkout_expiration_cron_health(10)->>'health',
  'never_run',
  'configured job without history is reported as never run'
);
select is(
  jsonb_array_length(public.get_checkout_expiration_cron_health(10)->'runs'),
  0,
  'configured job without history returns an empty run list'
);
select ok(
  public.get_checkout_expiration_cron_health(10)::text !~ '"(command|username|database|job_pid|jobid|runid)"',
  'checkout cron health payload omits internal cron metadata'
);
reset role;

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9300000001, pg_backend_pid(), current_database(), 'postgres',
  'select private.expire_due_checkout_intents(100)', 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '2 hours', statement_timestamp() - interval '2 hours' + interval '120 milliseconds'
from cron.job where jobname = 'expire-due-checkout-intents';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9300000002, pg_backend_pid(), current_database(), 'postgres',
  'select private.expire_due_checkout_intents(100)', 'failed', E'Falha controlada\nsem expor comando',
  statement_timestamp() - interval '1 hour', statement_timestamp() - interval '1 hour' + interval '80 milliseconds'
from cron.job where jobname = 'expire-due-checkout-intents';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9300000003, pg_backend_pid(), current_database(), 'postgres',
  'select private.expire_due_checkout_intents(100)', 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '10 minutes', statement_timestamp() - interval '10 minutes' + interval '95 milliseconds'
from cron.job where jobname = 'expire-due-checkout-intents';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9300000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9300000-0000-4000-8000-000000000801","is_anonymous":false}',
  true
);
select is(
  public.get_checkout_expiration_cron_health(2)->>'health',
  'degraded',
  'a recent failed execution degrades cron health'
);
select is(
  public.get_checkout_expiration_cron_health(2)->>'last_run_status',
  'succeeded',
  'latest run status is reported without exposing its identifier'
);
select is(
  (public.get_checkout_expiration_cron_health(2)->>'failed_runs_24h')::integer,
  1,
  'failed executions from the last twenty-four hours are counted'
);
select is(
  jsonb_array_length(public.get_checkout_expiration_cron_health(2)->'runs'),
  2,
  'requested recent run limit is applied'
);
select is(
  public.get_checkout_expiration_cron_health(2) #>> '{runs,0,status}',
  'succeeded',
  'recent runs are ordered from newest to oldest'
);
select is(
  public.get_checkout_expiration_cron_health(2) #>> '{runs,1,status}',
  'failed',
  'failed run remains visible in the bounded history'
);
select ok(
  position(E'\n' in coalesce(public.get_checkout_expiration_cron_health(2) #>> '{runs,1,message}', '')) = 0,
  'failure message removes control characters'
);
select ok(
  length(coalesce(public.get_checkout_expiration_cron_health(2) #>> '{runs,1,message}', '')) <= 500,
  'failure message is bounded to five hundred characters'
);
select is(
  jsonb_array_length(public.get_checkout_expiration_cron_health(0)->'runs'),
  1,
  'invalid low run limit is clamped to one'
);
select ok(
  (public.get_checkout_expiration_cron_health(2)->>'observed_at') is not null,
  'cron health includes the server observation timestamp'
);
reset role;

select cron.alter_job(
  (select jobid from cron.job where jobname = 'expire-due-checkout-intents'),
  active := false
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9300000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9300000-0000-4000-8000-000000000801","is_anonymous":false}',
  true
);
select is(
  public.get_checkout_expiration_cron_health(2)->>'health',
  'inactive',
  'inactive checkout expiration job is reported explicitly'
);
reset role;

select ok(
  cron.unschedule('expire-due-checkout-intents'),
  'checkout expiration job can be removed inside the rollback-only fixture'
);
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9300000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9300000-0000-4000-8000-000000000801","is_anonymous":false}',
  true
);
select ok(
  not (public.get_checkout_expiration_cron_health(2)->>'configured')::boolean,
  'missing checkout expiration job is reported as not configured'
);
select is(
  public.get_checkout_expiration_cron_health(2)->>'health',
  'missing',
  'missing checkout expiration job has an explicit health state'
);
reset role;

select * from finish();
rollback;
