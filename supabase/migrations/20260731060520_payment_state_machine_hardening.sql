-- FASE B19: impede regressão de estados terminais e interpreta a sequência oficial de chargeback.

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
    when p_event_type = 'PAYMENT_RECEIVED' then
      case
        when p_current in (
          'chargeback_pending'::public.payment_attempt_status,
          'chargeback_dispute'::public.payment_attempt_status
        ) then 'chargeback_won'::public.payment_attempt_status
        when p_current in (
          'refund_pending'::public.payment_attempt_status,
          'refunded'::public.payment_attempt_status,
          'chargeback_won'::public.payment_attempt_status,
          'chargeback_lost'::public.payment_attempt_status
        ) then p_current
        else 'received'::public.payment_attempt_status
      end
    when p_event_type = 'PAYMENT_CONFIRMED' then
      case
        when p_current in (
          'chargeback_pending'::public.payment_attempt_status,
          'chargeback_dispute'::public.payment_attempt_status
        ) then 'chargeback_won'::public.payment_attempt_status
        when p_current in (
          'received'::public.payment_attempt_status,
          'refund_pending'::public.payment_attempt_status,
          'refunded'::public.payment_attempt_status,
          'chargeback_won'::public.payment_attempt_status,
          'chargeback_lost'::public.payment_attempt_status
        ) then p_current
        else 'confirmed'::public.payment_attempt_status
      end
    when p_event_type = 'PAYMENT_REFUND_IN_PROGRESS'
      and p_current not in (
        'refunded'::public.payment_attempt_status,
        'chargeback_lost'::public.payment_attempt_status
      )
      then 'refund_pending'::public.payment_attempt_status
    when p_event_type in ('PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED') then
      case
        when p_current in (
          'chargeback_pending'::public.payment_attempt_status,
          'chargeback_dispute'::public.payment_attempt_status,
          'chargeback_won'::public.payment_attempt_status
        ) then 'chargeback_lost'::public.payment_attempt_status
        else 'refunded'::public.payment_attempt_status
      end
    when p_event_type = 'PAYMENT_CHARGEBACK_REQUESTED'
      and p_current not in (
        'refunded'::public.payment_attempt_status,
        'chargeback_lost'::public.payment_attempt_status
      )
      then 'chargeback_pending'::public.payment_attempt_status
    when p_event_type in (
      'PAYMENT_CHARGEBACK_DISPUTE',
      'PAYMENT_AWAITING_CHARGEBACK_REVERSAL'
    )
      and p_current not in (
        'refunded'::public.payment_attempt_status,
        'chargeback_lost'::public.payment_attempt_status
      )
      then 'chargeback_dispute'::public.payment_attempt_status
    when p_event_type = 'PAYMENT_RESTORED'
      and p_current in (
        'chargeback_pending'::public.payment_attempt_status,
        'chargeback_dispute'::public.payment_attempt_status
      )
      then 'chargeback_won'::public.payment_attempt_status
    when p_event_type in (
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS'
    )
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

revoke all on function private.payment_attempt_status_for_asaas_event(
  public.payment_attempt_status,
  text
) from public, anon, authenticated;
