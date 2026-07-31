begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email)
values
  ('15000000-0000-4000-8000-000000000001', 'storage-admin@example.test'),
  ('15000000-0000-4000-8000-000000000002', 'storage-student-one@example.test'),
  ('15000000-0000-4000-8000-000000000003', 'storage-student-two@example.test');
update public.user_roles set role='administrador_proprietario'::public.app_role where user_id='15000000-0000-4000-8000-000000000001';

insert into public.courses (id, title, slug, status)
values ('20000000-0000-4000-8000-000000000005', 'Curso com materiais', 'curso-com-materiais', 'published');
insert into public.modulos (id, course_id, titulo, ordem, status)
values ('25000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'Módulo com materiais', 1, 'published');
insert into public.aulas (id, modulo_id, titulo, ordem, status)
values ('35000000-0000-4000-8000-000000000001', '25000000-0000-4000-8000-000000000001', 'Aula com material privado', 1, 'published');
insert into public.enrollments (id,user_id,course_id,status,source,starts_at,granted_by_user_id)
values ('45000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000005','active','manual_grant',statement_timestamp()-interval '1 minute','15000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
select lives_ok(
  $$select public.prepare_asset_upload('sample'::public.asset_purpose,'samples.zip','application/zip',4096,'lesson:sample:00000001','35000000-0000-4000-8000-000000000001')$$,
  'owner administrator can prepare lesson material'
);
select lives_ok(
  $$insert into storage.objects (bucket_id,name,owner_id,metadata)
    select bucket_id,object_path,owner_user_id::text,jsonb_build_object('size',size_bytes,'mimetype',mime_type)
    from public.assets where idempotency_key='lesson:sample:00000001'$$,
  'administrator uploads lesson material only to prepared path'
);
select results_eq(
  $$select (public.confirm_asset_upload((select id from public.assets where idempotency_key='lesson:sample:00000001'))).state::text$$,
  $$values ('uploaded'::text)$$,
  'lesson material upload is confirmed'
);
select results_eq(
  $$select (public.transition_asset_state((select id from public.assets where idempotency_key='lesson:sample:00000001'),'processing'::public.asset_state)).state::text$$,
  $$values ('processing'::text)$$,
  'administrator can enter processing state'
);
select results_eq(
  $$select (public.transition_asset_state((select id from public.assets where idempotency_key='lesson:sample:00000001'),'published'::public.asset_state)).state::text$$,
  $$values ('published'::text)$$,
  'administrator publishes processed lesson material'
);
select is((select count(*)::integer from storage.objects where bucket_id='private-assets'), 1, 'administrator sees published object');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}', true);
select is((select count(*)::integer from public.assets where lesson_id='35000000-0000-4000-8000-000000000001'), 1, 'active enrollment automatically exposes lesson asset metadata');
select is((select count(*)::integer from storage.objects where bucket_id='private-assets'), 1, 'active enrollment automatically exposes the corresponding object');
select throws_ok(
  $$select public.grant_asset_access('00000000-0000-0000-0000-000000000000','15000000-0000-4000-8000-000000000002',null)$$,
  '42501', null, 'student cannot grant asset access'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
select results_eq(
  $$select (public.grant_asset_access((select id from public.assets where idempotency_key='lesson:sample:00000001'),'15000000-0000-4000-8000-000000000002',null)).user_id$$,
  $$values ('15000000-0000-4000-8000-000000000002'::uuid)$$,
  'administrator can add a separate manual asset grant'
);
select lives_ok(
  $$select public.grant_asset_access((select id from public.assets where idempotency_key='lesson:sample:00000001'),'15000000-0000-4000-8000-000000000002',statement_timestamp()+interval '1 day')$$,
  'manual grant operation is idempotent and refreshes expiry'
);
select is((select count(*)::integer from public.asset_access_grants), 2, 'enrollment and manual grants coexist without duplicates');
select throws_ok(
  $$select public.grant_asset_access((select id from public.assets where idempotency_key='lesson:sample:00000001'),'15000000-0000-4000-8000-000000000002',statement_timestamp()-interval '1 second')$$,
  '22023', null, 'expired grants cannot be created'
);
select throws_ok(
  $$select public.grant_asset_access((select id from public.assets where idempotency_key='lesson:sample:00000001'),'15000000-0000-4000-8000-000000000001',null)$$,
  '42501', null, 'grants can target only student roles'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}', true);
select is((select count(*)::integer from public.assets where lesson_id='35000000-0000-4000-8000-000000000001'), 1, 'student keeps metadata visibility through active enrollment');
select is((select count(*)::integer from storage.objects where bucket_id='private-assets'), 1, 'student keeps object visibility through active enrollment');
select is((select count(*)::integer from public.asset_access_grants), 2, 'student can inspect both of their own grant sources');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}', true);
select is((select count(*)::integer from public.assets), 0, 'different student remains isolated from the enrolled asset');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
select ok(public.revoke_asset_access((select id from public.assets where idempotency_key='lesson:sample:00000001'),'15000000-0000-4000-8000-000000000002'), 'administrator revokes the manual grant');
select ok(not public.revoke_asset_access((select id from public.assets where idempotency_key='lesson:sample:00000001'),'15000000-0000-4000-8000-000000000002'), 'manual revocation is idempotent');
select lives_ok(
  $$select public.suspend_course_enrollment('45000000-0000-4000-8000-000000000001','teste de revogação de acesso')$$,
  'suspending enrollment removes enrollment-sourced grants'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"15000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}', true);
select is((select count(*)::integer from public.assets), 0, 'suspended student immediately loses asset metadata visibility');
select is((select count(*)::integer from storage.objects where bucket_id='private-assets'), 0, 'suspended student immediately loses object visibility');
reset role;

select * from finish();
rollback;
