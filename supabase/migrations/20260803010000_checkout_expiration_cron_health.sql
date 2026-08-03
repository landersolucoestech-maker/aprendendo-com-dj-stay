-- FASE B93: read model administrativo sanitizado para a saúde do cron de expiração.

create or replace function private.get_checkout_expiration_cron_health(
  p_run_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_limit integer := least(greatest(coalesce(p_run_limit, 10), 1), 25);
  v_result jsonb;
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  with target_job as (
    select
      job.jobid,
      job.schedule,
      job.active
    from cron.job as job
    where job.jobname = 'expire-due-checkout-intents'
      and job.database = current_database()
    order by job.jobid desc
    limit 1
  ),
  latest_run as (
    select
      run.status,
      run.start_time,
      run.end_time
    from cron.job_run_details as run
    join target_job as job on job.jobid = run.jobid
    order by run.start_time desc nulls last, run.runid desc
    limit 1
  ),
  run_summary as (
    select
      count(*) filter (
        where run.status not in ('succeeded', 'running')
          and run.start_time >= statement_timestamp() - interval '24 hours'
      )::integer as failed_runs_24h,
      max(run.start_time) filter (where run.status = 'succeeded') as last_success_at
    from cron.job_run_details as run
    join target_job as job on job.jobid = run.jobid
  ),
  recent_runs as (
    select
      run.status,
      run.start_time,
      run.end_time,
      greatest(
        0,
        floor(
          extract(epoch from (coalesce(run.end_time, statement_timestamp()) - run.start_time)) * 1000
        )::bigint
      ) as duration_ms,
      case
        when run.status in ('succeeded', 'running') then null
        else nullif(
          left(
            regexp_replace(
              coalesce(run.return_message, 'Falha sem mensagem registrada.'),
              '[[:cntrl:]]+',
              ' ',
              'g'
            ),
            500
          ),
          ''
        )
      end as message
    from cron.job_run_details as run
    join target_job as job on job.jobid = run.jobid
    order by run.start_time desc nulls last, run.runid desc
    limit v_limit
  ),
  recent_runs_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', recent_run.status,
          'started_at', recent_run.start_time,
          'ended_at', recent_run.end_time,
          'duration_ms', recent_run.duration_ms,
          'message', recent_run.message
        )
        order by recent_run.start_time desc nulls last
      ),
      '[]'::jsonb
    ) as runs
    from recent_runs as recent_run
  )
  select jsonb_build_object(
    'job_name', 'expire-due-checkout-intents',
    'configured', job.jobid is not null,
    'active', coalesce(job.active, false),
    'schedule', job.schedule,
    'health', case
      when job.jobid is null then 'missing'
      when not job.active then 'inactive'
      when latest.start_time is null then 'never_run'
      when latest.status = 'running' then 'running'
      when latest.status = 'succeeded' and coalesce(summary.failed_runs_24h, 0) = 0 then 'healthy'
      else 'degraded'
    end,
    'last_run_status', latest.status,
    'last_run_at', latest.start_time,
    'last_success_at', summary.last_success_at,
    'failed_runs_24h', coalesce(summary.failed_runs_24h, 0),
    'observed_at', statement_timestamp(),
    'runs', recent.runs
  ) into v_result
  from (select 1) as singleton
  left join target_job as job on true
  left join latest_run as latest on true
  left join run_summary as summary on true
  cross join recent_runs_json as recent;

  return v_result;
end;
$$;

revoke all on function private.get_checkout_expiration_cron_health(integer)
  from public, anon;
grant execute on function private.get_checkout_expiration_cron_health(integer)
  to authenticated, service_role;

create or replace function public.get_checkout_expiration_cron_health(
  p_run_limit integer default 10
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_checkout_expiration_cron_health(p_run_limit)
$$;

revoke all on function public.get_checkout_expiration_cron_health(integer)
  from public, anon;
grant execute on function public.get_checkout_expiration_cron_health(integer)
  to authenticated;
