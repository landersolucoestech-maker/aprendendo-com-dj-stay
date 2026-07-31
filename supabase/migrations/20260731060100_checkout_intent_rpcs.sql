-- FASE B18: trusted quote preparation and provider checkout lease lifecycle.

create or replace function private.log_checkout_intent_event(
  p_intent_id uuid,
  p_event_type public.checkout_intent_event_type,
  p_from_status public.checkout_intent_status,
  p_to_status public.checkout_intent_status,
  p_details jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.checkout_intent_events (
    checkout_intent_id,
    actor_user_id,
    event_type,
    from_status,
    to_status,
    details
  ) values (
    p_intent_id,
    coalesce(p_actor_user_id, (select auth.uid())),
    p_event_type,
    p_from_status,
    p_to_status,
    coalesce(p_details, '{}'::jsonb)
  )
$$;

create or replace function private.checkout_effective_amount_cents(
  p_regular_amount numeric,
  p_promotional_amount numeric,
  p_promotion_starts_at timestamptz,
  p_promotion_ends_at timestamptz
)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_amount numeric;
begin
  v_amount := case
    when p_promotional_amount is not null
      and (p_promotion_starts_at is null or p_promotion_starts_at <= statement_timestamp())
      and (p_promotion_ends_at is null or p_promotion_ends_at > statement_timestamp())
    then p_promotional_amount
    else p_regular_amount
  end;

  if v_amount is null or v_amount <= 0 then
    raise exception 'CHECKOUT_PAID_AMOUNT_REQUIRED' using errcode = '22023';
  end if;

  return round(v_amount * 100)::integer;
end;
$$;

create or replace function private.prepare_checkout_intent(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_license_id uuid,
  p_idempotency_key uuid
)
returns public.checkout_intents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_existing public.checkout_intents;
  v_intent public.checkout_intents;
  v_course public.courses;
  v_product public.digital_products;
  v_license public.digital_product_licenses;
  v_amount_cents integer;
  v_title text;
  v_snapshot jsonb;
begin
  if v_user_id is null or v_role is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;
  if p_subject_id is null or p_idempotency_key is null then
    raise exception 'CHECKOUT_IDENTIFIERS_REQUIRED' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 0)
  );

  select * into v_existing
  from public.checkout_intents
  where user_id = v_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.subject_type <> p_subject_type
       or v_existing.subject_id <> p_subject_id
       or (p_license_id is not null and v_existing.license_id <> p_license_id) then
      raise exception 'CHECKOUT_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_existing;
  end if;

  if p_subject_type = 'course'::public.checkout_subject_type then
    if p_license_id is not null then
      raise exception 'COURSE_CHECKOUT_LICENSE_NOT_ALLOWED' using errcode = '22023';
    end if;

    select * into v_course
    from public.courses
    where id = p_subject_id
      and status = 'published'::public.course_status
      and deleted_at is null
      and (availability_starts_at is null or availability_starts_at <= statement_timestamp())
      and (availability_ends_at is null or availability_ends_at > statement_timestamp());

    if not found then
      raise exception 'COURSE_NOT_AVAILABLE_FOR_CHECKOUT' using errcode = 'P0002';
    end if;

    v_amount_cents := private.checkout_effective_amount_cents(
      v_course.price_amount,
      v_course.promotional_price_amount,
      v_course.promotion_starts_at,
      v_course.promotion_ends_at
    );
    v_title := v_course.title;
    v_snapshot := jsonb_build_object(
      'subject_type', 'course',
      'subject_id', v_course.id,
      'title', v_course.title,
      'version', v_course.version,
      'amount_cents', v_amount_cents,
      'currency_code', v_course.currency_code,
      'captured_at', statement_timestamp()
    );
  elsif p_subject_type = 'digital_product'::public.checkout_subject_type then
    select * into v_product
    from public.digital_products
    where id = p_subject_id
      and private.digital_product_is_catalog_visible(id);

    if not found then
      raise exception 'DIGITAL_PRODUCT_NOT_AVAILABLE_FOR_CHECKOUT' using errcode = 'P0002';
    end if;

    if p_license_id is null then
      select * into v_license
      from public.digital_product_licenses
      where product_id = v_product.id
        and status = 'published'::public.digital_license_status
        and is_default
      order by version desc
      limit 1;
    else
      select * into v_license
      from public.digital_product_licenses
      where id = p_license_id
        and product_id = v_product.id
        and status = 'published'::public.digital_license_status;
    end if;

    if not found then
      raise exception 'DIGITAL_PRODUCT_PUBLISHED_LICENSE_REQUIRED' using errcode = '22023';
    end if;

    v_amount_cents := private.checkout_effective_amount_cents(
      v_product.price_amount,
      v_product.promotional_price_amount,
      v_product.promotion_starts_at,
      v_product.promotion_ends_at
    );
    v_title := v_product.title;
    v_snapshot := jsonb_build_object(
      'subject_type', 'digital_product',
      'subject_id', v_product.id,
      'title', v_product.title,
      'version', v_product.version,
      'amount_cents', v_amount_cents,
      'currency_code', v_product.currency_code,
      'license', private.digital_product_license_snapshot(v_license.id),
      'captured_at', statement_timestamp()
    );
    p_license_id := v_license.id;
  else
    raise exception 'CHECKOUT_SUBJECT_TYPE_INVALID' using errcode = '22023';
  end if;

  if coalesce(v_snapshot->>'currency_code', '') <> 'BRL' then
    raise exception 'CHECKOUT_CURRENCY_NOT_SUPPORTED' using errcode = '22023';
  end if;

  insert into public.checkout_intents (
    user_id,
    subject_type,
    subject_id,
    license_id,
    amount_cents,
    currency_code,
    title_snapshot,
    item_snapshot,
    idempotency_key
  ) values (
    v_user_id,
    p_subject_type,
    p_subject_id,
    p_license_id,
    v_amount_cents,
    'BRL',
    v_title,
    v_snapshot,
    p_idempotency_key
  )
  returning * into v_intent;

  perform private.log_checkout_intent_event(
    v_intent.id,
    'prepared'::public.checkout_intent_event_type,
    null,
    'prepared'::public.checkout_intent_status,
    jsonb_build_object(
      'subject_type', v_intent.subject_type,
      'subject_id', v_intent.subject_id,
      'amount_cents', v_intent.amount_cents,
      'currency_code', v_intent.currency_code
    ),
    v_user_id
  );

  return v_intent;
end;
$$;

create or replace function private.assert_checkout_service_role()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'CHECKOUT_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.claim_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_lease_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.checkout_intents;
  v_from_status public.checkout_intent_status;
  v_token uuid;
begin
  perform private.assert_checkout_service_role();

  if p_lease_seconds < 30 or p_lease_seconds > 600 then
    raise exception 'CHECKOUT_PROVIDER_LEASE_INVALID' using errcode = '22023';
  end if;

  select * into v_intent
  from public.checkout_intents
  where id = p_intent_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'CHECKOUT_INTENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_intent.status = 'checkout_created'::public.checkout_intent_status
     and v_intent.expires_at > statement_timestamp() then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'CHECKOUT_ALREADY_CREATED',
      'intent', to_jsonb(v_intent)
    );
  end if;

  if v_intent.status = 'provider_creating'::public.checkout_intent_status
     and v_intent.provider_request_started_at > statement_timestamp() - make_interval(secs => p_lease_seconds) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'CHECKOUT_PROVIDER_REQUEST_IN_PROGRESS',
      'intent', to_jsonb(v_intent)
    );
  end if;

  if v_intent.status in ('expired'::public.checkout_intent_status, 'cancelled'::public.checkout_intent_status) then
    raise exception 'CHECKOUT_INTENT_NOT_RETRYABLE' using errcode = '22023';
  end if;

  v_from_status := v_intent.status;
  v_token := gen_random_uuid();

  update public.checkout_intents
  set status = 'provider_creating'::public.checkout_intent_status,
      provider_request_token = v_token,
      provider_request_started_at = statement_timestamp(),
      provider_checkout_id = null,
      provider_checkout_url = null,
      expires_at = null,
      failure_code = null,
      failure_reason = null,
      version = version + 1
  where id = v_intent.id
  returning * into v_intent;

  perform private.log_checkout_intent_event(
    v_intent.id,
    'provider_claimed'::public.checkout_intent_event_type,
    v_from_status,
    v_intent.status,
    jsonb_build_object('provider', v_intent.provider, 'request_token', v_token),
    p_user_id
  );

  return jsonb_build_object(
    'claimed', true,
    'reason', null,
    'request_token', v_token,
    'intent', to_jsonb(v_intent)
  );
end;
$$;

create or replace function private.complete_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_request_token uuid,
  p_provider_checkout_id text,
  p_provider_checkout_url text,
  p_expires_at timestamptz
)
returns public.checkout_intents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.checkout_intents;
begin
  perform private.assert_checkout_service_role();

  if nullif(btrim(p_provider_checkout_id), '') is null
     or char_length(p_provider_checkout_id) > 200
     or p_provider_checkout_url !~ '^https://'
     or p_expires_at <= statement_timestamp()
     or p_expires_at > statement_timestamp() + interval '24 hours' then
    raise exception 'CHECKOUT_PROVIDER_RESPONSE_INVALID' using errcode = '22023';
  end if;

  select * into v_intent
  from public.checkout_intents
  where id = p_intent_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'CHECKOUT_INTENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_intent.status <> 'provider_creating'::public.checkout_intent_status
     or v_intent.provider_request_token <> p_request_token then
    raise exception 'CHECKOUT_PROVIDER_LEASE_MISMATCH' using errcode = '40001';
  end if;

  update public.checkout_intents
  set status = 'checkout_created'::public.checkout_intent_status,
      provider_checkout_id = btrim(p_provider_checkout_id),
      provider_checkout_url = p_provider_checkout_url,
      provider_request_token = null,
      provider_request_started_at = null,
      expires_at = p_expires_at,
      failure_code = null,
      failure_reason = null,
      version = version + 1
  where id = v_intent.id
  returning * into v_intent;

  perform private.log_checkout_intent_event(
    v_intent.id,
    'provider_created'::public.checkout_intent_event_type,
    'provider_creating'::public.checkout_intent_status,
    v_intent.status,
    jsonb_build_object(
      'provider', v_intent.provider,
      'provider_checkout_id', v_intent.provider_checkout_id,
      'expires_at', v_intent.expires_at
    ),
    p_user_id
  );

  return v_intent;
end;
$$;

create or replace function private.fail_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_request_token uuid,
  p_failure_code text,
  p_failure_reason text
)
returns public.checkout_intents
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.checkout_intents;
begin
  perform private.assert_checkout_service_role();

  if nullif(btrim(p_failure_code), '') is null
     or char_length(p_failure_code) > 100
     or nullif(btrim(p_failure_reason), '') is null
     or char_length(p_failure_reason) > 1000 then
    raise exception 'CHECKOUT_PROVIDER_FAILURE_INVALID' using errcode = '22023';
  end if;

  select * into v_intent
  from public.checkout_intents
  where id = p_intent_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'CHECKOUT_INTENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_intent.status <> 'provider_creating'::public.checkout_intent_status
     or v_intent.provider_request_token <> p_request_token then
    raise exception 'CHECKOUT_PROVIDER_LEASE_MISMATCH' using errcode = '40001';
  end if;

  update public.checkout_intents
  set status = 'provider_failed'::public.checkout_intent_status,
      provider_request_token = null,
      provider_request_started_at = null,
      provider_checkout_id = null,
      provider_checkout_url = null,
      expires_at = null,
      failure_code = btrim(p_failure_code),
      failure_reason = btrim(p_failure_reason),
      version = version + 1
  where id = v_intent.id
  returning * into v_intent;

  perform private.log_checkout_intent_event(
    v_intent.id,
    'provider_failed'::public.checkout_intent_event_type,
    'provider_creating'::public.checkout_intent_status,
    v_intent.status,
    jsonb_build_object('failure_code', v_intent.failure_code),
    p_user_id
  );

  return v_intent;
end;
$$;

create or replace function public.prepare_checkout_intent(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_license_id uuid,
  p_idempotency_key uuid
)
returns public.checkout_intents
language sql
security invoker
set search_path = ''
as $$
  select private.prepare_checkout_intent(
    p_subject_type,
    p_subject_id,
    p_license_id,
    p_idempotency_key
  )
$$;

create or replace function public.claim_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_lease_seconds integer default 120
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.claim_checkout_provider_request(p_intent_id, p_user_id, p_lease_seconds)
$$;

create or replace function public.complete_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_request_token uuid,
  p_provider_checkout_id text,
  p_provider_checkout_url text,
  p_expires_at timestamptz
)
returns public.checkout_intents
language sql
security invoker
set search_path = ''
as $$
  select private.complete_checkout_provider_request(
    p_intent_id,
    p_user_id,
    p_request_token,
    p_provider_checkout_id,
    p_provider_checkout_url,
    p_expires_at
  )
$$;

create or replace function public.fail_checkout_provider_request(
  p_intent_id uuid,
  p_user_id uuid,
  p_request_token uuid,
  p_failure_code text,
  p_failure_reason text
)
returns public.checkout_intents
language sql
security invoker
set search_path = ''
as $$
  select private.fail_checkout_provider_request(
    p_intent_id,
    p_user_id,
    p_request_token,
    p_failure_code,
    p_failure_reason
  )
$$;

revoke all on function public.prepare_checkout_intent(public.checkout_subject_type, uuid, uuid, uuid) from public, anon;
grant execute on function public.prepare_checkout_intent(public.checkout_subject_type, uuid, uuid, uuid) to authenticated;

revoke all on function public.claim_checkout_provider_request(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_checkout_provider_request(uuid, uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_checkout_provider_request(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_checkout_provider_request(uuid, uuid, integer) to service_role;
grant execute on function public.complete_checkout_provider_request(uuid, uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.fail_checkout_provider_request(uuid, uuid, uuid, text, text) to service_role;

revoke all on function private.prepare_checkout_intent(public.checkout_subject_type, uuid, uuid, uuid) from public, anon;
revoke all on function private.claim_checkout_provider_request(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function private.complete_checkout_provider_request(uuid, uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function private.fail_checkout_provider_request(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function private.prepare_checkout_intent(public.checkout_subject_type, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function private.claim_checkout_provider_request(uuid, uuid, integer) to service_role;
grant execute on function private.complete_checkout_provider_request(uuid, uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function private.fail_checkout_provider_request(uuid, uuid, uuid, text, text) to service_role;
