-- FASE B20: snapshots de termos e helpers privados do programa de afiliados.

alter table public.affiliate_attributions
  add column terms_id uuid references public.affiliate_subject_terms(id) on delete restrict,
  add column commission_bps integer;

alter table public.affiliate_attributions
  add constraint affiliate_attributions_commission_bps_range
    check (commission_bps between 1 and 10000);

alter table public.affiliate_attributions
  alter column terms_id set not null,
  alter column commission_bps set not null;

create index affiliate_attributions_terms_idx
  on public.affiliate_attributions (terms_id);

create or replace function private.affiliate_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.current_user_role()) = 'administrador_proprietario'::public.app_role,
    false
  )
$$;

create or replace function private.log_affiliate_event(
  p_event_type public.affiliate_event_type,
  p_affiliate_user_id uuid default null,
  p_profile_user_id uuid default null,
  p_link_id uuid default null,
  p_attribution_id uuid default null,
  p_commission_id uuid default null,
  p_payout_id uuid default null,
  p_details jsonb default '{}'::jsonb,
  p_actor_user_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.affiliate_events (
    affiliate_user_id,
    event_type,
    actor_user_id,
    profile_user_id,
    link_id,
    attribution_id,
    commission_id,
    payout_id,
    details
  ) values (
    p_affiliate_user_id,
    p_event_type,
    coalesce(p_actor_user_id, (select auth.uid())),
    p_profile_user_id,
    p_link_id,
    p_attribution_id,
    p_commission_id,
    p_payout_id,
    coalesce(p_details, '{}'::jsonb)
  )
$$;

create or replace function private.affiliate_subject_is_available(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_subject_type = 'course'::public.checkout_subject_type then
    return exists (
      select 1
      from public.courses course_record
      where course_record.id = p_subject_id
        and course_record.affiliate_eligible
        and course_record.status = 'published'::public.course_status
        and course_record.deleted_at is null
        and (course_record.availability_starts_at is null or course_record.availability_starts_at <= statement_timestamp())
        and (course_record.availability_ends_at is null or course_record.availability_ends_at > statement_timestamp())
    );
  end if;

  if p_subject_type = 'digital_product'::public.checkout_subject_type then
    return exists (
      select 1
      from public.digital_products product_record
      where product_record.id = p_subject_id
        and product_record.affiliate_eligible
        and product_record.status = 'published'::public.digital_product_status
        and product_record.deleted_at is null
        and (product_record.availability_starts_at is null or product_record.availability_starts_at <= statement_timestamp())
        and (product_record.availability_ends_at is null or product_record.availability_ends_at > statement_timestamp())
    );
  end if;

  return false;
end;
$$;

revoke all on function private.affiliate_is_admin() from public, anon, authenticated;
revoke all on function private.log_affiliate_event(
  public.affiliate_event_type,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  uuid
) from public, anon, authenticated;
revoke all on function private.affiliate_subject_is_available(
  public.checkout_subject_type,
  uuid
) from public, anon, authenticated;
