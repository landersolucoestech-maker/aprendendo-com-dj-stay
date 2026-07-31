-- FASE B16: published terms remain immutable while the default selection may change.

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
