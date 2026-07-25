begin;

create or replace function private.sync_enrollment_certificate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  certificate_allowed boolean;
begin
  select certificate_enabled into certificate_allowed
  from public.courses
  where id = new.course_id;

  if new.status = 'completed' and certificate_allowed then
    insert into public.certificates (
      enrollment_id,
      user_id,
      course_id,
      issued_at,
      metadata
    ) values (
      new.id,
      new.user_id,
      new.course_id,
      coalesce(new.completed_at, now()),
      jsonb_build_object('progress_percent', new.progress_percent)
    )
    on conflict (enrollment_id) do update set
      revoked_at = null,
      issued_at = least(public.certificates.issued_at, excluded.issued_at),
      metadata = excluded.metadata;
  elsif new.status in ('refunded', 'revoked') then
    update public.certificates
       set revoked_at = coalesce(revoked_at, now())
     where enrollment_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_enrollment_certificate() from public, anon, authenticated;

drop trigger if exists enrollments_sync_certificate on public.enrollments;
create trigger enrollments_sync_certificate
  after insert or update of status, completed_at, progress_percent
  on public.enrollments
  for each row
  execute function private.sync_enrollment_certificate();

create or replace function public.verify_certificate(target_verification_code text)
returns table (
  verification_code text,
  student_name text,
  course_title text,
  issued_at timestamptz,
  valid boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    c.verification_code,
    p.full_name,
    cr.title,
    c.issued_at,
    c.revoked_at is null as valid
  from public.certificates c
  join public.profiles p on p.id = c.user_id
  join public.courses cr on cr.id = c.course_id
  where c.verification_code = target_verification_code
  limit 1;
$$;

revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
