begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select ok(
  to_regprocedure('private.prune_anonymous_mutation_rate_limits(integer)') is not null,
  'anonymous rate-limit retention function exists'
);

select ok(
  (
    select function.prosecdef
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname = 'prune_anonymous_mutation_rate_limits'
      and pg_get_function_identity_arguments(function.oid) = 'p_delete_limit integer'
  ),
  'retention function is SECURITY DEFINER'
);

select ok(
  (
    select strpos(pg_get_functiondef(function.oid), 'SET search_path TO') > 0
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname = 'prune_anonymous_mutation_rate_limits'
      and pg_get_function_identity_arguments(function.oid) = 'p_delete_limit integer'
  ),
  'retention function fixes an empty search_path'
);

select ok(
  (
    select pg_get_functiondef(function.oid) like '%session_user <> ''postgres''%'
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname = 'prune_anonymous_mutation_rate_limits'
      and pg_get_function_identity_arguments(function.oid) = 'p_delete_limit integer'
  ),
  'retention function requires the postgres session executor'
);

select ok(
  (
    select lower(pg_get_functiondef(function.oid)) like '%for update skip locked%'
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname = 'prune_anonymous_mutation_rate_limits'
      and pg_get_function_identity_arguments(function.oid) = 'p_delete_limit integer'
  ),
  'retention function skips rows locked by concurrent maintenance'
);

select ok(
  (
    select pg_get_functiondef(function.oid) like '%p_delete_limit not between 1 and 10000%'
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and function.proname = 'prune_anonymous_mutation_rate_limits'
      and pg_get_function_identity_arguments(function.oid) = 'p_delete_limit integer'
  ),
  'retention function enforces a bounded batch size'
);

select ok(
  not has_function_privilege(
    'public',
    'private.prune_anonymous_mutation_rate_limits(integer)'::regprocedure,
    'EXECUTE'
  ),
  'PUBLIC cannot execute anonymous rate-limit retention'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.prune_anonymous_mutation_rate_limits(integer)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot execute anonymous rate-limit retention'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.prune_anonymous_mutation_rate_limits(integer)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated cannot execute anonymous rate-limit retention'
);

select ok(
  not has_function_privilege(
    'service_role',
    'private.prune_anonymous_mutation_rate_limits(integer)'::regprocedure,
    'EXECUTE'
  ),
  'service_role cannot execute anonymous rate-limit retention'
);

select is(
  (
    select count(*)::integer
    from cron.job
    where jobname = 'prune-anonymous-mutation-rate-limits'
  ),
  1,
  'exactly one retention cron job exists'
);

select is(
  (
    select schedule
    from cron.job
    where jobname = 'prune-anonymous-mutation-rate-limits'
  ),
  '37 * * * *',
  'retention cron runs hourly at minute 37'
);

select is(
  (
    select command
    from cron.job
    where jobname = 'prune-anonymous-mutation-rate-limits'
  ),
  'select private.prune_anonymous_mutation_rate_limits(5000);',
  'retention cron invokes the bounded database function'
);

select is(
  (
    select username
    from cron.job
    where jobname = 'prune-anonymous-mutation-rate-limits'
  ),
  'postgres',
  'retention cron executes as postgres'
);

select ok(
  (
    select active
    from cron.job
    where jobname = 'prune-anonymous-mutation-rate-limits'
  ),
  'retention cron is active'
);

insert into private.anonymous_mutation_rate_limits (
  scope,
  identity_hash,
  window_started_at,
  request_count,
  updated_at,
  expires_at
)
values
  ('contact_submission', decode(repeat('21', 32), 'hex'), statement_timestamp() - interval '3 days', 1, statement_timestamp() - interval '3 days', statement_timestamp() - interval '3 hours'),
  ('affiliate_click', decode(repeat('22', 32), 'hex'), statement_timestamp() - interval '3 days', 2, statement_timestamp() - interval '3 days', statement_timestamp() - interval '2 hours'),
  ('contact_submission', decode(repeat('23', 32), 'hex'), statement_timestamp() - interval '3 days', 3, statement_timestamp() - interval '3 days', statement_timestamp() - interval '1 hour'),
  ('affiliate_click', decode(repeat('24', 32), 'hex'), statement_timestamp(), 1, statement_timestamp(), statement_timestamp() + interval '1 day');

create temporary table anonymous_rate_limit_retention_proof (
  first_deleted bigint,
  expired_after_first integer,
  active_after_first integer,
  second_deleted bigint,
  expired_after_second integer,
  active_after_second integer,
  invalid_limit_blocked boolean
) on commit drop;

do $probe$
declare
  v_first bigint;
  v_second bigint;
  v_invalid boolean := false;
begin
  v_first := private.prune_anonymous_mutation_rate_limits(2);

  insert into anonymous_rate_limit_retention_proof
  select
    v_first,
    count(*) filter (where expires_at <= statement_timestamp())::integer,
    count(*) filter (where expires_at > statement_timestamp())::integer,
    0,
    0,
    0,
    false
  from private.anonymous_mutation_rate_limits;

  v_second := private.prune_anonymous_mutation_rate_limits(5000);

  begin
    perform private.prune_anonymous_mutation_rate_limits(0);
  exception
    when sqlstate '22023' then
      if sqlerrm = 'ANONYMOUS_RATE_LIMIT_PRUNE_LIMIT_INVALID' then
        v_invalid := true;
      else
        raise;
      end if;
  end;

  update anonymous_rate_limit_retention_proof
  set second_deleted = v_second,
      expired_after_second = (
        select count(*)::integer
        from private.anonymous_mutation_rate_limits
        where expires_at <= statement_timestamp()
      ),
      active_after_second = (
        select count(*)::integer
        from private.anonymous_mutation_rate_limits
        where expires_at > statement_timestamp()
      ),
      invalid_limit_blocked = v_invalid;
end;
$probe$;

select is(
  (select first_deleted from anonymous_rate_limit_retention_proof),
  2::bigint,
  'first retention batch deletes only its configured maximum'
);

select is(
  (select expired_after_first from anonymous_rate_limit_retention_proof),
  1,
  'one expired counter remains after the bounded first batch'
);

select is(
  (select active_after_first from anonymous_rate_limit_retention_proof),
  1,
  'active counters survive the first retention batch'
);

select is(
  (select second_deleted from anonymous_rate_limit_retention_proof),
  1::bigint,
  'second retention batch deletes the final expired counter'
);

select is(
  (select expired_after_second from anonymous_rate_limit_retention_proof),
  0,
  'no expired counters remain after the second batch'
);

select ok(
  (select active_after_second = 1 and invalid_limit_blocked from anonymous_rate_limit_retention_proof),
  'active counters survive and invalid batch sizes fail closed'
);

select * from finish();
rollback;
