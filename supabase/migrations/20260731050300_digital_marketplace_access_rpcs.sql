-- FASE B16: auditable manual access grants, immutable license snapshots and revocation.

create or replace function private.digital_product_license_snapshot(p_license_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'license_id', l.id,
    'product_id', l.product_id,
    'kind', l.kind,
    'title', l.title,
    'summary', l.summary,
    'terms_text', l.terms_text,
    'version', l.version,
    'captured_at', statement_timestamp()
  )
  from public.digital_product_licenses l
  where l.id = p_license_id
    and l.status = 'published'::public.digital_license_status
$$;

create or replace function private.grant_digital_product_access(
  p_user_id uuid,
  p_product_id uuid,
  p_license_id uuid,
  p_source public.digital_product_access_source,
  p_expires_at timestamptz default null,
  p_source_reference text default null,
  p_reason text default null
)
returns public.digital_product_accesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_license public.digital_product_licenses;
  v_access public.digital_product_accesses;
  v_snapshot jsonb;
begin
  perform private.assert_marketplace_admin();

  if p_user_id is null or p_product_id is null or p_license_id is null then
    raise exception 'DIGITAL_PRODUCT_ACCESS_IDENTIFIERS_REQUIRED' using errcode = '22023';
  end if;
  if p_source not in (
    'manual_grant'::public.digital_product_access_source,
    'complimentary'::public.digital_product_access_source
  ) then
    raise exception 'DIGITAL_PRODUCT_PURCHASE_SOURCE_RESERVED' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= statement_timestamp() then
    raise exception 'DIGITAL_PRODUCT_ACCESS_EXPIRY_MUST_BE_FUTURE' using errcode = '22023';
  end if;
  if p_source_reference is not null and char_length(p_source_reference) > 200 then
    raise exception 'DIGITAL_PRODUCT_ACCESS_REFERENCE_TOO_LONG' using errcode = '22023';
  end if;
  if p_reason is not null and char_length(btrim(p_reason)) > 1000 then
    raise exception 'DIGITAL_PRODUCT_ACCESS_REASON_TOO_LONG' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'DIGITAL_PRODUCT_ACCESS_USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_product_id::text, 0)
  );

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_license
  from public.digital_product_licenses
  where id = p_license_id
    and product_id = p_product_id
    and status = 'published'::public.digital_license_status;

  if not found then
    raise exception 'DIGITAL_PRODUCT_LICENSE_NOT_PUBLISHED_FOR_PRODUCT' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.digital_product_accesses
    where product_id = p_product_id
      and user_id = p_user_id
      and status = 'active'::public.digital_product_access_status
  ) then
    raise exception 'DIGITAL_PRODUCT_ACTIVE_ACCESS_EXISTS' using errcode = '23505';
  end if;

  v_snapshot := private.digital_product_license_snapshot(p_license_id);
  if v_snapshot is null then
    raise exception 'DIGITAL_PRODUCT_LICENSE_SNAPSHOT_UNAVAILABLE' using errcode = '22023';
  end if;

  insert into public.digital_product_accesses (
    product_id,
    user_id,
    license_id,
    source,
    source_reference,
    license_snapshot,
    granted_by_user_id,
    expires_at
  ) values (
    p_product_id,
    p_user_id,
    p_license_id,
    p_source,
    nullif(btrim(p_source_reference), ''),
    v_snapshot,
    v_actor,
    p_expires_at
  )
  returning * into v_access;

  perform private.log_digital_product_event(
    p_product_id,
    'access_granted'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object(
      'user_id', p_user_id,
      'source', p_source,
      'source_reference', p_source_reference,
      'expires_at', p_expires_at,
      'reason', nullif(btrim(p_reason), '')
    ),
    null,
    p_license_id,
    v_access.id
  );

  return v_access;
end;
$$;

create or replace function private.revoke_digital_product_access(
  p_access_id uuid,
  p_reason text
)
returns public.digital_product_accesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access public.digital_product_accesses;
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();

  if nullif(btrim(p_reason), '') is null or char_length(btrim(p_reason)) > 1000 then
    raise exception 'DIGITAL_PRODUCT_ACCESS_REVOCATION_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into v_access
  from public.digital_product_accesses
  where id = p_access_id
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_ACCESS_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_access.status <> 'active'::public.digital_product_access_status then
    raise exception 'DIGITAL_PRODUCT_ACCESS_NOT_ACTIVE' using errcode = '22023';
  end if;

  select * into v_product
  from public.digital_products
  where id = v_access.product_id;

  update public.digital_product_accesses
  set status = 'revoked'::public.digital_product_access_status,
      revoked_at = statement_timestamp(),
      revocation_reason = btrim(p_reason)
  where id = p_access_id
  returning * into v_access;

  perform private.log_digital_product_event(
    v_access.product_id,
    'access_revoked'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object(
      'user_id', v_access.user_id,
      'reason', v_access.revocation_reason
    ),
    null,
    v_access.license_id,
    v_access.id
  );

  return v_access;
end;
$$;

create or replace function public.grant_digital_product_access(
  p_user_id uuid,
  p_product_id uuid,
  p_license_id uuid,
  p_source public.digital_product_access_source,
  p_expires_at timestamptz default null,
  p_source_reference text default null,
  p_reason text default null
)
returns public.digital_product_accesses
language sql
security invoker
set search_path = ''
as $$
  select private.grant_digital_product_access(
    p_user_id,
    p_product_id,
    p_license_id,
    p_source,
    p_expires_at,
    p_source_reference,
    p_reason
  )
$$;

create or replace function public.revoke_digital_product_access(
  p_access_id uuid,
  p_reason text
)
returns public.digital_product_accesses
language sql
security invoker
set search_path = ''
as $$ select private.revoke_digital_product_access(p_access_id, p_reason) $$;

revoke all on function public.grant_digital_product_access(
  uuid, uuid, uuid, public.digital_product_access_source, timestamptz, text, text
) from public, anon;
revoke all on function public.revoke_digital_product_access(uuid, text) from public, anon;
grant execute on function public.grant_digital_product_access(
  uuid, uuid, uuid, public.digital_product_access_source, timestamptz, text, text
) to authenticated;
grant execute on function public.revoke_digital_product_access(uuid, text) to authenticated;

revoke all on function private.digital_product_license_snapshot(uuid) from public, anon;
revoke all on function private.grant_digital_product_access(
  uuid, uuid, uuid, public.digital_product_access_source, timestamptz, text, text
) from public, anon;
revoke all on function private.revoke_digital_product_access(uuid, text) from public, anon;
grant execute on function private.digital_product_license_snapshot(uuid) to authenticated, service_role;
grant execute on function private.grant_digital_product_access(
  uuid, uuid, uuid, public.digital_product_access_source, timestamptz, text, text
) to authenticated, service_role;
grant execute on function private.revoke_digital_product_access(uuid, text) to authenticated, service_role;
