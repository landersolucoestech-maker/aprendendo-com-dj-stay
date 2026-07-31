-- FASE B20: wrapper seguro executa a função privada sem expor seu grant.

create or replace function public.prepare_checkout_intent_with_attribution(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_license_id uuid,
  p_idempotency_key uuid,
  p_affiliate_visitor_token uuid default null
)
returns public.checkout_intents
language sql
security definer
set search_path = ''
as $$
  select private.prepare_checkout_intent_with_attribution(
    p_subject_type,
    p_subject_id,
    p_license_id,
    p_idempotency_key,
    p_affiliate_visitor_token
  )
$$;

revoke all on function public.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.prepare_checkout_intent_with_attribution(
  public.checkout_subject_type,
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;
