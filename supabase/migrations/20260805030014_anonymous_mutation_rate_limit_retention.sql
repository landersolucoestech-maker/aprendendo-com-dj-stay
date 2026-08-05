create function private.prune_anonymous_mutation_rate_limits(
  p_delete_limit integer default 5000
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_deleted bigint;
begin
  if session_user <> 'postgres' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if p_delete_limit not between 1 and 10000 then
    raise exception 'ANONYMOUS_RATE_LIMIT_PRUNE_LIMIT_INVALID'
      using errcode = '22023';
  end if;

  with candidates as (
    select target.ctid
    from private.anonymous_mutation_rate_limits target
    where target.expires_at <= statement_timestamp()
    order by
      target.expires_at,
      target.scope,
      encode(target.identity_hash, 'hex'),
      target.window_started_at
    limit p_delete_limit
    for update skip locked
  )
  delete from private.anonymous_mutation_rate_limits target
  using candidates
  where target.ctid = candidates.ctid;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function private.prune_anonymous_mutation_rate_limits(integer)
  from public, anon, authenticated, service_role;

select cron.schedule(
  'prune-anonymous-mutation-rate-limits',
  '37 * * * *',
  'select private.prune_anonymous_mutation_rate_limits(5000);'
);
