-- FASE B19: fulfillment atômico, reversões e sinais de comissão.

-- Compras distintas precisam preservar seus próprios termos e histórico.
drop index if exists public.digital_product_accesses_one_active_uidx;

create or replace function private.log_payment_entitlement_event(
  p_entitlement_id uuid,
  p_order_id uuid,
  p_provider_event_id uuid,
  p_event_type public.payment_entitlement_event_type,
  p_from_status public.payment_entitlement_status,
  p_to_status public.payment_entitlement_status,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payment_entitlement_events (
    entitlement_id,
    order_id,
    payment_provider_event_id,
    event_type,
    from_status,
    to_status,
    details
  ) values (
    p_entitlement_id,
    p_order_id,
    p_provider_event_id,
    p_event_type,
    p_from_status,
    p_to_status,
    coalesce(p_details, '{}'::jsonb)
  )
  on conflict (
    entitlement_id,
    payment_provider_event_id,
    event_type
  ) where payment_provider_event_id is not null
  do nothing;
end;
$$;

create or replace function private.log_commission_adjustment_event(
  p_order public.payment_orders,
  p_provider_event_id uuid,
  p_kind public.commission_adjustment_kind,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.commission_adjustment_events (
    order_id,
    payment_provider_event_id,
    kind,
    basis_amount_cents,
    currency_code,
    details
  ) values (
    p_order.id,
    p_provider_event_id,
    p_kind,
    p_order.amount_cents,
    p_order.currency_code,
    jsonb_build_object(
      'attribution_status', 'pending_b20',
      'subject_type', p_order.subject_type,
      'subject_id', p_order.subject_id
    ) || coalesce(p_details, '{}'::jsonb)
  )
  on conflict (
    order_id,
    payment_provider_event_id,
    kind
  ) where payment_provider_event_id is not null
  do nothing;
end;
$$;

create or replace function private.confirm_digital_product_purchase(
  p_order public.payment_orders
)
returns public.digital_product_accesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access public.digital_product_accesses;
  v_product public.digital_products;
  v_license public.digital_product_licenses;
  v_license_snapshot jsonb;
begin
  if not (select private.is_service_role())
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if p_order.subject_type <> 'digital_product'::public.checkout_subject_type
     or p_order.license_id is null then
    raise exception 'DIGITAL_PRODUCT_PURCHASE_ORDER_INVALID' using errcode = '22023';
  end if;

  if p_order.status not in (
    'paid'::public.payment_order_status,
    'chargeback_won'::public.payment_order_status
  ) or p_order.payment_confirmed_at is null then
    raise exception 'DIGITAL_PRODUCT_PAYMENT_NOT_CONFIRMED' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('digital-purchase:' || p_order.id::text, 0)
  );

  select * into v_access
  from public.digital_product_accesses
  where source = 'purchase'::public.digital_product_access_source
    and source_reference = p_order.id::text
  for update;

  if found then
    return v_access;
  end if;

  select * into v_product
  from public.digital_products
  where id = p_order.subject_id;
  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_license
  from public.digital_product_licenses
  where id = p_order.license_id
    and product_id = p_order.subject_id;
  if not found then
    raise exception 'DIGITAL_PRODUCT_LICENSE_NOT_FOUND' using errcode = 'P0002';
  end if;

  v_license_snapshot := p_order.item_snapshot->'license';
  if v_license_snapshot is null
     or jsonb_typeof(v_license_snapshot) <> 'object'
     or v_license_snapshot->>'id' <> p_order.license_id::text then
    raise exception 'DIGITAL_PRODUCT_LICENSE_SNAPSHOT_INVALID' using errcode = '22023';
  end if;

  insert into public.digital_product_accesses (
    product_id,
    user_id,
    license_id,
    status,
    source,
    source_reference,
    license_snapshot,
    granted_by_user_id,
    granted_at,
    expires_at,
    suspended_at,
    suspension_reason,
    revoked_at,
    revocation_reason
  ) values (
    p_order.subject_id,
    p_order.user_id,
    p_order.license_id,
    'active'::public.digital_product_access_status,
    'purchase'::public.digital_product_access_source,
    p_order.id::text,
    v_license_snapshot,
    null,
    p_order.payment_confirmed_at,
    null,
    null,
    null,
    null,
    null
  )
  returning * into v_access;

  perform private.log_digital_product_event(
    p_order.subject_id,
    'access_granted'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object(
      'user_id', p_order.user_id,
      'source', 'purchase',
      'order_id', p_order.id,
      'payment_confirmed_at', p_order.payment_confirmed_at
    ),
    null,
    p_order.license_id,
    v_access.id
  );

  return v_access;
end;
$$;

create or replace function private.grant_payment_order_entitlement(
  p_order public.payment_orders,
  p_provider_event_id uuid
)
returns public.payment_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entitlement public.payment_entitlements;
  v_enrollment public.enrollments;
  v_access public.digital_product_accesses;
  v_controls_access boolean := true;
begin
  if not (select private.is_service_role())
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select * into v_entitlement
  from public.payment_entitlements
  where order_id = p_order.id
  for update;

  if found then
    return v_entitlement;
  end if;

  if p_order.status <> 'paid'::public.payment_order_status
     or p_order.payment_confirmed_at is null then
    raise exception 'PAYMENT_ORDER_NOT_READY_FOR_FULFILLMENT' using errcode = '22023';
  end if;

  if p_order.subject_type = 'course'::public.checkout_subject_type then
    select * into v_enrollment
    from public.enrollments
    where user_id = p_order.user_id
      and course_id = p_order.subject_id
    for update;

    if found and v_enrollment.status = 'active'::public.enrollment_status then
      v_controls_access := v_enrollment.source = 'purchase'::public.enrollment_source;
    else
      v_enrollment := private.confirm_course_purchase(
        p_order.user_id,
        p_order.subject_id,
        p_order.id::text,
        p_order.payment_confirmed_at,
        p_order.payment_confirmed_at,
        null
      );
      v_controls_access := true;
    end if;

    insert into public.payment_entitlements (
      order_id,
      user_id,
      subject_type,
      subject_id,
      enrollment_id,
      controls_access,
      status,
      granted_at
    ) values (
      p_order.id,
      p_order.user_id,
      p_order.subject_type,
      p_order.subject_id,
      v_enrollment.id,
      v_controls_access,
      'active'::public.payment_entitlement_status,
      p_order.payment_confirmed_at
    )
    returning * into v_entitlement;
  elsif p_order.subject_type = 'digital_product'::public.checkout_subject_type then
    v_access := private.confirm_digital_product_purchase(p_order);

    insert into public.payment_entitlements (
      order_id,
      user_id,
      subject_type,
      subject_id,
      digital_product_access_id,
      controls_access,
      status,
      granted_at
    ) values (
      p_order.id,
      p_order.user_id,
      p_order.subject_type,
      p_order.subject_id,
      v_access.id,
      true,
      'active'::public.payment_entitlement_status,
      p_order.payment_confirmed_at
    )
    returning * into v_entitlement;
  else
    raise exception 'PAYMENT_ORDER_SUBJECT_INVALID' using errcode = '22023';
  end if;

  perform private.log_payment_entitlement_event(
    v_entitlement.id,
    p_order.id,
    p_provider_event_id,
    'granted'::public.payment_entitlement_event_type,
    null,
    'active'::public.payment_entitlement_status,
    jsonb_build_object(
      'controls_access', v_entitlement.controls_access,
      'payment_confirmed_at', p_order.payment_confirmed_at
    )
  );

  return v_entitlement;
end;
$$;

create or replace function private.suspend_payment_order_entitlement(
  p_entitlement public.payment_entitlements,
  p_provider_event_id uuid,
  p_reason text
)
returns public.payment_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.payment_entitlements;
  v_access public.digital_product_accesses;
  v_product public.digital_products;
begin
  if p_entitlement.status <> 'active'::public.payment_entitlement_status then
    return p_entitlement;
  end if;

  if p_entitlement.controls_access then
    if p_entitlement.enrollment_id is not null then
      if not exists (
        select 1
        from public.payment_entitlements other
        where other.enrollment_id = p_entitlement.enrollment_id
          and other.id <> p_entitlement.id
          and other.controls_access
          and other.status = 'active'::public.payment_entitlement_status
      ) then
        perform private.suspend_course_enrollment(
          p_entitlement.enrollment_id,
          p_reason
        );
      end if;
    elsif p_entitlement.digital_product_access_id is not null then
      select * into v_access
      from public.digital_product_accesses
      where id = p_entitlement.digital_product_access_id
      for update;

      if found and v_access.status = 'active'::public.digital_product_access_status then
        update public.digital_product_accesses
        set status = 'suspended'::public.digital_product_access_status,
            suspended_at = statement_timestamp(),
            suspension_reason = p_reason,
            revoked_at = null,
            revocation_reason = null
        where id = v_access.id
        returning * into v_access;

        select * into v_product
        from public.digital_products
        where id = v_access.product_id;

        if found then
          perform private.log_digital_product_event(
            v_access.product_id,
            'access_revoked'::public.digital_product_event_type,
            v_product.version,
            jsonb_build_object(
              'user_id', v_access.user_id,
              'reason', p_reason,
              'temporary', true
            ),
            null,
            v_access.license_id,
            v_access.id
          );
        end if;
      end if;
    end if;
  end if;

  update public.payment_entitlements
  set status = 'suspended'::public.payment_entitlement_status,
      suspended_at = statement_timestamp(),
      revoked_at = null
  where id = p_entitlement.id
  returning * into v_result;

  perform private.log_payment_entitlement_event(
    v_result.id,
    v_result.order_id,
    p_provider_event_id,
    'suspended'::public.payment_entitlement_event_type,
    p_entitlement.status,
    v_result.status,
    jsonb_build_object('reason', p_reason)
  );

  return v_result;
end;
$$;

create or replace function private.revoke_payment_order_entitlement(
  p_entitlement public.payment_entitlements,
  p_provider_event_id uuid,
  p_reason text
)
returns public.payment_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.payment_entitlements;
  v_access public.digital_product_accesses;
  v_product public.digital_products;
begin
  if p_entitlement.status = 'revoked'::public.payment_entitlement_status then
    return p_entitlement;
  end if;

  if p_entitlement.controls_access then
    if p_entitlement.enrollment_id is not null then
      if not exists (
        select 1
        from public.payment_entitlements other
        where other.enrollment_id = p_entitlement.enrollment_id
          and other.id <> p_entitlement.id
          and other.controls_access
          and other.status = 'active'::public.payment_entitlement_status
      ) then
        perform private.revoke_course_enrollment(
          p_entitlement.enrollment_id,
          p_reason
        );
      end if;
    elsif p_entitlement.digital_product_access_id is not null then
      select * into v_access
      from public.digital_product_accesses
      where id = p_entitlement.digital_product_access_id
      for update;

      if found and v_access.status <> 'revoked'::public.digital_product_access_status then
        update public.digital_product_accesses
        set status = 'revoked'::public.digital_product_access_status,
            suspended_at = null,
            suspension_reason = null,
            revoked_at = statement_timestamp(),
            revocation_reason = p_reason
        where id = v_access.id
        returning * into v_access;

        select * into v_product
        from public.digital_products
        where id = v_access.product_id;

        if found then
          perform private.log_digital_product_event(
            v_access.product_id,
            'access_revoked'::public.digital_product_event_type,
            v_product.version,
            jsonb_build_object(
              'user_id', v_access.user_id,
              'reason', p_reason,
              'temporary', false
            ),
            null,
            v_access.license_id,
            v_access.id
          );
        end if;
      end if;
    end if;
  end if;

  update public.payment_entitlements
  set status = 'revoked'::public.payment_entitlement_status,
      suspended_at = null,
      revoked_at = statement_timestamp()
  where id = p_entitlement.id
  returning * into v_result;

  perform private.log_payment_entitlement_event(
    v_result.id,
    v_result.order_id,
    p_provider_event_id,
    'revoked'::public.payment_entitlement_event_type,
    p_entitlement.status,
    v_result.status,
    jsonb_build_object('reason', p_reason)
  );

  return v_result;
end;
$$;

create or replace function private.restore_payment_order_entitlement(
  p_entitlement public.payment_entitlements,
  p_order public.payment_orders,
  p_provider_event_id uuid,
  p_reason text
)
returns public.payment_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result public.payment_entitlements;
  v_enrollment public.enrollments;
  v_access public.digital_product_accesses;
  v_product public.digital_products;
begin
  if p_entitlement.status = 'active'::public.payment_entitlement_status then
    return p_entitlement;
  end if;

  if p_entitlement.controls_access then
    if p_entitlement.enrollment_id is not null then
      select * into v_enrollment
      from public.enrollments
      where id = p_entitlement.enrollment_id
      for update;

      if found and v_enrollment.status <> 'active'::public.enrollment_status then
        perform private.confirm_course_purchase(
          p_order.user_id,
          p_order.subject_id,
          p_order.id::text,
          coalesce(p_order.payment_confirmed_at, statement_timestamp()),
          statement_timestamp(),
          null
        );
      end if;
    elsif p_entitlement.digital_product_access_id is not null then
      select * into v_access
      from public.digital_product_accesses
      where id = p_entitlement.digital_product_access_id
      for update;

      if found and v_access.status <> 'active'::public.digital_product_access_status then
        update public.digital_product_accesses
        set status = 'active'::public.digital_product_access_status,
            suspended_at = null,
            suspension_reason = null,
            revoked_at = null,
            revocation_reason = null
        where id = v_access.id
        returning * into v_access;

        select * into v_product
        from public.digital_products
        where id = v_access.product_id;

        if found then
          perform private.log_digital_product_event(
            v_access.product_id,
            'access_granted'::public.digital_product_event_type,
            v_product.version,
            jsonb_build_object(
              'user_id', v_access.user_id,
              'reason', p_reason,
              'restored', true
            ),
            null,
            v_access.license_id,
            v_access.id
          );
        end if;
      end if;
    end if;
  end if;

  update public.payment_entitlements
  set status = 'active'::public.payment_entitlement_status,
      suspended_at = null,
      revoked_at = null
  where id = p_entitlement.id
  returning * into v_result;

  perform private.log_payment_entitlement_event(
    v_result.id,
    v_result.order_id,
    p_provider_event_id,
    'restored'::public.payment_entitlement_event_type,
    p_entitlement.status,
    v_result.status,
    jsonb_build_object('reason', p_reason)
  );

  return v_result;
end;
$$;

create or replace function private.apply_payment_order_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entitlement public.payment_entitlements;
  v_provider_event_id uuid;
  v_event_type text;
begin
  if old.status = new.status then
    return new;
  end if;

  if not (select private.is_service_role())
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select provider_event.id, provider_event.event_type
  into v_provider_event_id, v_event_type
  from public.payment_attempts attempt
  join public.payment_provider_events provider_event
    on provider_event.provider = attempt.provider
   and provider_event.provider_event_id = attempt.last_provider_event_id
  where attempt.order_id = new.id
  order by provider_event.received_at desc
  limit 1;

  if new.status = 'paid'::public.payment_order_status then
    v_entitlement := private.grant_payment_order_entitlement(
      new,
      v_provider_event_id
    );
    perform private.log_commission_adjustment_event(
      new,
      v_provider_event_id,
      'accrue'::public.commission_adjustment_kind,
      jsonb_build_object('provider_event_type', v_event_type)
    );
  elsif new.status = 'refund_pending'::public.payment_order_status then
    perform private.log_commission_adjustment_event(
      new,
      v_provider_event_id,
      'hold'::public.commission_adjustment_kind,
      jsonb_build_object('reason', 'refund_pending', 'provider_event_type', v_event_type)
    );
  elsif new.status = 'chargeback_pending'::public.payment_order_status then
    select * into v_entitlement
    from public.payment_entitlements
    where order_id = new.id
    for update;

    if found then
      v_entitlement := private.suspend_payment_order_entitlement(
        v_entitlement,
        v_provider_event_id,
        'Pagamento em disputa de chargeback.'
      );
    end if;

    perform private.log_commission_adjustment_event(
      new,
      v_provider_event_id,
      'hold'::public.commission_adjustment_kind,
      jsonb_build_object('reason', 'chargeback_pending', 'provider_event_type', v_event_type)
    );
  elsif new.status in (
    'refunded'::public.payment_order_status,
    'chargeback_lost'::public.payment_order_status
  ) then
    select * into v_entitlement
    from public.payment_entitlements
    where order_id = new.id
    for update;

    if found then
      v_entitlement := private.revoke_payment_order_entitlement(
        v_entitlement,
        v_provider_event_id,
        case
          when new.status = 'chargeback_lost'::public.payment_order_status
            then 'Chargeback perdido e pagamento estornado.'
          else 'Pagamento estornado.'
        end
      );
    end if;

    perform private.log_commission_adjustment_event(
      new,
      v_provider_event_id,
      'reverse'::public.commission_adjustment_kind,
      jsonb_build_object('reason', new.status, 'provider_event_type', v_event_type)
    );
  elsif new.status = 'chargeback_won'::public.payment_order_status then
    select * into v_entitlement
    from public.payment_entitlements
    where order_id = new.id
    for update;

    if found then
      v_entitlement := private.restore_payment_order_entitlement(
        v_entitlement,
        new,
        v_provider_event_id,
        'Chargeback revertido por evento financeiro conclusivo.'
      );
    end if;

    perform private.log_commission_adjustment_event(
      new,
      v_provider_event_id,
      'restore'::public.commission_adjustment_kind,
      jsonb_build_object('reason', 'chargeback_won', 'provider_event_type', v_event_type)
    );
  end if;

  return new;
end;
$$;

create trigger payment_orders_apply_entitlement
after update of status on public.payment_orders
for each row
when (old.status is distinct from new.status)
execute function private.apply_payment_order_status_transition();

revoke all on function private.log_payment_entitlement_event(
  uuid,
  uuid,
  uuid,
  public.payment_entitlement_event_type,
  public.payment_entitlement_status,
  public.payment_entitlement_status,
  jsonb
) from public, anon, authenticated;
revoke all on function private.log_commission_adjustment_event(
  public.payment_orders,
  uuid,
  public.commission_adjustment_kind,
  jsonb
) from public, anon, authenticated;
revoke all on function private.confirm_digital_product_purchase(
  public.payment_orders
) from public, anon, authenticated;
revoke all on function private.grant_payment_order_entitlement(
  public.payment_orders,
  uuid
) from public, anon, authenticated;
revoke all on function private.suspend_payment_order_entitlement(
  public.payment_entitlements,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function private.revoke_payment_order_entitlement(
  public.payment_entitlements,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function private.restore_payment_order_entitlement(
  public.payment_entitlements,
  public.payment_orders,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function private.apply_payment_order_status_transition()
  from public, anon, authenticated;
