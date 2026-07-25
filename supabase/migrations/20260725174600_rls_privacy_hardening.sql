begin;

-- Public preview policies must not depend on private-schema execution.
drop policy if exists lessons_authorized_select on public.lessons;
create policy lessons_public_preview_select
on public.lessons for select
to anon, authenticated
using (
  is_preview
  and is_published
  and exists (
    select 1
    from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = lessons.module_id
      and m.is_published
      and c.status = 'published'
      and c.deleted_at is null
  )
);

create policy lessons_enrolled_or_manager_select
on public.lessons for select
to authenticated
using (private.can_access_lesson(id));

drop policy if exists assets_authorized_select on public.lesson_assets;
create policy assets_public_preview_select
on public.lesson_assets for select
to anon, authenticated
using (
  visibility = 'preview'
  and exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = lesson_assets.lesson_id
      and l.is_preview
      and l.is_published
      and m.is_published
      and c.status = 'published'
      and c.deleted_at is null
  )
);

create policy assets_enrolled_or_manager_select
on public.lesson_assets for select
to authenticated
using (
  (visibility = 'enrolled' and private.can_access_lesson(lesson_id))
  or (
    visibility = 'instructor'
    and exists (
      select 1
      from public.lessons l
      join public.course_modules m on m.id = l.module_id
      where l.id = lesson_assets.lesson_id
        and private.can_manage_course(m.course_id)
    )
  )
);

revoke execute on function private.can_access_lesson(uuid) from anon;

-- Expose only public instructor fields to anonymous visitors.
revoke select on public.instructor_profiles from anon;
drop view if exists public.public_instructors;
create view public.public_instructors
with (security_invoker = false)
as
select
  ip.user_id,
  ip.display_name,
  ip.bio,
  ip.headline,
  ip.website_url,
  ip.social_links,
  p.avatar_url
from public.instructor_profiles ip
join public.profiles p on p.id = ip.user_id
where p.status = 'active';

grant select on public.public_instructors to anon, authenticated;

-- Restrict profile columns exposed through the Data API.
revoke all on public.profiles from authenticated;
grant select (
  id,
  full_name,
  phone,
  avatar_url,
  locale,
  timezone,
  status,
  created_at,
  updated_at
) on public.profiles to authenticated;
grant update (
  full_name,
  phone,
  avatar_url,
  locale,
  timezone,
  updated_at
) on public.profiles to authenticated;

commit;
