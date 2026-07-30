create type public.asset_purpose as enum (
  'avatar',
  'video',
  'audio',
  'image',
  'document',
  'sample',
  'preset',
  'stem',
  'project',
  'archive',
  'template',
  'support_file',
  'digital_product'
);

create type public.asset_state as enum (
  'pending',
  'uploaded',
  'processing',
  'published',
  'failed'
);

create type public.asset_event_type as enum (
  'intent_created',
  'upload_confirmed',
  'processing_started',
  'published',
  'failed',
  'cleanup_requested',
  'object_removed',
  'associated'
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  lesson_id uuid references public.aulas(id) on delete cascade,
  purpose public.asset_purpose not null,
  state public.asset_state not null default 'pending'::public.asset_state,
  bucket_id text not null default 'private-assets',
  object_path text generated always as (
    'v1/' || owner_user_id::text || '/' || id::text || '.' || extension
  ) stored,
  original_name text not null,
  normalized_name text not null,
  extension text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  uploaded_at timestamptz,
  processing_started_at timestamptz,
  published_at timestamptz,
  failed_at timestamptz,
  deleted_at timestamptz,
  constraint assets_bucket_private check (bucket_id = 'private-assets'),
  constraint assets_original_name_length check (char_length(original_name) between 1 and 255),
  constraint assets_normalized_name_length check (char_length(normalized_name) between 1 and 255),
  constraint assets_extension_format check (extension ~ '^[a-z0-9]{1,16}$'),
  constraint assets_mime_type_format check (mime_type ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$'),
  constraint assets_size_positive check (size_bytes > 0),
  constraint assets_checksum_format check (checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint assets_idempotency_format check (idempotency_key ~ '^[A-Za-z0-9:_-]{16,128}$'),
  constraint assets_avatar_scope check (
    purpose <> 'avatar'::public.asset_purpose
    or (lesson_id is null and owner_user_id = created_by_user_id)
  ),
  constraint assets_lesson_scope check (
    lesson_id is null or purpose <> 'avatar'::public.asset_purpose
  ),
  constraint assets_unique_intent unique (created_by_user_id, idempotency_key),
  constraint assets_unique_object_path unique (bucket_id, object_path)
);

create table public.asset_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type public.asset_event_type not null,
  from_state public.asset_state,
  to_state public.asset_state,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp()
);

create table public.asset_access_grants (
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by_user_id uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  primary key (asset_id, user_id),
  constraint asset_access_grants_future_expiry check (expires_at is null or expires_at > created_at)
);

create index assets_owner_state_idx on public.assets (owner_user_id, state, created_at desc);
create index assets_lesson_purpose_state_idx on public.assets (lesson_id, purpose, state) where lesson_id is not null;
create index assets_created_by_idx on public.assets (created_by_user_id, created_at desc);
create index asset_events_asset_created_idx on public.asset_events (asset_id, created_at desc);
create index asset_access_grants_user_idx on public.asset_access_grants (user_id, expires_at);

create trigger assets_set_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

alter table public.assets enable row level security;
alter table public.assets force row level security;
alter table public.asset_events enable row level security;
alter table public.asset_events force row level security;
alter table public.asset_access_grants enable row level security;
alter table public.asset_access_grants force row level security;

revoke all on table public.assets from public, anon, authenticated;
revoke all on table public.asset_events from public, anon, authenticated;
revoke all on table public.asset_access_grants from public, anon, authenticated;
grant select on table public.assets to authenticated, service_role;
grant select on table public.asset_events to authenticated, service_role;
grant select on table public.asset_access_grants to authenticated, service_role;
grant insert, update, delete on table public.assets to service_role;
grant insert, update, delete on table public.asset_events to service_role;
grant insert, update, delete on table public.asset_access_grants to service_role;

create policy assets_select
on public.assets
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or owner_user_id = (select auth.uid())
  or (
    (select private.current_user_role()) = 'aluno'::public.app_role
    and lesson_id is not null
    and state = 'published'::public.asset_state
    and deleted_at is null
    and exists (
      select 1
      from public.asset_access_grants
      where asset_access_grants.asset_id = assets.id
        and asset_access_grants.user_id = (select auth.uid())
        and (asset_access_grants.expires_at is null or asset_access_grants.expires_at > statement_timestamp())
    )
  )
);

create policy asset_events_select
on public.asset_events
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or exists (
    select 1
    from public.assets
    where assets.id = asset_events.asset_id
      and assets.owner_user_id = (select auth.uid())
  )
);

create policy asset_access_grants_select
on public.asset_access_grants
for select
to authenticated
using (
  (select private.current_user_role()) = 'administrador_proprietario'::public.app_role
  or user_id = (select auth.uid())
);

create or replace function private.asset_max_size_bytes(p_purpose public.asset_purpose)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case p_purpose
    when 'avatar'::public.asset_purpose then 5242880::bigint
    when 'image'::public.asset_purpose then 26214400::bigint
    when 'document'::public.asset_purpose then 104857600::bigint
    when 'support_file'::public.asset_purpose then 104857600::bigint
    when 'video'::public.asset_purpose then 5368709120::bigint
    when 'audio'::public.asset_purpose then 2147483648::bigint
    else 2147483648::bigint
  end
$$;

create or replace function private.asset_type_allowed(
  p_purpose public.asset_purpose,
  p_extension text,
  p_mime_type text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_purpose
    when 'avatar'::public.asset_purpose then
      p_extension = any(array['jpg','jpeg','png','webp'])
      and p_mime_type = any(array['image/jpeg','image/png','image/webp'])
    when 'image'::public.asset_purpose then
      p_extension = any(array['jpg','jpeg','png','webp','avif'])
      and p_mime_type = any(array['image/jpeg','image/png','image/webp','image/avif'])
    when 'video'::public.asset_purpose then
      p_extension = any(array['mp4','webm','mov'])
      and p_mime_type = any(array['video/mp4','video/webm','video/quicktime'])
    when 'audio'::public.asset_purpose then
      p_extension = any(array['mp3','wav','flac','ogg','m4a','aac'])
      and p_mime_type = any(array['audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/ogg','audio/mp4','audio/aac'])
    when 'document'::public.asset_purpose then
      p_extension = any(array['pdf','txt','doc','docx','xls','xlsx','ppt','pptx'])
      and p_mime_type = any(array[
        'application/pdf','text/plain','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ])
    when 'sample'::public.asset_purpose then
      p_extension = any(array['zip','wav','flac','aif','aiff','mp3'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/octet-stream','audio/wav','audio/x-wav','audio/flac','audio/aiff','audio/mpeg'])
    when 'stem'::public.asset_purpose then
      p_extension = any(array['zip','wav','flac','aif','aiff'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/octet-stream','audio/wav','audio/x-wav','audio/flac','audio/aiff'])
    when 'preset'::public.asset_purpose then
      p_extension = any(array['zip','adg','adv','vstpreset','fxp','fxb'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/octet-stream'])
    when 'project'::public.asset_purpose then
      p_extension = any(array['zip','als','flp','logicx','ptx'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/octet-stream'])
    when 'archive'::public.asset_purpose then
      p_extension = any(array['zip','rar','7z','tar','gz'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/vnd.rar','application/x-7z-compressed','application/x-tar','application/gzip','application/octet-stream'])
    when 'template'::public.asset_purpose then
      p_extension = any(array['zip','als','flp','logicx','ptx'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/octet-stream'])
    when 'support_file'::public.asset_purpose then
      p_extension = any(array['pdf','txt','jpg','jpeg','png','webp','zip'])
      and p_mime_type = any(array['application/pdf','text/plain','image/jpeg','image/png','image/webp','application/zip','application/x-zip-compressed'])
    when 'digital_product'::public.asset_purpose then
      p_extension = any(array['zip','rar','7z','pdf','wav','flac','mp3','als','flp','logicx','ptx'])
      and p_mime_type = any(array['application/zip','application/x-zip-compressed','application/vnd.rar','application/x-7z-compressed','application/pdf','application/octet-stream','audio/wav','audio/x-wav','audio/flac','audio/mpeg'])
  end
$$;

create or replace function private.normalize_asset_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9._-]+', '-', 'g')),
    255
  )
$$;

create or replace function private.log_asset_event(
  p_asset_id uuid,
  p_event_type public.asset_event_type,
  p_from_state public.asset_state,
  p_to_state public.asset_state,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.asset_events (
    asset_id,
    actor_user_id,
    event_type,
    from_state,
    to_state,
    details
  ) values (
    p_asset_id,
    (select auth.uid()),
    p_event_type,
    p_from_state,
    p_to_state,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function private.asset_max_size_bytes(public.asset_purpose) from public, anon, authenticated;
revoke all on function private.asset_type_allowed(public.asset_purpose, text, text) from public, anon, authenticated;
revoke all on function private.normalize_asset_name(text) from public, anon, authenticated;
revoke all on function private.log_asset_event(uuid, public.asset_event_type, public.asset_state, public.asset_state, jsonb) from public, anon, authenticated;
