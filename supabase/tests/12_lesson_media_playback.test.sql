begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

select has_type('public','lesson_media_provider','lesson media provider enum exists');
select ok(
  (select array_agg(enumlabel::text order by enumsortorder) from pg_enum where enumtypid='public.lesson_media_provider'::regtype)
    = array['private_asset','youtube','vimeo']::text[],
  'lesson media providers are allowlisted'
);
select has_table('public','lesson_media','normalized lesson media table exists');
select has_table('public','playback_tokens','opaque playback token table exists');
select has_table('public','playback_events','playback audit table exists');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='aulas' and column_name='video'),'arbitrary lesson video URL column was removed');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.lesson_media'::regclass),'lesson media has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.playback_tokens'::regclass),'playback tokens has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.playback_events'::regclass),'playback events has forced RLS');
select ok(not has_function_privilege('authenticated','public.resolve_lesson_playback_token(text,text)','EXECUTE'),'browser role cannot resolve private media object paths');
select is(private.vimeo_video_id('https://player.vimeo.com/video/123456789?dnt=1'),'123456789','Vimeo URL is normalized to provider id');

insert into auth.users (id,email)
values
  ('19000000-0000-4000-8000-000000000001','media-admin@example.test'),
  ('19000000-0000-4000-8000-000000000002','media-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='19000000-0000-4000-8000-000000000001';
insert into public.courses (id,title,slug,status)
values ('29000000-0000-4000-8000-000000000001','Curso de mídia','curso-midia-protegida','published');
insert into public.modulos (id,course_id,titulo,ordem)
values ('39000000-0000-4000-8000-000000000001','29000000-0000-4000-8000-000000000001','Módulo de mídia',1);
insert into public.aulas (id,modulo_id,titulo,ordem)
values ('49000000-0000-4000-8000-000000000001','39000000-0000-4000-8000-000000000001','Aula de mídia',1);
insert into public.enrollments (id,user_id,course_id,status,source,starts_at,expires_at,granted_by_user_id)
values ('59000000-0000-4000-8000-000000000001','19000000-0000-4000-8000-000000000002','29000000-0000-4000-8000-000000000001','active','manual_grant',statement_timestamp()-interval '1 minute',statement_timestamp()+interval '1 day','19000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"99000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select throws_ok(
  $$select public.upsert_external_lesson_media('49000000-0000-4000-8000-000000000001','youtube','https://evil.example/watch?v=dQw4w9WgXcQ',true)$$,
  '22023',null,'unapproved external hostname is rejected'
);
select results_eq(
  $$select (public.upsert_external_lesson_media('49000000-0000-4000-8000-000000000001','youtube','https://www.youtube.com/watch?v=dQw4w9WgXcQ',true)).provider::text$$,
  $$values ('youtube'::text)$$,
  'administrator stores normalized YouTube provider'
);
select results_eq(
  $$select external_video_id from public.lesson_media where lesson_id='49000000-0000-4000-8000-000000000001'$$,
  $$values ('dQw4w9WgXcQ'::text)$$,
  'only normalized provider id is persisted'
);
select results_eq(
  $$select private.lesson_embed_url(provider,external_video_id) from public.lesson_media where lesson_id='49000000-0000-4000-8000-000000000001'$$,
  $$values ('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'::text)$$,
  'official privacy-enhanced embed URL is derived'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"99000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.lesson_media),1,'enrolled student can read active lesson media metadata');
select set_config('test.playback_token',coalesce((select token from public.request_lesson_playback_token('49000000-0000-4000-8000-000000000001',repeat('a',64)) where granted),''),false);
select matches(current_setting('test.playback_token'),'^[a-f0-9]{48}$','authenticated request receives short opaque token');
select is((select count(*)::integer from public.playback_tokens),1,'one hashed token record is created');
select ok((select token_hash <> current_setting('test.playback_token') from public.playback_tokens),'raw playback token is never persisted');
select ok((select expires_at > statement_timestamp() and expires_at <= statement_timestamp()+interval '5 minutes 5 seconds' from public.playback_tokens),'playback token has short bounded lifetime');
select matches((select watermark_text from public.playback_tokens),'^ID [A-F0-9]{10}$','session watermark is generated without exposing email');
select is((select count(*)::integer from public.playback_events where event_type='issued'),1,'token issuance is audited');
reset role;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select results_eq(
  $$select granted from public.resolve_lesson_playback_token(current_setting('test.playback_token'),repeat('a',64))$$,
  $$values (true)$$,
  'trusted media service resolves valid token'
);
select ok(
  (select embed_url like 'https://www.youtube-nocookie.com/embed/%' and bucket_id is null and object_path is null from public.resolve_lesson_playback_token(current_setting('test.playback_token'),repeat('a',64))),
  'external resolution exposes official embed but no storage path'
);
select results_eq(
  $$select reason from public.resolve_lesson_playback_token(current_setting('test.playback_token'),repeat('b',64))$$,
  $$values ('FINGERPRINT_MISMATCH'::text)$$,
  'token is bound to client fingerprint'
);
select is((select use_count from public.playback_tokens),2,'successful resolutions increment usage count');
select is((select count(*)::integer from public.playback_events where event_type='denied' and reason='FINGERPRINT_MISMATCH'),1,'fingerprint denial is audited');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"99000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select ok(public.revoke_lesson_playback_token(current_setting('test.playback_token')),'student can revoke own playback token');
reset role;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select results_eq(
  $$select reason from public.resolve_lesson_playback_token(current_setting('test.playback_token'),repeat('a',64))$$,
  $$values ('TOKEN_REVOKED'::text)$$,
  'revoked token cannot be resolved'
);
select ok((select count(*)::integer from public.playback_events where event_type in ('resolved','denied','revoked')) >= 4,'resolution, denial and revocation are audited');
reset role;

select * from finish();
rollback;
