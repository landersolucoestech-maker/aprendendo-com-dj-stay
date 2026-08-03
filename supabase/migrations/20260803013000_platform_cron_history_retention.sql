-- FASE B94: retenção limitada do histórico nativo dos jobs PostgreSQL da plataforma.

create or replace function private.prune_platform_cron_run_history(
  p_retention_days integer default 30,
  p_limit integer default 5000
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_retention_days integer := coalesce(p_retention_days, 30);
  v_limit integer := coalesce(p_limit, 5000);
  v_cutoff timestamptz;
  v_deleted integer := 0;
begin
  if session_user <> 'postgres' then
    raise exception 'PLATFORM_CRON_EXECUTOR_REQUIRED' using errcode = '42501';
  end if;

  if v_retention_days not between 7 and 365 then
    raise exception 'PLATFORM_CRON_RETENTION_DAYS_INVALID' using errcode = '22023';
  end if;

  if v_limit not between 1 and 10000 then
    raise exception 'PLATFORM_CRON_RETENTION_LIMIT_INVALID' using errcode = '22023';
  end if;

  v_cutoff := statement_timestamp() - pg_catalog.make_interval(days => v_retention_days);

  with platform_jobs as (
    select job.jobid
    from cron.job as job
    where job.database = current_database()
      and job.jobname in (
        'expire-due-checkout-intents',
        'prune-platform-cron-run-history'
      )
  ), candidates as (
    select run.ctid
    from cron.job_run_details as run
    join platform_jobs as job on job.jobid = run.jobid
    where run.end_time is not null
      and run.end_time < v_cutoff
    order by run.end_time, run.runid
    limit v_limit
    for update of run skip locked
  ), deleted as (
    delete from cron.job_run_details as run
    using candidates
    where run.ctid = candidates.ctid
    returning run.runid
  )
  select count(*)::integer into v_deleted from deleted;

  return v_deleted;
end;
$$;

revoke all on function private.prune_platform_cron_run_history(integer, integer)
  from public, anon, authenticated, service_role;

create extension if not exists pg_cron with schema pg_catalog;

revoke all on schema cron from public, anon, authenticated, service_role;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
grant all privileges on all sequences in schema cron to postgres;
grant execute on all functions in schema cron to postgres;

-- Reaplicar a migration não pode duplicar o job.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select job.jobid
    from cron.job as job
    where job.jobname = 'prune-platform-cron-run-history'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'prune-platform-cron-run-history',
  '20 3 * * *',
  $cron$select private.prune_platform_cron_run_history(30, 5000);$cron$
);
