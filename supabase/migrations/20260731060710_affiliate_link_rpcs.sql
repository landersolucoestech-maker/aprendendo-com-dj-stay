-- FASE B20: criação idempotente e desativação auditada de links.

create or replace function public.create_affiliate_link(
  p_subject_type public.checkout_subject_type,
  p_subject_id uuid,
  p_destination_path text
)
returns public.affiliate_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.affiliate_profiles;
  v_terms public.affiliate_subject_terms;
  v_link public.affiliate_links;
begin
  if v_user_id is null
     or (select private.current_user_role()) <> 'afiliado'::public.app_role then
    raise exception 'AFFILIATE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_subject_id is null
     or p_destination_path !~ '^/[A-Za-z0-9/_?&=.-]{1,500}$'
     or p_destination_path ~ '^//' then
    raise exception 'AFFILIATE_DESTINATION_INVALID' using errcode = '22023';
  end if;

  select * into v_profile
  from public.affiliate_profiles
  where user_id = v_user_id
    and status = 'active'::public.affiliate_profile_status;
  if not found then
    raise exception 'AFFILIATE_PROFILE_NOT_ACTIVE' using errcode = '42501';
  end if;

  select * into v_terms
  from public.affiliate_subject_terms
  where subject_type = p_subject_type
    and subject_id = p_subject_id
    and active;
  if not found or not private.affiliate_subject_is_available(p_subject_type, p_subject_id) then
    raise exception 'AFFILIATE_SUBJECT_NOT_AVAILABLE' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'affiliate-link:' || v_user_id::text || ':' || p_subject_type::text || ':' || p_subject_id::text,
      0
    )
  );

  select * into v_link
  from public.affiliate_links
  where affiliate_user_id = v_user_id
    and subject_type = p_subject_type
    and subject_id = p_subject_id
    and status = 'active'::public.affiliate_link_status
  for update;

  if found then
    return v_link;
  end if;

  insert into public.affiliate_links (
    affiliate_user_id,
    subject_type,
    subject_id,
    code,
    destination_path
  ) values (
    v_user_id,
    p_subject_type,
    p_subject_id,
    lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)),
    p_destination_path
  )
  returning * into v_link;

  perform private.log_affiliate_event(
    'link_created'::public.affiliate_event_type,
    v_user_id,
    v_user_id,
    v_link.id,
    null,
    null,
    null,
    jsonb_build_object(
      'subject_type', v_link.subject_type,
      'subject_id', v_link.subject_id,
      'destination_path', v_link.destination_path,
      'terms_id', v_terms.id
    ),
    v_user_id
  );

  return v_link;
end;
$$;

create or replace function public.deactivate_affiliate_link(
  p_link_id uuid
)
returns public.affiliate_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_link public.affiliate_links;
begin
  if v_user_id is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;

  select * into v_link
  from public.affiliate_links
  where id = p_link_id
  for update;

  if not found then
    raise exception 'AFFILIATE_LINK_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_link.affiliate_user_id <> v_user_id and not (select private.affiliate_is_admin()) then
    raise exception 'AFFILIATE_LINK_OWNERSHIP_REQUIRED' using errcode = '42501';
  end if;
  if v_link.status = 'inactive'::public.affiliate_link_status then
    return v_link;
  end if;

  update public.affiliate_links
  set status = 'inactive'::public.affiliate_link_status,
      deactivated_at = statement_timestamp()
  where id = v_link.id
  returning * into v_link;

  update public.affiliate_attributions
  set status = 'invalidated'::public.affiliate_attribution_status,
      invalidated_at = statement_timestamp(),
      invalidation_reason = 'Link de afiliado desativado.'
  where link_id = v_link.id
    and status = 'active'::public.affiliate_attribution_status;

  perform private.log_affiliate_event(
    'link_deactivated'::public.affiliate_event_type,
    v_link.affiliate_user_id,
    v_link.affiliate_user_id,
    v_link.id,
    null,
    null,
    null,
    '{}'::jsonb,
    v_user_id
  );

  return v_link;
end;
$$;

revoke all on function public.create_affiliate_link(
  public.checkout_subject_type,
  uuid,
  text
) from public, anon, authenticated;
revoke all on function public.deactivate_affiliate_link(uuid) from public, anon, authenticated;

grant execute on function public.create_affiliate_link(
  public.checkout_subject_type,
  uuid,
  text
) to authenticated;
grant execute on function public.deactivate_affiliate_link(uuid) to authenticated;
