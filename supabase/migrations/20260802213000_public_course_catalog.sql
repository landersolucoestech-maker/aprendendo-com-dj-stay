-- FASE B88: catálogo público seguro derivado do CMS persistido.

create or replace function private.get_public_course_catalog()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with visible_courses as (
    select
      course_record.*,
      (
        course_record.promotional_price_amount is not null
        and (
          course_record.promotion_starts_at is null
          or course_record.promotion_starts_at <= statement_timestamp()
        )
        and (
          course_record.promotion_ends_at is null
          or course_record.promotion_ends_at > statement_timestamp()
        )
      ) as promotion_active
    from public.courses course_record
    where course_record.status = 'published'::public.course_status
      and course_record.deleted_at is null
      and course_record.short_description is not null
      and course_record.description is not null
      and course_record.category is not null
      and cardinality(course_record.objectives) > 0
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
  ),
  visible_modules as (
    select module_record.*
    from public.modulos module_record
    join visible_courses course_record
      on course_record.id = module_record.course_id
    where module_record.status = 'published'::public.curriculum_item_status
      and module_record.deleted_at is null
  ),
  module_totals as (
    select
      lesson_record.modulo_id,
      count(*)::integer as lesson_count,
      coalesce(sum(coalesce(lesson_record.duracao, 0)), 0)::integer as duration_minutes,
      (count(*) filter (where lesson_record.preview_enabled))::integer as preview_lesson_count
    from public.aulas lesson_record
    join visible_modules module_record
      on module_record.id = lesson_record.modulo_id
    where lesson_record.status = 'published'::public.curriculum_item_status
      and lesson_record.deleted_at is null
    group by lesson_record.modulo_id
  )
  select jsonb_build_object(
    'courses',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'slug', course_record.slug,
          'title', course_record.title,
          'short_description', course_record.short_description,
          'description', course_record.description,
          'category', course_record.category,
          'language_code', course_record.language_code,
          'level', course_record.level,
          'objectives', course_record.objectives,
          'prerequisites', course_record.prerequisites,
          'price_amount', course_record.price_amount,
          'effective_price_amount', case
            when course_record.promotion_active
              then course_record.promotional_price_amount
            else course_record.price_amount
          end,
          'currency_code', course_record.currency_code,
          'promotion_active', course_record.promotion_active,
          'access_duration_days', course_record.access_duration_days,
          'certificate_enabled', course_record.certificate_enabled,
          'published_at', course_record.published_at,
          'module_count', (
            select count(*)::integer
            from visible_modules module_record
            where module_record.course_id = course_record.id
          ),
          'lesson_count', (
            select coalesce(sum(coalesce(module_total.lesson_count, 0)), 0)::integer
            from visible_modules module_record
            left join module_totals module_total
              on module_total.modulo_id = module_record.id
            where module_record.course_id = course_record.id
          ),
          'duration_minutes', (
            select coalesce(sum(coalesce(module_total.duration_minutes, 0)), 0)::integer
            from visible_modules module_record
            left join module_totals module_total
              on module_total.modulo_id = module_record.id
            where module_record.course_id = course_record.id
          ),
          'preview_lesson_count', (
            select coalesce(sum(coalesce(module_total.preview_lesson_count, 0)), 0)::integer
            from visible_modules module_record
            left join module_totals module_total
              on module_total.modulo_id = module_record.id
            where module_record.course_id = course_record.id
          ),
          'modules', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'title', module_record.titulo,
                'description', module_record.descricao,
                'position', module_record.ordem,
                'lesson_count', coalesce(module_total.lesson_count, 0),
                'duration_minutes', coalesce(module_total.duration_minutes, 0),
                'preview_lesson_count', coalesce(module_total.preview_lesson_count, 0)
              )
              order by module_record.ordem, module_record.titulo
            )
            from visible_modules module_record
            left join module_totals module_total
              on module_total.modulo_id = module_record.id
            where module_record.course_id = course_record.id
          ), '[]'::jsonb)
        )
        order by course_record.published_at desc, course_record.title
      ),
      '[]'::jsonb
    )
  )
  from visible_courses course_record
$$;

create or replace function public.get_public_course_catalog()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.get_public_course_catalog()
$$;

revoke all on function private.get_public_course_catalog() from public, anon, authenticated;
revoke all on function public.get_public_course_catalog() from public;

grant execute on function private.get_public_course_catalog() to anon, authenticated;
grant execute on function public.get_public_course_catalog() to anon, authenticated;
