begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select has_function(
  'private',
  'prune_platform_cron_run_history',
  array['integer', 'integer'],
  'private platform cron retention function exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'prune_platform_cron_run_history'),
  'platform cron retention is security definer'
);
select is(
  (select p.provolatile::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'prune_platform_cron_run_history'),
  'v',
  'platform cron retention is volatile'
);
select ok(
  not has_function_privilege('anon', 'private.prune_platform_cron_run_history(integer,integer)', 'EXECUTE'),
  'anonymous users cannot prune cron history'
);
select ok(
  not has_function_privilege('authenticated', 'private.prune_platform_cron_run_history(integer,integer)', 'EXECUTE'),
  'authenticated users cannot prune cron history'
);
select ok(
  not has_function_privilege('service_role', 'private.prune_platform_cron_run_history(integer,integer)', 'EXECUTE'),
  'service role cannot prune cron history'
);
select ok(
  position('session_user <> ''postgres''' in pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure)) > 0,
  'platform cron retention requires the postgres session executor'
);
select ok(
  position('not between 7 and 365' in pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure)) > 0,
  'platform cron retention bounds the retention window'
);
select ok(
  position('not between 1 and 10000' in pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure)) > 0,
  'platform cron retention bounds the deletion batch'
);
select ok(
  position('run.end_time is not null' in pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure)) > 0,
  'platform cron retention preserves executions still running'
);
select ok(
  position('expire-due-checkout-intents' in pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure)) > 0
  and position('prune-platform-cron-run-history' in pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure)) > 0,
  'platform cron retention is restricted to named platform jobs'
);
select ok(
  position('for update of run skip locked' in lower(pg_get_functiondef('private.prune_platform_cron_run_history(integer,integer)'::regprocedure))) > 0,
  'platform cron retention uses skip locked for concurrent batches'
);
select is(
  (select count(*)::integer from cron.job where jobname = 'prune-platform-cron-run-history'),
  1,
  'exactly one platform cron retention job exists'
);
select ok(
  (select active from cron.job where jobname = 'prune-platform-cron-run-history'),
  'platform cron retention job is active'
);
select ok(
  (select schedule::text = '20 3 * * *' from cron.job where jobname = 'prune-platform-cron-run-history'),
  'platform cron retention runs daily at 03:20 UTC'
);
select ok(
  (select username::text = 'postgres' from cron.job where jobname = 'prune-platform-cron-run-history'),
  'platform cron retention job runs as postgres'
);
select ok(
  (select database::text = current_database() from cron.job where jobname = 'prune-platform-cron-run-history'),
  'platform cron retention job targets the current database'
);
select ok(
  (select btrim(command) = 'select private.prune_platform_cron_run_history(30, 5000);' from cron.job where jobname = 'prune-platform-cron-run-history'),
  'platform cron retention job calls only the bounded private function'
);
select ok(
  cron.schedule('b94-unrelated-job', '40 4 * * *', 'select 1;') is not null,
  'rollback-only fixture creates an unrelated cron job'
);

select cron.alter_job(
  (select jobid from cron.job where jobname = 'expire-due-checkout-intents'),
  active := false
);
select cron.alter_job(
  (select jobid from cron.job where jobname = 'prune-platform-cron-run-history'),
  active := false
);
select cron.alter_job(
  (select jobid from cron.job where jobname = 'b94-unrelated-job'),
  active := false
);

delete from cron.job_run_details
where runid between 9400000001 and 9400000006;

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9400000001, pg_backend_pid(), current_database(), 'postgres', command, 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '40 days 1 minute', statement_timestamp() - interval '40 days'
from cron.job where jobname = 'expire-due-checkout-intents';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9400000002, pg_backend_pid(), current_database(), 'postgres', command, 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '35 days 1 minute', statement_timestamp() - interval '35 days'
from cron.job where jobname = 'prune-platform-cron-run-history';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9400000003, pg_backend_pid(), current_database(), 'postgres', command, 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '2 days 1 minute', statement_timestamp() - interval '2 days'
from cron.job where jobname = 'expire-due-checkout-intents';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9400000004, pg_backend_pid(), current_database(), 'postgres', command, 'running', null,
  statement_timestamp() - interval '60 days', null
from cron.job where jobname = 'expire-due-checkout-intents';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9400000005, pg_backend_pid(), current_database(), 'postgres', command, 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '60 days 1 minute', statement_timestamp() - interval '60 days'
from cron.job where jobname = 'b94-unrelated-job';

insert into cron.job_run_details(
  jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
)
select jobid, 9400000006, pg_backend_pid(), current_database(), 'postgres', command, 'succeeded', 'SELECT 1',
  statement_timestamp() - interval '50 days 1 minute', statement_timestamp() - interval '50 days'
from cron.job where jobname = 'expire-due-checkout-intents';

select is(
  private.prune_platform_cron_run_history(30, 1),
  1,
  'first retention batch respects the requested limit'
);
select ok(
  not exists(select 1 from cron.job_run_details where runid = 9400000006),
  'first retention batch removes the oldest eligible platform run'
);
select ok(
  exists(select 1 from cron.job_run_details where runid = 9400000001),
  'first retention batch leaves the next old checkout run for a later batch'
);
select ok(
  exists(select 1 from cron.job_run_details where runid = 9400000002),
  'first retention batch leaves the old retention-job run for a later batch'
);
select is(
  private.prune_platform_cron_run_history(30, 10),
  2,
  'second retention batch removes the remaining eligible platform runs'
);
select ok(
  not exists(select 1 from cron.job_run_details where runid = 9400000001),
  'old checkout expiration history is removed'
);
select ok(
  not exists(select 1 from cron.job_run_details where runid = 9400000002),
  'old retention-job history is removed'
);
select ok(
  exists(select 1 from cron.job_run_details where runid = 9400000003),
  'recent platform history is preserved'
);
select ok(
  exists(select 1 from cron.job_run_details where runid = 9400000004),
  'running platform execution is preserved regardless of age'
);
select ok(
  exists(select 1 from cron.job_run_details where runid = 9400000005),
  'old history from an unrelated cron job is preserved'
);
select is(
  private.prune_platform_cron_run_history(30, 10),
  0,
  'retention batch is idempotent after eligible history is removed'
);
select throws_ok(
  $$select private.prune_platform_cron_run_history(6, 100)$$,
  '22023',
  'PLATFORM_CRON_RETENTION_DAYS_INVALID',
  'retention window below seven days is rejected'
);
select throws_ok(
  $$select private.prune_platform_cron_run_history(366, 100)$$,
  '22023',
  'PLATFORM_CRON_RETENTION_DAYS_INVALID',
  'retention window above one year is rejected'
);
select throws_ok(
  $$select private.prune_platform_cron_run_history(30, 0)$$,
  '22023',
  'PLATFORM_CRON_RETENTION_LIMIT_INVALID',
  'zero-sized retention batch is rejected'
);
select throws_ok(
  $$select private.prune_platform_cron_run_history(30, 10001)$$,
  '22023',
  'PLATFORM_CRON_RETENTION_LIMIT_INVALID',
  'oversized retention batch is rejected'
);
select ok(
  cron.unschedule('prune-platform-cron-run-history'),
  'platform cron retention job can be removed inside the rollback-only fixture'
);
select ok(
  cron.unschedule('b94-unrelated-job'),
  'unrelated fixture job can be removed inside the rollback-only fixture'
);

select * from finish();
rollback;
