-- FASE B16: marketplace invariants, read boundaries and private asset authorization.

create or replace function private.digital_product_is_catalog_visible(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.digital_products p
    where p.id = p_product_id
      and p.status = 'published'::public.digital_product_status
      and p.deleted_at is null
      and (p.availability_starts_at is null or p.availability_starts_at <= statement_timestamp())
      and (p.availability_ends_at is null or p.availability_ends_at > statement_timestamp())
  )
$$;

create or replace function private.has_active_digital_product_access(
  p_user_id uuid,
  p_product_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null and exists (
    select 1
    from public.digital_product_accesses a
    where a.user_id = p_user_id
      and a.product_id = p_product_id
      and a.status = 'active'::public.digital_product_access_status
      and (a.expires_at is null or a.expires_at > statement_timestamp())
  )
$$;

create or replace function private.can_read_digital_product_asset(
  p_user_id uuid,
  p_asset_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assets a
    where a.id = p_asset_id
      and a.state = 'published'::public.asset_state
      and a.deleted_at is null
      and (
        exists (
          select 1
          from public.digital_products p
          where (p.cover_asset_id = a.id or p.thumbnail_asset_id = a.id)
            and private.digital_product_is_catalog_visible(p.id)
        )
        or exists (
          select 1
          from public.digital_product_deliverables d
          where d.asset_id = a.id
            and d.deleted_at is null
            and private.has_active_digital_product_access(p_user_id, d.product_id)
        )
      )
  )
$$;

create or replace function private.validate_digital_product_media_assets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_id uuid;
  v_asset public.assets;
begin
  foreach v_asset_id in array array[new.cover_asset_id, new.thumbnail_asset_id] loop
    if v_asset_id is null then
      continue;
    end if;

    select * into v_asset
    from public.assets
    where id = v_asset_id;

    if not found
       or v_asset.purpose <> 'image'::public.asset_purpose
       or v_asset.state <> 'published'::public.asset_state
       or v_asset.deleted_at is not null
       or v_asset.lesson_id is not null then
      raise exception 'MARKETPLACE_MEDIA_ASSET_INVALID' using errcode = '22023';
    end if;
  end loop;

  return new;
end;
$$;

create or replace function private.validate_digital_product_deliverable_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset public.assets;
begin
  select * into v_asset
  from public.assets
  where id = new.asset_id;

  if not found
     or v_asset.purpose <> 'digital_product'::public.asset_purpose
     or v_asset.state <> 'published'::public.asset_state
     or v_asset.deleted_at is not null
     or v_asset.lesson_id is not null then
    raise exception 'DIGITAL_PRODUCT_DELIVERABLE_ASSET_INVALID' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function private.validate_digital_product_access_license()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_license public.digital_product_licenses;
begin
  select * into v_license
  from public.digital_product_licenses
  where id = new.license_id;

  if not found
     or v_license.product_id <> new.product_id
     or v_license.status <> 'published'::public.digital_license_status then
    raise exception 'DIGITAL_PRODUCT_LICENSE_NOT_PUBLISHED_FOR_PRODUCT' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function private.freeze_published_digital_product_license()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published'::public.digital_license_status and (
    new.product_id is distinct from old.product_id
    or new.kind is distinct from old.kind
    or new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.terms_text is distinct from old.terms_text
    or new.version is distinct from old.version
    or new.is_default is distinct from old.is_default
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at
    or new.published_at is distinct from old.published_at
    or new.status not in (
      'published'::public.digital_license_status,
      'archived'::public.digital_license_status
    )
  ) then
    raise exception 'PUBLISHED_DIGITAL_PRODUCT_LICENSE_IMMUTABLE' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function private.freeze_digital_product_access_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.product_id is distinct from old.product_id
     or new.user_id is distinct from old.user_id
     or new.license_id is distinct from old.license_id
     or new.source is distinct from old.source
     or new.source_reference is distinct from old.source_reference
     or new.license_snapshot is distinct from old.license_snapshot
     or new.granted_by_user_id is distinct from old.granted_by_user_id
     or new.granted_at is distinct from old.granted_at
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'DIGITAL_PRODUCT_ACCESS_IDENTITY_IMMUTABLE' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger digital_products_validate_media_assets
before insert or update of cover_asset_id, thumbnail_asset_id on public.digital_products
for each row execute function private.validate_digital_product_media_assets();

create trigger digital_product_deliverables_validate_asset
before insert or update of asset_id on public.digital_product_deliverables
for each row execute function private.validate_digital_product_deliverable_asset();

create trigger digital_product_accesses_validate_license
before insert or update of product_id, license_id on public.digital_product_accesses
for each row execute function private.validate_digital_product_access_license();

create trigger digital_product_licenses_freeze_published
before update on public.digital_product_licenses
for each row execute function private.freeze_published_digital_product_license();

create trigger digital_product_accesses_freeze_identity
before update on public.digital_product_accesses
for each row execute function private.freeze_digital_product_access_identity();

create policy digital_products_select
on public.digital_products
for select
to authenticated
using (
  (
    (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
    and deleted_at is null
  )
  or private.digital_product_is_catalog_visible(id)
  or private.has_active_digital_product_access((select auth.uid()), id)
);

create policy digital_product_licenses_select
on public.digital_product_licenses
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    status = 'published'::public.digital_license_status
    and private.digital_product_is_catalog_visible(product_id)
  )
  or exists (
    select 1
    from public.digital_product_accesses a
    where a.license_id = digital_product_licenses.id
      and a.user_id = (select auth.uid())
  )
);

create policy digital_product_deliverables_select
on public.digital_product_deliverables
for select
to authenticated
using (
  deleted_at is null
  and (
    (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
    or private.has_active_digital_product_access((select auth.uid()), product_id)
  )
);

create policy digital_product_accesses_select
on public.digital_product_accesses
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or user_id = (select auth.uid())
);

create policy digital_product_events_select
on public.digital_product_events
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
);

drop policy assets_select on public.assets;

create policy assets_select
on public.assets
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or owner_user_id = (select auth.uid())
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and lesson_id is not null
    and state = 'published'::public.asset_state
    and deleted_at is null
    and private.lesson_available_to_user((select auth.uid()), lesson_id)
    and exists (
      select 1
      from public.asset_access_grants g
      where g.asset_id = assets.id
        and g.user_id = (select auth.uid())
        and (g.expires_at is null or g.expires_at > statement_timestamp())
    )
  )
  or private.can_read_digital_product_asset((select auth.uid()), id)
);

revoke all on function private.digital_product_is_catalog_visible(uuid) from public, anon;
revoke all on function private.has_active_digital_product_access(uuid, uuid) from public, anon;
revoke all on function private.can_read_digital_product_asset(uuid, uuid) from public, anon;
grant execute on function private.digital_product_is_catalog_visible(uuid) to authenticated, service_role;
grant execute on function private.has_active_digital_product_access(uuid, uuid) to authenticated, service_role;
grant execute on function private.can_read_digital_product_asset(uuid, uuid) to authenticated, service_role;
