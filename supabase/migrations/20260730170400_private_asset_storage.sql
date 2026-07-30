insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'private-assets',
  'private-assets',
  false,
  5368709120,
  array[
    'image/jpeg','image/png','image/webp','image/avif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/ogg','audio/mp4','audio/aac','audio/aiff',
    'application/pdf','text/plain','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip','application/x-zip-compressed','application/vnd.rar','application/x-7z-compressed','application/x-tar','application/gzip','application/octet-stream'
  ]::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy private_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-assets'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.assets
    where assets.bucket_id = storage.objects.bucket_id
      and assets.object_path = storage.objects.name
      and assets.created_by_user_id = (select auth.uid())
      and assets.owner_user_id = (select auth.uid())
      and assets.state = 'pending'::public.asset_state
      and assets.deleted_at is null
  )
);

create policy private_assets_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-assets'
  and exists (
    select 1
    from public.assets
    where assets.bucket_id = storage.objects.bucket_id
      and assets.object_path = storage.objects.name
      and assets.deleted_at is null
  )
);

create policy private_assets_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private-assets'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.assets
    where assets.bucket_id = storage.objects.bucket_id
      and assets.object_path = storage.objects.name
      and assets.created_by_user_id = (select auth.uid())
      and assets.state = 'pending'::public.asset_state
      and assets.deleted_at is null
  )
)
with check (
  bucket_id = 'private-assets'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1
    from public.assets
    where assets.bucket_id = storage.objects.bucket_id
      and assets.object_path = storage.objects.name
      and assets.created_by_user_id = (select auth.uid())
      and assets.state = 'pending'::public.asset_state
      and assets.deleted_at is null
  )
);

create policy private_assets_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private-assets'
  and exists (
    select 1
    from public.assets
    where assets.bucket_id = storage.objects.bucket_id
      and assets.object_path = storage.objects.name
      and (
        (assets.owner_user_id = (select auth.uid()) and assets.state in ('pending'::public.asset_state, 'failed'::public.asset_state))
        or (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
      )
  )
);

alter table public.user_profiles
add column avatar_asset_id uuid references public.assets(id) on delete set null;

create unique index user_profiles_avatar_asset_unique
on public.user_profiles (avatar_asset_id)
where avatar_asset_id is not null;

alter table public.user_profiles drop column avatar_url;

drop table public.lesson_files;
