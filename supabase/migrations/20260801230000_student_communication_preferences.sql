create table public.student_communication_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_transactional boolean not null default false,
  email_product_updates boolean not null default false,
  email_marketing boolean not null default false,
  privacy_analytics boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint student_communication_preferences_consent_pair_check
    check ((consent_version is null) = (consented_at is null)),
  constraint student_communication_preferences_consent_version_check
    check (consent_version is null or length(btrim(consent_version)) between 1 and 100)
);

create trigger student_communication_preferences_set_updated_at
before update on public.student_communication_preferences
for each row execute function public.set_updated_at();

alter table public.student_communication_preferences enable row level security;
alter table public.student_communication_preferences force row level security;
revoke all on public.student_communication_preferences from public, anon, authenticated;
grant all on public.student_communication_preferences to service_role;

create policy student_communication_preferences_direct_access_denied
on public.student_communication_preferences
as restrictive
for all
to public
using (false)
with check (false);

create or replace function private.get_my_student_communication_preferences()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.student_communication_preferences%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  insert into public.student_communication_preferences (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select * into v_row
  from public.student_communication_preferences
  where user_id = v_user_id;

  return jsonb_build_object(
    'in_app_transactional', true,
    'email_transactional', v_row.email_transactional,
    'email_product_updates', v_row.email_product_updates,
    'email_marketing', v_row.email_marketing,
    'privacy_analytics', v_row.privacy_analytics,
    'consent_version', v_row.consent_version,
    'consented_at', v_row.consented_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function private.update_my_student_communication_preferences(
  p_email_transactional boolean,
  p_email_product_updates boolean,
  p_email_marketing boolean,
  p_privacy_analytics boolean,
  p_consent_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_consent_version text := nullif(btrim(p_consent_version), '');
  v_consent_required boolean := coalesce(p_email_marketing, false) or coalesce(p_privacy_analytics, false);
  v_row public.student_communication_preferences%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if v_consent_required and v_consent_version is null then
    raise exception 'CONSENT_VERSION_REQUIRED' using errcode = '22023';
  end if;

  if v_consent_version is not null and length(v_consent_version) > 100 then
    raise exception 'CONSENT_VERSION_INVALID' using errcode = '22023';
  end if;

  insert into public.student_communication_preferences (
    user_id,
    email_transactional,
    email_product_updates,
    email_marketing,
    privacy_analytics,
    consent_version,
    consented_at
  ) values (
    v_user_id,
    coalesce(p_email_transactional, false),
    coalesce(p_email_product_updates, false),
    coalesce(p_email_marketing, false),
    coalesce(p_privacy_analytics, false),
    case when v_consent_required then v_consent_version else null end,
    case when v_consent_required then statement_timestamp() else null end
  )
  on conflict (user_id) do update set
    email_transactional = excluded.email_transactional,
    email_product_updates = excluded.email_product_updates,
    email_marketing = excluded.email_marketing,
    privacy_analytics = excluded.privacy_analytics,
    consent_version = excluded.consent_version,
    consented_at = excluded.consented_at
  returning * into v_row;

  return jsonb_build_object(
    'in_app_transactional', true,
    'email_transactional', v_row.email_transactional,
    'email_product_updates', v_row.email_product_updates,
    'email_marketing', v_row.email_marketing,
    'privacy_analytics', v_row.privacy_analytics,
    'consent_version', v_row.consent_version,
    'consented_at', v_row.consented_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.get_my_student_communication_preferences()
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_my_student_communication_preferences();
$$;

create or replace function public.update_my_student_communication_preferences(
  p_email_transactional boolean,
  p_email_product_updates boolean,
  p_email_marketing boolean,
  p_privacy_analytics boolean,
  p_consent_version text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.update_my_student_communication_preferences(
    p_email_transactional,
    p_email_product_updates,
    p_email_marketing,
    p_privacy_analytics,
    p_consent_version
  );
$$;

revoke all on function public.get_my_student_communication_preferences() from public, anon;
revoke all on function public.update_my_student_communication_preferences(boolean, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.get_my_student_communication_preferences() to authenticated, service_role;
grant execute on function public.update_my_student_communication_preferences(boolean, boolean, boolean, boolean, text) to authenticated, service_role;
grant usage on schema private to authenticated, service_role;
grant execute on function private.get_my_student_communication_preferences() to authenticated, service_role;
grant execute on function private.update_my_student_communication_preferences(boolean, boolean, boolean, boolean, text) to authenticated, service_role;
