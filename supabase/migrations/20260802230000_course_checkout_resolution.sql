-- FASE B89: resolução autenticada do curso antes do checkout hospedado.

create or replace function private.resolve_course_checkout_subject(
  p_course_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role public.app_role := (select private.current_user_role());
  v_slug text := lower(btrim(coalesce(p_course_slug, '')));
  v_course public.courses;
  v_already_enrolled boolean;
begin
  if v_user_id is null or v_role is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '42501';
  end if;

  if v_role not in (
    'aluno'::public.app_role,
    'administrador_proprietario'::public.app_role
  ) then
    raise exception 'COURSE_BUYER_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'COURSE_SLUG_INVALID' using errcode = '22023';
  end if;

  select * into v_course
  from public.courses course_record
  where course_record.slug = v_slug
    and course_record.status = 'published'::public.course_status
    and course_record.deleted_at is null
    and course_record.price_amount is not null
    and course_record.price_amount > 0
    and course_record.currency_code = 'BRL'
    and (
      course_record.availability_starts_at is null
      or course_record.availability_starts_at <= statement_timestamp()
    )
    and (
      course_record.availability_ends_at is null
      or course_record.availability_ends_at > statement_timestamp()
    )
    and (
      course_record.release_mode = 'immediate'::public.course_release_mode
      or (
        course_record.release_mode = 'scheduled'::public.course_release_mode
        and course_record.release_at <= statement_timestamp()
      )
      or course_record.release_mode = 'drip'::public.course_release_mode
    )
  limit 1;

  if not found then
    raise exception 'COURSE_NOT_AVAILABLE_FOR_CHECKOUT' using errcode = 'P0002';
  end if;

  v_already_enrolled := private.has_active_course_access(v_user_id, v_course.id);

  return jsonb_build_object(
    'course_id', case when v_already_enrolled then null else v_course.id end,
    'slug', v_course.slug,
    'title', v_course.title,
    'checkout_eligible', not v_already_enrolled,
    'already_enrolled', v_already_enrolled
  );
end;
$$;

create or replace function public.resolve_course_checkout_subject(
  p_course_slug text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.resolve_course_checkout_subject(p_course_slug)
$$;

revoke all on function private.resolve_course_checkout_subject(text)
  from public, anon, authenticated;
revoke all on function public.resolve_course_checkout_subject(text)
  from public, anon, authenticated;

grant execute on function private.resolve_course_checkout_subject(text)
  to authenticated;
grant execute on function public.resolve_course_checkout_subject(text)
  to authenticated;
