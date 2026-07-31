-- FASE B20: configuração administrativa de comissão e janela de atribuição.

create or replace function public.admin_configure_affiliate_terms(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_commission_bps integer,
  p_attribution_window_days integer,
  p_active boolean default true
)
returns public.affiliate_subject_terms
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_terms public.affiliate_subject_terms;
  v_subject_exists boolean := false;
  v_affiliate_eligible boolean := false;
begin
  if v_actor is null or not (select private.affiliate_is_admin()) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_subject_id is null
     or p_commission_bps not between 1 and 10000
     or p_attribution_window_days not between 1 and 365 then
    raise exception 'AFFILIATE_TERMS_INVALID' using errcode = '22023';
  end if;

  if p_subject_type = 'course'::public.checkout_subject_type then
    select true, affiliate_eligible
    into v_subject_exists, v_affiliate_eligible
    from public.courses
    where id = p_subject_id and deleted_at is null;
  elsif p_subject_type = 'digital_product'::public.checkout_subject_type then
    select true, affiliate_eligible
    into v_subject_exists, v_affiliate_eligible
    from public.digital_products
    where id = p_subject_id and deleted_at is null;
  else
    raise exception 'AFFILIATE_SUBJECT_TYPE_INVALID' using errcode = '22023';
  end if;

  if not coalesce(v_subject_exists, false) then
    raise exception 'AFFILIATE_SUBJECT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_active and not coalesce(v_affiliate_eligible, false) then
    raise exception 'AFFILIATE_SUBJECT_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  insert into public.affiliate_subject_terms (
    subject_type,
    subject_id,
    commission_bps,
    attribution_window_days,
    active,
    created_by_user_id,
    updated_by_user_id
  ) values (
    p_subject_type,
    p_subject_id,
    p_commission_bps,
    p_attribution_window_days,
    p_active,
    v_actor,
    v_actor
  )
  on conflict (subject_type, subject_id) do update
  set commission_bps = excluded.commission_bps,
      attribution_window_days = excluded.attribution_window_days,
      active = excluded.active,
      updated_by_user_id = v_actor
  returning * into v_terms;

  if not p_active then
    update public.affiliate_links
    set status = 'inactive'::public.affiliate_link_status,
        deactivated_at = statement_timestamp()
    where subject_type = p_subject_type
      and subject_id = p_subject_id
      and status = 'active'::public.affiliate_link_status;

    update public.affiliate_attributions
    set status = 'invalidated'::public.affiliate_attribution_status,
        invalidated_at = statement_timestamp(),
        invalidation_reason = 'Termos de afiliado desativados.'
    where subject_type = p_subject_type
      and subject_id = p_subject_id
      and status = 'active'::public.affiliate_attribution_status;
  end if;

  perform private.log_affiliate_event(
    'terms_configured'::public.affiliate_event_type,
    null,
    null,
    null,
    null,
    null,
    null,
    jsonb_build_object(
      'terms_id', v_terms.id,
      'subject_type', v_terms.subject_type,
      'subject_id', v_terms.subject_id,
      'commission_bps', v_terms.commission_bps,
      'attribution_window_days', v_terms.attribution_window_days,
      'active', v_terms.active
    ),
    v_actor
  );

  return v_terms;
end;
$$;

revoke all on function public.admin_configure_affiliate_terms(
  public.checkout_subject_type,
  uuid,
  integer,
  integer,
  boolean
) from public, anon, authenticated;

grant execute on function public.admin_configure_affiliate_terms(
  public.checkout_subject_type,
  uuid,
  integer,
  integer,
  boolean
) to authenticated;
