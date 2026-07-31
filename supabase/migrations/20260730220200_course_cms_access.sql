create or replace function private.has_active_course_access(p_user_id uuid,p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.enrollments e
    join public.courses c on c.id=e.course_id
    where e.user_id=p_user_id and e.course_id=p_course_id
      and c.status='published' and c.deleted_at is null
      and (c.availability_starts_at is null or c.availability_starts_at<=statement_timestamp())
      and (c.availability_ends_at is null or c.availability_ends_at>statement_timestamp())
      and (
        c.release_mode='immediate'
        or (c.release_mode='scheduled' and c.release_at<=statement_timestamp())
        or c.release_mode='drip'
      )
      and e.status='active' and e.starts_at<=statement_timestamp()
      and (e.expires_at is null or e.expires_at>statement_timestamp())
  )
$$;

drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated using (
  (
    (select private.current_user_role())='administrador_proprietario'::public.app_role
    and deleted_at is null
  )
  or (
    (select private.current_user_role())='aluno'::public.app_role
    and (select private.has_active_course_access((select auth.uid()),courses.id))
  )
);
