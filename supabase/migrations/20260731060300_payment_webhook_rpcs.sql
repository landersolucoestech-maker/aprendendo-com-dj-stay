-- FASE B18: criação atômica de pedido/tentativa e ingestão idempotente de webhooks Asaas.

create or replace function private.sync_payment_order_attempt_from_checkout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders;
begin
  if new.status <> 'checkout_created'::public.checkout_intent_status then
    return new;
  end if;

  insert into public.payment_orders (
    user_id,
    checkout_intent_id,
    subject_type,
    subject_id,
    license_id,
    status,
    amount_cents,
    currency_code,
    title_snapshot,
    item_snapshot
  ) values (
    new.user_id,
    new.id,
    new.subject_type,
    new.subject_id,
    new.license_id,
    'checkout_pending'::public.payment_order_status,
    new.amount_cents,
    new.currency_code,
    new.title_snapshot,
    new.item_snapshot
  )
  on conflict (checkout_intent_id) do update
  set amount_cents = excluded.amount_cents,
      currency_code = excluded.currency_code,
      title_snapshot = excluded.title_snapshot,
      item_snapshot = excluded.item_snapshot,
      version = public.payment_orders.version + 1
  returning * into v_order;

  insert into public.payment_attempts (
    order_id,
    checkout_intent_id,
    provider,
    provider_checkout_id,
    status,
    amount_cents,
    currency_code
  ) values (
    v_order.id,
    new.id,
    new.provider,
    new.provider_checkout_id,
    'checkout_created'::public.payment_attempt_status,
    new.amount_cents,
    new.currency_code
  )
  on conflict (checkout_intent_id) do update
  set provider_checkout_id = excluded.provider_checkout_id,
      amount_cents = excluded.amount_cents,
      currency_code = excluded.currency_code,
      version = public.payment_attempts.version + 1;

  return new;
end;
$$;

revoke all on function private.sync_payment_order_attempt_from_checkout() from public, anon, authenticated;

create trigger checkout_intents_sync_payment_order_attempt
after insert or update of status, provider_checkout_id on public.checkout_intents
for each row
when (new.status = 'checkout_created'::public.checkout_intent_status)
execute function private.sync_payment_order_attempt_from_checkout();

update public.checkout_intents
set provider_checkout_id = provider_checkout_id
where status = 'checkout_created'::public.checkout_intent_status;

create or replace function private.payment_attempt_status_for_asaas_event(
  p_current public.payment_attempt_status,
  p_event_type text
)
returns public.payment_attempt_status
language sql
immutable
set search_path = ''
as $$
  select case
    when p_event_type = 'PAYMENT_RECEIVED'
      then 'received'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_CONFIRMED'
      and p_current not in (
        'received'::public.payment_attempt_status,
        'refund_pending'::public.payment_attempt_status,
        'refunded'::public.payment_attempt_status,
        'chargeback_pending'::public.payment_attempt_status,
        'chargeback_dispute'::public.payment_attempt_status,
        'chargeback_won'::public.payment_attempt_status,
        'chargeback_lost'::public.payment_attempt_status
      )
      then 'confirmed'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_REFUND_IN_PROGRESS'
      then 'refund_pending'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_REFUNDED'
      then 'refunded'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_CHARGEBACK_REQUESTED'
      then 'chargeback_pending'::public.payment_attempt_status
    when p_event_type in ('PAYMENT_CHARGEBACK_DISPUTE', 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL')
      then 'chargeback_dispute'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_RESTORED'
      and p_current in (
        'chargeback_pending'::public.payment_attempt_status,
        'chargeback_dispute'::public.payment_attempt_status,
        'chargeback_lost'::public.payment_attempt_status
      )
      then 'chargeback_won'::public.payment_attempt_status
    when p_event_type in ('PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'PAYMENT_REPROVED_BY_RISK_ANALYSIS')
      and p_current in (
        'checkout_created'::public.payment_attempt_status,
        'pending'::public.payment_attempt_status
      )
      then 'failed'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_DELETED'
      and p_current in (
        'checkout_created'::public.payment_attempt_status,
        'pending'::public.payment_attempt_status,
        'failed'::public.payment_attempt_status
      )
      then 'cancelled'::public.payment_attempt_status
    when p_event_type in (
      'PAYMENT_CREATED',
      'PAYMENT_UPDATED',
      'PAYMENT_AWAITING_RISK_ANALYSIS',
      'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
      'PAYMENT_AUTHORIZED',
      'PAYMENT_OVERDUE',
      'PAYMENT_CHECKOUT_VIEWED'
    )
      and p_current = 'checkout_created'::public.payment_attempt_status
      then 'pending'::public.payment_attempt_status
    else p_current
  end
$$;

create or replace function private.payment_order_status_from_attempt(
  p_current public.payment_order_status,
  p_attempt public.payment_attempt_status
)
returns public.payment_order_status
language sql
immutable
set search_path = ''
as $$
  select case
    when p_attempt in ('confirmed'::public.payment_attempt_status, 'received'::public.payment_attempt_status)
      then 'paid'::public.payment_order_status
    when p_attempt = 'refund_pending'::public.payment_attempt_status
      then 'refund_pending'::public.payment_order_status
    when p_attempt = 'refunded'::public.payment_attempt_status
      then 'refunded'::public.payment_order_status
    when p_attempt in ('chargeback_pending'::public.payment_attempt_status, 'chargeback_dispute'::public.payment_attempt_status)
      then 'chargeback_pending'::public.payment_order_status
    when p_attempt = 'chargeback_won'::public.payment_attempt_status
      then 'chargeback_won'::public.payment_order_status
    when p_attempt = 'chargeback_lost'::public.payment_attempt_status
      then 'chargeback_lost'::public.payment_order_status
    when p_attempt = 'cancelled'::public.payment_attempt_status
      and p_current not in (
        'paid'::public.payment_order_status,
        'refund_pending'::public.payment_order_status,
        'refunded'::public.payment_order_status,
        'chargeback_pending'::public.payment_order_status,
        'chargeback_won'::public.payment_order_status,
        'chargeback_lost'::public.payment_order_status
      )
      then 'cancelled'::public.payment_order_status
    when p_attempt in (
      'checkout_created'::public.payment_attempt_status,
      'pending'::public.payment_attempt_status,
      'failed'::public.payment_attempt_status
    )
      and p_current = 'checkout_pending'::public.payment_order_status
      then 'payment_pending'::public.payment_order_status
    else p_current
  end
$$;

create or replace function private.process_asaas_payment_webhook(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.payment_provider_events;
  v_existing public.payment_provider_events;
  v_payment jsonb;
  v_payment_id text;
  v_external_reference text;
  v_intent_id uuid;
  v_attempt public.payment_attempts;
  v_order public.payment_orders;
  v_amount_cents integer;
  v_billing_type public.payment_billing_type := 'unknown'::public.payment_billing_type;
  v_next_attempt_status public.payment_attempt_status;
  v_next_order_status public.payment_order_status;
  v_provider_status text;
begin
  if nullif(btrim(p_event_id), '') is null
     or char_length(p_event_id) > 200
     or nullif(btrim(p_event_type), '') is null
     or char_length(p_event_type) > 100
     or p_payload is null
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'ASAAS_WEBHOOK_PAYLOAD_INVALID' using errcode = '22023';
  end if;

  insert into public.payment_provider_events (
    provider,
    provider_event_id,
    event_type,
    provider_payment_id,
    external_reference,
    status,
    payload
  ) values (
    'asaas',
    btrim(p_event_id),
    btrim(p_event_type),
    nullif(btrim(p_payload #>> '{payment,id}'), ''),
    nullif(btrim(p_payload #>> '{payment,externalReference}'), ''),
    'received'::public.payment_provider_event_status,
    p_payload
  )
  on conflict (provider, provider_event_id) do nothing
  returning * into v_event;

  if not found then
    select * into v_existing
    from public.payment_provider_events
    where provider = 'asaas'
      and provider_event_id = btrim(p_event_id);

    return jsonb_build_object(
      'duplicate', true,
      'event_id', v_existing.provider_event_id,
      'status', v_existing.status,
      'payment_attempt_id', v_existing.payment_attempt_id
    );
  end if;

  v_payment := p_payload->'payment';
  if v_payment is null or jsonb_typeof(v_payment) <> 'object' then
    update public.payment_provider_events
    set status = 'ignored'::public.payment_provider_event_status,
        error_code = 'ASAAS_PAYMENT_OBJECT_MISSING',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object('duplicate', false, 'ignored', true, 'reason', 'ASAAS_PAYMENT_OBJECT_MISSING');
  end if;

  v_payment_id := nullif(btrim(v_payment->>'id'), '');
  v_external_reference := nullif(btrim(v_payment->>'externalReference'), '');
  v_provider_status := nullif(btrim(v_payment->>'status'), '');

  if v_payment_id is null or char_length(v_payment_id) > 200 then
    update public.payment_provider_events
    set status = 'ignored'::public.payment_provider_event_status,
        error_code = 'ASAAS_PAYMENT_ID_INVALID',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object('duplicate', false, 'ignored', true, 'reason', 'ASAAS_PAYMENT_ID_INVALID');
  end if;

  begin
    v_intent_id := v_external_reference::uuid;
  exception when invalid_text_representation then
    update public.payment_provider_events
    set status = 'ignored'::public.payment_provider_event_status,
        provider_payment_id = v_payment_id,
        external_reference = v_external_reference,
        error_code = 'ASAAS_EXTERNAL_REFERENCE_INVALID',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object('duplicate', false, 'ignored', true, 'reason', 'ASAAS_EXTERNAL_REFERENCE_INVALID');
  end;

  select * into v_attempt
  from public.payment_attempts
  where checkout_intent_id = v_intent_id
  for update;

  if not found then
    update public.payment_provider_events
    set status = 'ignored'::public.payment_provider_event_status,
        provider_payment_id = v_payment_id,
        external_reference = v_external_reference,
        error_code = 'CHECKOUT_INTENT_NOT_LINKED',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object('duplicate', false, 'ignored', true, 'reason', 'CHECKOUT_INTENT_NOT_LINKED');
  end if;

  select * into v_order
  from public.payment_orders
  where id = v_attempt.order_id
  for update;

  if not found then
    update public.payment_provider_events
    set status = 'failed'::public.payment_provider_event_status,
        provider_payment_id = v_payment_id,
        external_reference = v_external_reference,
        payment_attempt_id = v_attempt.id,
        error_code = 'PAYMENT_ORDER_NOT_LINKED',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object(
      'duplicate', false,
      'failed', true,
      'event_id', btrim(p_event_id),
      'reason', 'PAYMENT_ORDER_NOT_LINKED',
      'fulfillment_performed', false
    );
  end if;

  if v_attempt.provider_payment_id is not null
     and v_attempt.provider_payment_id <> v_payment_id then
    update public.payment_provider_events
    set status = 'failed'::public.payment_provider_event_status,
        provider_payment_id = v_payment_id,
        external_reference = v_external_reference,
        payment_attempt_id = v_attempt.id,
        error_code = 'PROVIDER_PAYMENT_ID_CONFLICT',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object(
      'duplicate', false,
      'failed', true,
      'event_id', btrim(p_event_id),
      'reason', 'PROVIDER_PAYMENT_ID_CONFLICT',
      'fulfillment_performed', false
    );
  end if;

  if v_payment ? 'value' then
    begin
      v_amount_cents := round((v_payment->>'value')::numeric * 100)::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      v_amount_cents := null;
    end;
  end if;

  if p_event_type in (
    'PAYMENT_CONFIRMED',
    'PAYMENT_RECEIVED',
    'PAYMENT_REFUND_IN_PROGRESS',
    'PAYMENT_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_CHARGEBACK_DISPUTE',
    'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
    'PAYMENT_RESTORED'
  ) and (
    v_amount_cents is null
    or v_amount_cents <> v_attempt.amount_cents
    or v_order.amount_cents <> v_attempt.amount_cents
    or v_order.currency_code <> 'BRL'
  ) then
    update public.payment_provider_events
    set status = 'failed'::public.payment_provider_event_status,
        provider_payment_id = v_payment_id,
        external_reference = v_external_reference,
        payment_attempt_id = v_attempt.id,
        error_code = 'PAYMENT_SNAPSHOT_MISMATCH',
        processed_at = statement_timestamp()
    where id = v_event.id;

    return jsonb_build_object(
      'duplicate', false,
      'failed', true,
      'event_id', btrim(p_event_id),
      'reason', 'PAYMENT_SNAPSHOT_MISMATCH',
      'fulfillment_performed', false
    );
  end if;

  v_billing_type := case v_payment->>'billingType'
    when 'PIX' then 'pix'::public.payment_billing_type
    when 'CREDIT_CARD' then 'credit_card'::public.payment_billing_type
    else coalesce(v_attempt.billing_type, 'unknown'::public.payment_billing_type)
  end;

  v_next_attempt_status := private.payment_attempt_status_for_asaas_event(
    v_attempt.status,
    btrim(p_event_type)
  );
  v_next_order_status := private.payment_order_status_from_attempt(
    v_order.status,
    v_next_attempt_status
  );

  update public.payment_attempts
  set provider_payment_id = coalesce(provider_payment_id, v_payment_id),
      status = v_next_attempt_status,
      billing_type = v_billing_type,
      provider_status = v_provider_status,
      last_provider_event_id = btrim(p_event_id),
      last_provider_event_at = statement_timestamp(),
      confirmed_at = case
        when v_next_attempt_status in ('confirmed'::public.payment_attempt_status, 'received'::public.payment_attempt_status)
          then coalesce(confirmed_at, statement_timestamp())
        else confirmed_at
      end,
      received_at = case
        when v_next_attempt_status = 'received'::public.payment_attempt_status
          then coalesce(received_at, statement_timestamp())
        else received_at
      end,
      failure_code = case
        when v_next_attempt_status = 'failed'::public.payment_attempt_status
          then btrim(p_event_type)
        else null
      end,
      version = version + 1
  where id = v_attempt.id
  returning * into v_attempt;

  update public.payment_orders
  set status = v_next_order_status,
      payment_confirmed_at = case
        when v_next_order_status = 'paid'::public.payment_order_status
          then coalesce(payment_confirmed_at, statement_timestamp())
        else payment_confirmed_at
      end,
      version = version + 1
  where id = v_order.id
  returning * into v_order;

  update public.payment_provider_events
  set provider_payment_id = v_payment_id,
      external_reference = v_external_reference,
      payment_attempt_id = v_attempt.id,
      status = 'processed'::public.payment_provider_event_status,
      processed_at = statement_timestamp(),
      error_code = null
  where id = v_event.id;

  return jsonb_build_object(
    'duplicate', false,
    'ignored', false,
    'event_id', btrim(p_event_id),
    'payment_attempt_id', v_attempt.id,
    'order_id', v_order.id,
    'attempt_status', v_attempt.status,
    'order_status', v_order.status,
    'fulfillment_performed', false
  );
end;
$$;

create or replace function public.process_asaas_payment_webhook(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.process_asaas_payment_webhook(p_event_id, p_event_type, p_payload)
$$;

revoke all on function private.payment_attempt_status_for_asaas_event(public.payment_attempt_status, text) from public, anon, authenticated;
revoke all on function private.payment_order_status_from_attempt(public.payment_order_status, public.payment_attempt_status) from public, anon, authenticated;
revoke all on function private.process_asaas_payment_webhook(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.process_asaas_payment_webhook(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.process_asaas_payment_webhook(text, text, jsonb) to service_role;
grant execute on function private.process_asaas_payment_webhook(text, text, jsonb) to service_role;
