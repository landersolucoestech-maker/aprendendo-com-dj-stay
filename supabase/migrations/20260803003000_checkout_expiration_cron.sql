-- FASE B92: agendamento interno e auditável da reconciliação de checkouts vencidos.

create extension if not exists pg_cron with schema pg_catalog;

revoke all on schema cron from public, anon, authenticated, service_role;
revoke all on all tables in schema cron from public, anon, authenticated, service_role;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function private.assert_checkout_expiration_executor()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if session_user = 'postgres' then
    return;
  end if;

  perform private.assert_checkout_service_role();
end;
$$;

create or replace function private.expire_due_checkout_intents(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate record;
  v_result public.checkout_intents;
  v_expired_count integer := 0;
begin
  perform private.assert_checkout_expiration_executor();

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'CHECKOUT_EXPIRATION_LIMIT_INVALID' using errcode = '22023';
  end if;

  for v_candidate in
    select checkout_intent.id, checkout_intent.user_id
    from public.checkout_intents checkout_intent
    where checkout_intent.status = 'checkout_created'::public.checkout_intent_status
      and checkout_intent.expires_at is not null
      and checkout_intent.expires_at <= statement_timestamp()
      and not exists (
        select 1
        from public.payment_orders payment_order
        where payment_order.checkout_intent_id = checkout_intent.id
          and private.checkout_order_is_financially_terminal(payment_order.status)
      )
    order by checkout_intent.expires_at, checkout_intent.id
    limit p_limit
    for update skip locked
  loop
    v_result := private.reconcile_checkout_intent_expiration(
      v_candidate.id,
      v_candidate.user_id
    );

    if v_result.status = 'expired'::public.checkout_intent_status then
      v_expired_count := v_expired_count + 1;
    end if;
  end loop;

  return v_expired_count;
end;
$$;

revoke all on function private.assert_checkout_expiration_executor()
  from public, anon, authenticated, service_role;
revoke all on function private.expire_due_checkout_intents(integer)
  from public, anon, authenticated;
grant execute on function private.expire_due_checkout_intents(integer)
  to service_role;

select cron.unschedule(cron_job.jobid)
from cron.job cron_job
where cron_job.jobname = 'expire-due-checkout-intents';

select cron.schedule(
  'expire-due-checkout-intents',
  '*/5 * * * *',
  $cron$select private.expire_due_checkout_intents(100);$cron$
);
