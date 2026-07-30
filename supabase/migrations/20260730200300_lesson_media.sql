-- FASE B10: normalized lesson media sources.

create type public.lesson_media_provider as enum ('private_asset', 'youtube', 'vimeo');

create table public.lesson_media (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.aulas(id) on delete cascade,
  provider public.lesson_media_provider not null,
  asset_id uuid references public.assets(id) on delete restrict,
  external_video_id text,
  is_active boolean not null default true,
  watermark_enabled boolean not null default true,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint lesson_media_lesson_unique unique (lesson_id),
  constraint lesson_media_source_exactly_one check (
    (
      provider = 'private_asset'::public.lesson_media_provider
      and asset_id is not null
      and external_video_id is null
    )
    or (
      provider in ('youtube'::public.lesson_media_provider, 'vimeo'::public.lesson_media_provider)
      and asset_id is null
      and external_video_id is not null
    )
  ),
  constraint lesson_media_external_id_format check (
    external_video_id is null
    or (
      provider = 'youtube'::public.lesson_media_provider
      and external_video_id ~ '^[A-Za-z0-9_-]{11}$'
    )
    or (
      provider = 'vimeo'::public.lesson_media_provider
      and external_video_id ~ '^[0-9]{6,12}$'
    )
  )
);

create index lesson_media_asset_id_idx on public.lesson_media (asset_id) where asset_id is not null;
create index lesson_media_created_by_idx on public.lesson_media (created_by_user_id);

create trigger lesson_media_set_updated_at
before update on public.lesson_media
for each row execute function public.set_updated_at();

alter table public.lesson_media enable row level security;
alter table public.lesson_media force row level security;

revoke all on table public.lesson_media from public, anon, authenticated;
grant select on table public.lesson_media to authenticated, service_role;
grant insert, update, delete on table public.lesson_media to service_role;

create policy lesson_media_select
on public.lesson_media for select to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or (
    is_active
    and (select private.current_user_role()) = 'aluno'::public.app_role
    and (select private.has_active_course_access(
      (select auth.uid()),
      (select private.lesson_course_id(lesson_media.lesson_id))
    ))
  )
);

create or replace function private.youtube_video_id(p_url text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_match text[];
begin
  if p_url is null or char_length(p_url) > 1000 then
    return null;
  end if;

  v_match := regexp_match(
    btrim(p_url),
    '^https://(?:www\.|m\.)?youtube\.com/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})(?:[&#].*)?$',
    'i'
  );
  if v_match is not null then return v_match[1]; end if;

  v_match := regexp_match(
    btrim(p_url),
    '^https://youtu\.be/([A-Za-z0-9_-]{11})(?:[/?#].*)?$',
    'i'
  );
  if v_match is not null then return v_match[1]; end if;

  v_match := regexp_match(
    btrim(p_url),
    '^https://(?:www\.)?youtube(?:-nocookie)?\.com/(?:embed|shorts)/([A-Za-z0-9_-]{11})(?:[/?#].*)?$',
    'i'
  );
  if v_match is not null then return v_match[1]; end if;

  return null;
end;
$$;

create or replace function private.vimeo_video_id(p_url text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_match text[];
begin
  if p_url is null or char_length(p_url) > 1000 then
    return null;
  end if;

  v_match := regexp_match(
    btrim(p_url),
    '^https://(?:www\.)?vimeo\.com/([0-9]{6,12})(?:[/?#].*)?$',
    'i'
  );
  if v_match is not null then return v_match[1]; end if;

  v_match := regexp_match(
    btrim(p_url),
    '^https://player\.vimeo\.com/video/([0-9]{6,12})(?:[/?#].*)?$',
    'i'
  );
  if v_match is not null then return v_match[1]; end if;

  return null;
end;
$$;

create or replace function private.lesson_embed_url(
  p_provider public.lesson_media_provider,
  p_external_video_id text
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_provider
    when 'youtube'::public.lesson_media_provider then
      'https://www.youtube-nocookie.com/embed/' || p_external_video_id || '?rel=0&modestbranding=1'
    when 'vimeo'::public.lesson_media_provider then
      'https://player.vimeo.com/video/' || p_external_video_id || '?dnt=1&title=0&byline=0&portrait=0'
    else null
  end
$$;

revoke all on function private.youtube_video_id(text) from public, anon, authenticated;
revoke all on function private.vimeo_video_id(text) from public, anon, authenticated;
revoke all on function private.lesson_embed_url(public.lesson_media_provider, text) from public, anon, authenticated;
grant execute on function private.lesson_embed_url(public.lesson_media_provider, text) to service_role;

create or replace function private.upsert_external_lesson_media(
  p_lesson_id uuid,
  p_provider public.lesson_media_provider,
  p_source_url text,
  p_watermark_enabled boolean default true
)
returns public.lesson_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_video_id text;
  v_media public.lesson_media;
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.aulas where id = p_lesson_id) then
    raise exception 'LESSON_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_provider = 'youtube'::public.lesson_media_provider then
    v_video_id := private.youtube_video_id(p_source_url);
  elsif p_provider = 'vimeo'::public.lesson_media_provider then
    v_video_id := private.vimeo_video_id(p_source_url);
  else
    raise exception 'EXTERNAL_PROVIDER_REQUIRED' using errcode = '22023';
  end if;

  if v_video_id is null then
    raise exception 'INVALID_EXTERNAL_MEDIA_URL' using errcode = '22023';
  end if;

  insert into public.lesson_media (
    lesson_id,
    provider,
    asset_id,
    external_video_id,
    is_active,
    watermark_enabled,
    created_by_user_id
  ) values (
    p_lesson_id,
    p_provider,
    null,
    v_video_id,
    true,
    coalesce(p_watermark_enabled, true),
    (select auth.uid())
  )
  on conflict (lesson_id) do update set
    provider = excluded.provider,
    asset_id = null,
    external_video_id = excluded.external_video_id,
    is_active = true,
    watermark_enabled = excluded.watermark_enabled,
    created_by_user_id = excluded.created_by_user_id
  returning * into v_media;

  return v_media;
end;
$$;

create or replace function private.upsert_private_lesson_media(
  p_lesson_id uuid,
  p_asset_id uuid,
  p_watermark_enabled boolean default true
)
returns public.lesson_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_media public.lesson_media;
  v_actor uuid := (select auth.uid());
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if not exists (select 1 from public.aulas where id = p_lesson_id) then
    raise exception 'LESSON_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.assets
    where id = p_asset_id
      and lesson_id = p_lesson_id
      and purpose = 'video'::public.asset_purpose
      and state = 'published'::public.asset_state
      and deleted_at is null
  ) then
    raise exception 'PUBLISHED_LESSON_VIDEO_REQUIRED' using errcode = 'P0002';
  end if;

  insert into public.lesson_media (
    lesson_id,
    provider,
    asset_id,
    external_video_id,
    is_active,
    watermark_enabled,
    created_by_user_id
  ) values (
    p_lesson_id,
    'private_asset'::public.lesson_media_provider,
    p_asset_id,
    null,
    true,
    coalesce(p_watermark_enabled, true),
    v_actor
  )
  on conflict (lesson_id) do update set
    provider = 'private_asset'::public.lesson_media_provider,
    asset_id = excluded.asset_id,
    external_video_id = null,
    is_active = true,
    watermark_enabled = excluded.watermark_enabled,
    created_by_user_id = excluded.created_by_user_id
  returning * into v_media;

  return v_media;
end;
$$;

create or replace function private.disable_lesson_media(p_lesson_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.current_user_role()) <> 'administrador_proprietario'::public.app_role then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  update public.lesson_media
  set is_active = false
  where lesson_id = p_lesson_id;

  return found;
end;
$$;

revoke all on function private.upsert_external_lesson_media(uuid, public.lesson_media_provider, text, boolean) from public, anon, authenticated;
revoke all on function private.upsert_private_lesson_media(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function private.disable_lesson_media(uuid) from public, anon, authenticated;
grant execute on function private.upsert_external_lesson_media(uuid, public.lesson_media_provider, text, boolean) to authenticated, service_role;
grant execute on function private.upsert_private_lesson_media(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function private.disable_lesson_media(uuid) to authenticated, service_role;

create function public.upsert_external_lesson_media(
  p_lesson_id uuid,
  p_provider public.lesson_media_provider,
  p_source_url text,
  p_watermark_enabled boolean default true
)
returns public.lesson_media
language sql
security invoker
set search_path = ''
as $$
  select private.upsert_external_lesson_media(p_lesson_id, p_provider, p_source_url, p_watermark_enabled)
$$;

create function public.upsert_private_lesson_media(
  p_lesson_id uuid,
  p_asset_id uuid,
  p_watermark_enabled boolean default true
)
returns public.lesson_media
language sql
security invoker
set search_path = ''
as $$
  select private.upsert_private_lesson_media(p_lesson_id, p_asset_id, p_watermark_enabled)
$$;

create function public.disable_lesson_media(p_lesson_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.disable_lesson_media(p_lesson_id)
$$;

revoke all on function public.upsert_external_lesson_media(uuid, public.lesson_media_provider, text, boolean) from public, anon;
revoke all on function public.upsert_private_lesson_media(uuid, uuid, boolean) from public, anon;
revoke all on function public.disable_lesson_media(uuid) from public, anon;
grant execute on function public.upsert_external_lesson_media(uuid, public.lesson_media_provider, text, boolean) to authenticated, service_role;
grant execute on function public.upsert_private_lesson_media(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.disable_lesson_media(uuid) to authenticated, service_role;

alter table public.aulas drop column video;
