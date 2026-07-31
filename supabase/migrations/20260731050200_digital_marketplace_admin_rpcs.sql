-- FASE B16: transactional marketplace authoring, versioning and publication workflow.

create or replace function private.assert_marketplace_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'MARKETPLACE_ADMIN_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.assert_marketplace_payload_keys(
  p_payload jsonb,
  p_allowed text[]
)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'MARKETPLACE_PAYLOAD_MUST_BE_OBJECT' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_payload) loop
    if not (v_key = any(p_allowed)) then
      raise exception 'MARKETPLACE_FIELD_NOT_ALLOWED: %', v_key using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function private.log_digital_product_event(
  p_product_id uuid,
  p_event_type public.digital_product_event_type,
  p_version integer default null,
  p_details jsonb default '{}'::jsonb,
  p_deliverable_id uuid default null,
  p_license_id uuid default null,
  p_access_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.digital_product_events (
    product_id,
    deliverable_id,
    license_id,
    access_id,
    actor_user_id,
    event_type,
    version,
    details
  ) values (
    p_product_id,
    p_deliverable_id,
    p_license_id,
    p_access_id,
    (select auth.uid()),
    p_event_type,
    p_version,
    coalesce(p_details, '{}'::jsonb)
  )
$$;

create or replace function private.digital_product_snapshot(p_product_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'slug', p.slug,
    'status', p.status,
    'price_amount', p.price_amount,
    'currency_code', p.currency_code,
    'promotional_price_amount', p.promotional_price_amount,
    'affiliate_eligible', p.affiliate_eligible,
    'version', p.version
  )
  from public.digital_products p
  where p.id = p_product_id
$$;

create or replace function private.create_digital_product(p_payload jsonb)
returns public.digital_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_title text;
  v_slug text;
  v_cover uuid;
  v_thumbnail uuid;
begin
  perform private.assert_marketplace_admin();
  perform private.assert_marketplace_payload_keys(p_payload, array[
    'title','slug','short_description','description','category','cover_asset_id',
    'thumbnail_asset_id','price_amount','currency_code','promotional_price_amount',
    'promotion_starts_at','promotion_ends_at','availability_starts_at',
    'availability_ends_at','affiliate_eligible'
  ]);

  v_title := nullif(btrim(p_payload->>'title'), '');
  v_slug := nullif(lower(btrim(p_payload->>'slug')), '');
  if v_title is null or v_slug is null then
    raise exception 'DIGITAL_PRODUCT_TITLE_AND_SLUG_REQUIRED' using errcode = '22023';
  end if;

  v_cover := nullif(p_payload->>'cover_asset_id', '')::uuid;
  v_thumbnail := nullif(p_payload->>'thumbnail_asset_id', '')::uuid;

  insert into public.digital_products (
    title,
    slug,
    short_description,
    description,
    category,
    cover_asset_id,
    thumbnail_asset_id,
    price_amount,
    currency_code,
    promotional_price_amount,
    promotion_starts_at,
    promotion_ends_at,
    availability_starts_at,
    availability_ends_at,
    affiliate_eligible,
    created_by_user_id,
    updated_by_user_id
  ) values (
    v_title,
    v_slug,
    nullif(btrim(p_payload->>'short_description'), ''),
    nullif(btrim(p_payload->>'description'), ''),
    nullif(btrim(p_payload->>'category'), ''),
    v_cover,
    v_thumbnail,
    coalesce(nullif(p_payload->>'price_amount', '')::numeric, 0),
    coalesce(upper(nullif(p_payload->>'currency_code', '')), 'BRL'),
    nullif(p_payload->>'promotional_price_amount', '')::numeric,
    nullif(p_payload->>'promotion_starts_at', '')::timestamptz,
    nullif(p_payload->>'promotion_ends_at', '')::timestamptz,
    nullif(p_payload->>'availability_starts_at', '')::timestamptz,
    nullif(p_payload->>'availability_ends_at', '')::timestamptz,
    coalesce(nullif(p_payload->>'affiliate_eligible', '')::boolean, false),
    v_actor,
    v_actor
  )
  returning * into v_product;

  perform private.log_digital_product_event(
    v_product.id,
    'created'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('snapshot', private.digital_product_snapshot(v_product.id))
  );

  return v_product;
end;
$$;

create or replace function private.update_digital_product(
  p_product_id uuid,
  p_expected_version integer,
  p_patch jsonb
)
returns public.digital_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_cover uuid;
  v_thumbnail uuid;
begin
  perform private.assert_marketplace_admin();
  perform private.assert_marketplace_payload_keys(p_patch, array[
    'title','slug','short_description','description','category','cover_asset_id',
    'thumbnail_asset_id','price_amount','currency_code','promotional_price_amount',
    'promotion_starts_at','promotion_ends_at','availability_starts_at',
    'availability_ends_at','affiliate_eligible'
  ]);

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_EDIT_REQUIRES_DRAFT' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  v_cover := case
    when p_patch ? 'cover_asset_id' then nullif(p_patch->>'cover_asset_id', '')::uuid
    else v_product.cover_asset_id
  end;
  v_thumbnail := case
    when p_patch ? 'thumbnail_asset_id' then nullif(p_patch->>'thumbnail_asset_id', '')::uuid
    else v_product.thumbnail_asset_id
  end;

  update public.digital_products
  set title = case when p_patch ? 'title' then nullif(btrim(p_patch->>'title'), '') else title end,
      slug = case when p_patch ? 'slug' then nullif(lower(btrim(p_patch->>'slug')), '') else slug end,
      short_description = case when p_patch ? 'short_description' then nullif(btrim(p_patch->>'short_description'), '') else short_description end,
      description = case when p_patch ? 'description' then nullif(btrim(p_patch->>'description'), '') else description end,
      category = case when p_patch ? 'category' then nullif(btrim(p_patch->>'category'), '') else category end,
      cover_asset_id = v_cover,
      thumbnail_asset_id = v_thumbnail,
      price_amount = case when p_patch ? 'price_amount' then nullif(p_patch->>'price_amount', '')::numeric else price_amount end,
      currency_code = case when p_patch ? 'currency_code' then upper(nullif(p_patch->>'currency_code', '')) else currency_code end,
      promotional_price_amount = case when p_patch ? 'promotional_price_amount' then nullif(p_patch->>'promotional_price_amount', '')::numeric else promotional_price_amount end,
      promotion_starts_at = case when p_patch ? 'promotion_starts_at' then nullif(p_patch->>'promotion_starts_at', '')::timestamptz else promotion_starts_at end,
      promotion_ends_at = case when p_patch ? 'promotion_ends_at' then nullif(p_patch->>'promotion_ends_at', '')::timestamptz else promotion_ends_at end,
      availability_starts_at = case when p_patch ? 'availability_starts_at' then nullif(p_patch->>'availability_starts_at', '')::timestamptz else availability_starts_at end,
      availability_ends_at = case when p_patch ? 'availability_ends_at' then nullif(p_patch->>'availability_ends_at', '')::timestamptz else availability_ends_at end,
      affiliate_eligible = case when p_patch ? 'affiliate_eligible' then (p_patch->>'affiliate_eligible')::boolean else affiliate_eligible end,
      updated_by_user_id = v_actor,
      version = version + 1
  where id = p_product_id
  returning * into v_product;

  if v_product.title is null or v_product.slug is null or v_product.currency_code is null or v_product.price_amount is null then
    raise exception 'DIGITAL_PRODUCT_REQUIRED_FIELD_CANNOT_BE_NULL' using errcode = '22023';
  end if;

  perform private.log_digital_product_event(
    v_product.id,
    'updated'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('patch', p_patch, 'snapshot', private.digital_product_snapshot(v_product.id))
  );

  return v_product;
end;
$$;

create or replace function private.create_digital_product_license(
  p_product_id uuid,
  p_payload jsonb
)
returns public.digital_product_licenses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_license public.digital_product_licenses;
  v_kind public.digital_license_kind;
  v_version integer;
begin
  perform private.assert_marketplace_admin();
  perform private.assert_marketplace_payload_keys(p_payload, array[
    'kind','title','summary','terms_text','is_default'
  ]);

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_LICENSE_EDIT_REQUIRES_DRAFT' using errcode = '22023';
  end if;

  v_kind := nullif(p_payload->>'kind', '')::public.digital_license_kind;
  if v_kind is null or nullif(btrim(p_payload->>'title'), '') is null or nullif(btrim(p_payload->>'terms_text'), '') is null then
    raise exception 'DIGITAL_PRODUCT_LICENSE_FIELDS_REQUIRED' using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.digital_product_licenses
  where product_id = p_product_id and kind = v_kind;

  insert into public.digital_product_licenses (
    product_id,
    kind,
    title,
    summary,
    terms_text,
    version,
    is_default,
    created_by_user_id
  ) values (
    p_product_id,
    v_kind,
    btrim(p_payload->>'title'),
    nullif(btrim(p_payload->>'summary'), ''),
    btrim(p_payload->>'terms_text'),
    v_version,
    coalesce(nullif(p_payload->>'is_default', '')::boolean, false),
    v_actor
  )
  returning * into v_license;

  update public.digital_products
  set version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'license_created'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('kind', v_license.kind, 'license_version', v_license.version),
    null,
    v_license.id
  );

  return v_license;
end;
$$;

create or replace function private.publish_digital_product_license(p_license_id uuid)
returns public.digital_product_licenses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_license public.digital_product_licenses;
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();

  select l.* into v_license
  from public.digital_product_licenses l
  where l.id = p_license_id
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_LICENSE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_product
  from public.digital_products
  where id = v_license.product_id and deleted_at is null
  for update;

  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_LICENSE_PUBLISH_REQUIRES_DRAFT_PRODUCT' using errcode = '22023';
  end if;
  if v_license.status <> 'draft'::public.digital_license_status then
    raise exception 'DIGITAL_PRODUCT_LICENSE_PUBLISH_REQUIRES_DRAFT' using errcode = '22023';
  end if;

  update public.digital_product_licenses
  set status = 'archived'::public.digital_license_status
  where product_id = v_license.product_id
    and kind = v_license.kind
    and status = 'published'::public.digital_license_status;

  if v_license.is_default then
    update public.digital_product_licenses
    set is_default = false
    where product_id = v_license.product_id
      and status = 'published'::public.digital_license_status
      and is_default;
  elsif not exists (
    select 1
    from public.digital_product_licenses
    where product_id = v_license.product_id
      and status = 'published'::public.digital_license_status
      and is_default
  ) then
    v_license.is_default := true;
  end if;

  update public.digital_product_licenses
  set status = 'published'::public.digital_license_status,
      is_default = v_license.is_default
  where id = p_license_id
  returning * into v_license;

  update public.digital_products
  set version = version + 1,
      updated_by_user_id = v_actor
  where id = v_license.product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    v_license.product_id,
    'license_published'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object(
      'kind', v_license.kind,
      'license_version', v_license.version,
      'is_default', v_license.is_default
    ),
    null,
    v_license.id
  );

  return v_license;
end;
$$;

create or replace function private.attach_digital_product_deliverable(
  p_product_id uuid,
  p_asset_id uuid,
  p_payload jsonb
)
returns public.digital_product_deliverables
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_deliverable public.digital_product_deliverables;
  v_position integer;
begin
  perform private.assert_marketplace_admin();
  perform private.assert_marketplace_payload_keys(p_payload, array[
    'title','description','position','required'
  ]);

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_EDIT_REQUIRES_DRAFT' using errcode = '22023';
  end if;

  if p_payload ? 'position' then
    v_position := (p_payload->>'position')::integer;
  else
    select coalesce(max(position), -1) + 1 into v_position
    from public.digital_product_deliverables
    where product_id = p_product_id and deleted_at is null;
  end if;

  insert into public.digital_product_deliverables (
    product_id,
    asset_id,
    title,
    description,
    position,
    required,
    created_by_user_id
  ) values (
    p_product_id,
    p_asset_id,
    coalesce(nullif(btrim(p_payload->>'title'), ''), 'Arquivo digital'),
    nullif(btrim(p_payload->>'description'), ''),
    v_position,
    coalesce(nullif(p_payload->>'required', '')::boolean, true),
    v_actor
  )
  returning * into v_deliverable;

  update public.digital_products
  set version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'deliverable_attached'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('asset_id', p_asset_id, 'position', v_position),
    v_deliverable.id
  );

  return v_deliverable;
end;
$$;

create or replace function private.update_digital_product_deliverable(
  p_deliverable_id uuid,
  p_expected_product_version integer,
  p_patch jsonb
)
returns public.digital_product_deliverables
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_deliverable public.digital_product_deliverables;
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();
  perform private.assert_marketplace_payload_keys(p_patch, array['title','description','required']);

  select * into v_deliverable
  from public.digital_product_deliverables
  where id = p_deliverable_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_product
  from public.digital_products
  where id = v_deliverable.product_id and deleted_at is null
  for update;

  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_EDIT_REQUIRES_DRAFT' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_product_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.digital_product_deliverables
  set title = case when p_patch ? 'title' then nullif(btrim(p_patch->>'title'), '') else title end,
      description = case when p_patch ? 'description' then nullif(btrim(p_patch->>'description'), '') else description end,
      required = case when p_patch ? 'required' then (p_patch->>'required')::boolean else required end
  where id = p_deliverable_id
  returning * into v_deliverable;

  update public.digital_products
  set version = version + 1,
      updated_by_user_id = v_actor
  where id = v_product.id
  returning * into v_product;

  perform private.log_digital_product_event(
    v_product.id,
    'deliverable_updated'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('patch', p_patch),
    v_deliverable.id
  );

  return v_deliverable;
end;
$$;

create or replace function private.reorder_digital_product_deliverables(
  p_product_id uuid,
  p_expected_product_version integer,
  p_items jsonb
)
returns public.digital_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_expected_count integer;
  v_received_count integer;
  v_item jsonb;
begin
  perform private.assert_marketplace_admin();

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_ORDER_MUST_BE_ARRAY' using errcode = '22023';
  end if;

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_EDIT_REQUIRES_DRAFT' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_product_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select count(*) into v_expected_count
  from public.digital_product_deliverables
  where product_id = p_product_id and deleted_at is null;
  select jsonb_array_length(p_items) into v_received_count;

  if v_expected_count <> v_received_count then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_ORDER_INCOMPLETE' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where jsonb_typeof(item) <> 'object'
       or not (item ? 'id')
       or not (item ? 'position')
       or (item->>'position')::integer < 0
  ) then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_ORDER_INVALID' using errcode = '22023';
  end if;

  if (
    select count(distinct item->>'id') <> v_received_count
        or count(distinct (item->>'position')::integer) <> v_received_count
    from jsonb_array_elements(p_items) item
  ) then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_ORDER_DUPLICATED' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    left join public.digital_product_deliverables d
      on d.id = (item->>'id')::uuid
     and d.product_id = p_product_id
     and d.deleted_at is null
    where d.id is null
  ) then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_ORDER_UNKNOWN_ID' using errcode = '22023';
  end if;

  update public.digital_product_deliverables
  set position = position + 1000000
  where product_id = p_product_id and deleted_at is null;

  for v_item in select value from jsonb_array_elements(p_items) loop
    update public.digital_product_deliverables
    set position = (v_item->>'position')::integer
    where id = (v_item->>'id')::uuid;
  end loop;

  update public.digital_products
  set version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'deliverable_updated'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('order', p_items)
  );

  return v_product;
end;
$$;

create or replace function private.remove_digital_product_deliverable(
  p_deliverable_id uuid,
  p_expected_product_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_deliverable public.digital_product_deliverables;
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();

  select * into v_deliverable
  from public.digital_product_deliverables
  where id = p_deliverable_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_product
  from public.digital_products
  where id = v_deliverable.product_id and deleted_at is null
  for update;

  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_EDIT_REQUIRES_DRAFT' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_product_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.digital_product_deliverables
  set deleted_at = statement_timestamp()
  where id = p_deliverable_id;

  update public.digital_products
  set version = version + 1,
      updated_by_user_id = v_actor
  where id = v_product.id
  returning * into v_product;

  perform private.log_digital_product_event(
    v_product.id,
    'deliverable_removed'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('asset_id', v_deliverable.asset_id),
    v_deliverable.id
  );

  return true;
end;
$$;

create or replace function private.publish_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns public.digital_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
  v_default_license_count integer;
  v_deliverable_count integer;
begin
  perform private.assert_marketplace_admin();

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'draft'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_PUBLISH_REQUIRES_DRAFT' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  select count(*) into v_default_license_count
  from public.digital_product_licenses
  where product_id = p_product_id
    and status = 'published'::public.digital_license_status
    and is_default;

  select count(*) into v_deliverable_count
  from public.digital_product_deliverables
  where product_id = p_product_id and deleted_at is null;

  if v_default_license_count <> 1 then
    raise exception 'DIGITAL_PRODUCT_DEFAULT_LICENSE_REQUIRED' using errcode = '22023';
  end if;
  if v_deliverable_count < 1 then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_REQUIRED' using errcode = '22023';
  end if;

  update public.digital_products
  set status = 'published'::public.digital_product_status,
      version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'published'::public.digital_product_event_type,
    v_product.version,
    jsonb_build_object('snapshot', private.digital_product_snapshot(p_product_id))
  );

  return v_product;
end;
$$;

create or replace function private.unpublish_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns public.digital_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'published'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_UNPUBLISH_REQUIRES_PUBLISHED' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.digital_products
  set status = 'draft'::public.digital_product_status,
      version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'unpublished'::public.digital_product_event_type,
    v_product.version
  );

  return v_product;
end;
$$;

create or replace function private.archive_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns public.digital_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status = 'archived'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_ALREADY_ARCHIVED' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.digital_products
  set status = 'archived'::public.digital_product_status,
      version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'archived'::public.digital_product_event_type,
    v_product.version
  );

  return v_product;
end;
$$;

create or replace function private.delete_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.digital_products;
begin
  perform private.assert_marketplace_admin();

  select * into v_product
  from public.digital_products
  where id = p_product_id and deleted_at is null
  for update;

  if not found then
    raise exception 'DIGITAL_PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_product.status <> 'archived'::public.digital_product_status then
    raise exception 'DIGITAL_PRODUCT_DELETE_REQUIRES_ARCHIVED' using errcode = '22023';
  end if;
  if v_product.version <> p_expected_version then
    raise exception 'DIGITAL_PRODUCT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  update public.digital_products
  set deleted_at = statement_timestamp(),
      version = version + 1,
      updated_by_user_id = v_actor
  where id = p_product_id
  returning * into v_product;

  perform private.log_digital_product_event(
    p_product_id,
    'deleted'::public.digital_product_event_type,
    v_product.version
  );

  return true;
end;
$$;

create or replace function public.create_digital_product(p_payload jsonb)
returns public.digital_products
language sql
security invoker
set search_path = ''
as $$ select private.create_digital_product(p_payload) $$;

create or replace function public.update_digital_product(
  p_product_id uuid,
  p_expected_version integer,
  p_patch jsonb
)
returns public.digital_products
language sql
security invoker
set search_path = ''
as $$ select private.update_digital_product(p_product_id, p_expected_version, p_patch) $$;

create or replace function public.create_digital_product_license(
  p_product_id uuid,
  p_payload jsonb
)
returns public.digital_product_licenses
language sql
security invoker
set search_path = ''
as $$ select private.create_digital_product_license(p_product_id, p_payload) $$;

create or replace function public.publish_digital_product_license(p_license_id uuid)
returns public.digital_product_licenses
language sql
security invoker
set search_path = ''
as $$ select private.publish_digital_product_license(p_license_id) $$;

create or replace function public.attach_digital_product_deliverable(
  p_product_id uuid,
  p_asset_id uuid,
  p_payload jsonb
)
returns public.digital_product_deliverables
language sql
security invoker
set search_path = ''
as $$ select private.attach_digital_product_deliverable(p_product_id, p_asset_id, p_payload) $$;

create or replace function public.update_digital_product_deliverable(
  p_deliverable_id uuid,
  p_expected_product_version integer,
  p_patch jsonb
)
returns public.digital_product_deliverables
language sql
security invoker
set search_path = ''
as $$ select private.update_digital_product_deliverable(p_deliverable_id, p_expected_product_version, p_patch) $$;

create or replace function public.reorder_digital_product_deliverables(
  p_product_id uuid,
  p_expected_product_version integer,
  p_items jsonb
)
returns public.digital_products
language sql
security invoker
set search_path = ''
as $$ select private.reorder_digital_product_deliverables(p_product_id, p_expected_product_version, p_items) $$;

create or replace function public.remove_digital_product_deliverable(
  p_deliverable_id uuid,
  p_expected_product_version integer
)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.remove_digital_product_deliverable(p_deliverable_id, p_expected_product_version) $$;

create or replace function public.publish_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns public.digital_products
language sql
security invoker
set search_path = ''
as $$ select private.publish_digital_product(p_product_id, p_expected_version) $$;

create or replace function public.unpublish_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns public.digital_products
language sql
security invoker
set search_path = ''
as $$ select private.unpublish_digital_product(p_product_id, p_expected_version) $$;

create or replace function public.archive_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns public.digital_products
language sql
security invoker
set search_path = ''
as $$ select private.archive_digital_product(p_product_id, p_expected_version) $$;

create or replace function public.delete_digital_product(
  p_product_id uuid,
  p_expected_version integer
)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.delete_digital_product(p_product_id, p_expected_version) $$;

revoke all on function public.create_digital_product(jsonb) from public, anon;
revoke all on function public.update_digital_product(uuid, integer, jsonb) from public, anon;
revoke all on function public.create_digital_product_license(uuid, jsonb) from public, anon;
revoke all on function public.publish_digital_product_license(uuid) from public, anon;
revoke all on function public.attach_digital_product_deliverable(uuid, uuid, jsonb) from public, anon;
revoke all on function public.update_digital_product_deliverable(uuid, integer, jsonb) from public, anon;
revoke all on function public.reorder_digital_product_deliverables(uuid, integer, jsonb) from public, anon;
revoke all on function public.remove_digital_product_deliverable(uuid, integer) from public, anon;
revoke all on function public.publish_digital_product(uuid, integer) from public, anon;
revoke all on function public.unpublish_digital_product(uuid, integer) from public, anon;
revoke all on function public.archive_digital_product(uuid, integer) from public, anon;
revoke all on function public.delete_digital_product(uuid, integer) from public, anon;

grant execute on function public.create_digital_product(jsonb) to authenticated;
grant execute on function public.update_digital_product(uuid, integer, jsonb) to authenticated;
grant execute on function public.create_digital_product_license(uuid, jsonb) to authenticated;
grant execute on function public.publish_digital_product_license(uuid) to authenticated;
grant execute on function public.attach_digital_product_deliverable(uuid, uuid, jsonb) to authenticated;
grant execute on function public.update_digital_product_deliverable(uuid, integer, jsonb) to authenticated;
grant execute on function public.reorder_digital_product_deliverables(uuid, integer, jsonb) to authenticated;
grant execute on function public.remove_digital_product_deliverable(uuid, integer) to authenticated;
grant execute on function public.publish_digital_product(uuid, integer) to authenticated;
grant execute on function public.unpublish_digital_product(uuid, integer) to authenticated;
grant execute on function public.archive_digital_product(uuid, integer) to authenticated;
grant execute on function public.delete_digital_product(uuid, integer) to authenticated;

revoke all on function private.create_digital_product(jsonb) from public, anon;
revoke all on function private.update_digital_product(uuid, integer, jsonb) from public, anon;
revoke all on function private.create_digital_product_license(uuid, jsonb) from public, anon;
revoke all on function private.publish_digital_product_license(uuid) from public, anon;
revoke all on function private.attach_digital_product_deliverable(uuid, uuid, jsonb) from public, anon;
revoke all on function private.update_digital_product_deliverable(uuid, integer, jsonb) from public, anon;
revoke all on function private.reorder_digital_product_deliverables(uuid, integer, jsonb) from public, anon;
revoke all on function private.remove_digital_product_deliverable(uuid, integer) from public, anon;
revoke all on function private.publish_digital_product(uuid, integer) from public, anon;
revoke all on function private.unpublish_digital_product(uuid, integer) from public, anon;
revoke all on function private.archive_digital_product(uuid, integer) from public, anon;
revoke all on function private.delete_digital_product(uuid, integer) from public, anon;

grant execute on function private.create_digital_product(jsonb) to authenticated, service_role;
grant execute on function private.update_digital_product(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.create_digital_product_license(uuid, jsonb) to authenticated, service_role;
grant execute on function private.publish_digital_product_license(uuid) to authenticated, service_role;
grant execute on function private.attach_digital_product_deliverable(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function private.update_digital_product_deliverable(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.reorder_digital_product_deliverables(uuid, integer, jsonb) to authenticated, service_role;
grant execute on function private.remove_digital_product_deliverable(uuid, integer) to authenticated, service_role;
grant execute on function private.publish_digital_product(uuid, integer) to authenticated, service_role;
grant execute on function private.unpublish_digital_product(uuid, integer) to authenticated, service_role;
grant execute on function private.archive_digital_product(uuid, integer) to authenticated, service_role;
grant execute on function private.delete_digital_product(uuid, integer) to authenticated, service_role;
