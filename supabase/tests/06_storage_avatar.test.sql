begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email)
values
  ('14000000-0000-4000-8000-000000000001', 'avatar-owner@example.test'),
  ('14000000-0000-4000-8000-000000000002', 'avatar-other@example.test');

insert into public.modulos (id, titulo, ordem)
values ('24000000-0000-4000-8000-000000000001', 'Módulo de storage', 1);
insert into public.aulas (id, modulo_id, titulo, ordem)
values ('34000000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'Aula de storage', 1);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);

select lives_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'perfil.webp','image/webp',2048,'avatar:owner:00000001',null)$$,
  'student can prepare their own validated avatar upload'
);
select results_eq(
  $$select (public.prepare_asset_upload('avatar'::public.asset_purpose,'perfil.webp','image/webp',2048,'avatar:owner:00000001',null)).state::text$$,
  $$values ('pending'::text)$$,
  'same idempotency key returns the existing pending intent'
);
select is(
  (select count(*)::integer from public.assets where idempotency_key='avatar:owner:00000001'),
  1,
  'idempotent prepare creates one asset row'
);
select ok(
  (select object_path ~ '^v1/14000000-0000-4000-8000-000000000001/[0-9a-f-]{36}\.webp$' from public.assets where idempotency_key='avatar:owner:00000001'),
  'object path is immutable, versioned and owner scoped'
);
select throws_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'outro.png','image/png',2048,'avatar:owner:00000001',null)$$,
  '23505', null, 'idempotency key cannot be reused with different input'
);
select throws_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'perfil.svg','image/svg+xml',2048,'avatar:owner:00000002',null)$$,
  '22023', null, 'unsupported avatar type is rejected before upload'
);
select throws_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'perfil.png','image/png',5242881,'avatar:owner:00000003',null)$$,
  '22023', null, 'avatar larger than five megabytes is rejected'
);
select throws_ok(
  $$select public.prepare_asset_upload('sample'::public.asset_purpose,'samples.zip','application/zip',2048,'avatar:owner:00000004','34000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'student cannot prepare lesson assets'
);
select lives_ok(
  $$insert into storage.objects (bucket_id,name,owner_id,metadata)
    select bucket_id,object_path,owner_user_id::text,jsonb_build_object('size',size_bytes,'mimetype',mime_type)
    from public.assets where idempotency_key='avatar:owner:00000001'$$,
  'owner can upload only to the prepared private path'
);
select results_eq(
  $$select (public.confirm_asset_upload((select id from public.assets where idempotency_key='avatar:owner:00000001'))).state::text$$,
  $$values ('uploaded'::text)$$,
  'upload confirmation validates storage metadata'
);
select results_eq(
  $$select (public.transition_asset_state((select id from public.assets where idempotency_key='avatar:owner:00000001'),'published'::public.asset_state)).state::text$$,
  $$values ('published'::text)$$,
  'avatar owner can publish an uploaded avatar'
);
select results_eq(
  $$select avatar_asset_id from public.user_profiles where user_id='14000000-0000-4000-8000-000000000001'$$,
  $$select id from public.assets where idempotency_key='avatar:owner:00000001'$$,
  'published avatar is associated to the owner profile by asset id'
);
select is((select count(*)::integer from storage.objects where bucket_id='private-assets'), 1, 'owner can read their private object');
reset role;
select set_config('test.avatar_asset_id',(select id::text from public.assets where idempotency_key='avatar:owner:00000001'),false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"14000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}', true);
select is((select count(*)::integer from public.assets), 0, 'another student cannot read owner asset metadata');
select is((select count(*)::integer from storage.objects where bucket_id='private-assets'), 0, 'another student cannot read object by knowing the private bucket');
select throws_ok(
  $$select public.fail_asset_upload(current_setting('test.avatar_asset_id')::uuid,'FORBIDDEN',false)$$,
  '42501', null, 'another student cannot mutate a known asset id'
);
select throws_ok(
  $$select public.fail_asset_upload('00000000-0000-0000-0000-000000000000','FORBIDDEN',false)$$,
  'P0002', null, 'unknown asset ids are rejected without disclosure'
);
reset role;

select * from finish();
rollback;
