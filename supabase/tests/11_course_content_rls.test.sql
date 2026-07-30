begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id,email)
values
  ('18000000-0000-4000-8000-000000000001','content-admin@example.test'),
  ('18000000-0000-4000-8000-000000000002','content-active@example.test'),
  ('18000000-0000-4000-8000-000000000003','content-expired@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='18000000-0000-4000-8000-000000000001';

insert into public.courses (id,title,slug,status)
values ('28000000-0000-4000-8000-000000000001','Curso protegido por matrícula','curso-protegido-rls','published');
insert into public.modulos (id,course_id,titulo,ordem)
values ('38000000-0000-4000-8000-000000000001','28000000-0000-4000-8000-000000000001','Módulo protegido por matrícula',1);
insert into public.aulas (id,modulo_id,titulo,ordem)
values ('48000000-0000-4000-8000-000000000001','38000000-0000-4000-8000-000000000001','Aula protegida por matrícula',1);
insert into public.enrollments (id,user_id,course_id,status,source,starts_at,expires_at,granted_by_user_id)
values
  ('58000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000001','active','manual_grant',statement_timestamp()-interval '1 day',statement_timestamp()+interval '30 days','18000000-0000-4000-8000-000000000001'),
  ('58000000-0000-4000-8000-000000000002','18000000-0000-4000-8000-000000000003','28000000-0000-4000-8000-000000000001','active','manual_grant',statement_timestamp()-interval '30 days',statement_timestamp()-interval '1 day','18000000-0000-4000-8000-000000000001');
insert into public.progresso_aulas (id,user_id,aula_id,progresso_percentual)
values ('68000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000003','48000000-0000-4000-8000-000000000001',50);

insert into public.assets (
  id,owner_user_id,created_by_user_id,lesson_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,published_at
) values (
  '78000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','18000000-0000-4000-8000-000000000001','48000000-0000-4000-8000-000000000001','sample','published','samples.zip','samples.zip','zip','application/zip',4096,'content:asset:00000001',statement_timestamp()
);

select ok(private.has_active_course_access('18000000-0000-4000-8000-000000000002','28000000-0000-4000-8000-000000000001'),'active enrollment resolves access');
select ok(not private.has_active_course_access('18000000-0000-4000-8000-000000000003','28000000-0000-4000-8000-000000000001'),'expired enrollment resolves no access');
select is((select count(*)::integer from public.asset_access_grants where enrollment_id='58000000-0000-4000-8000-000000000001'),1,'published asset creates grant for active enrollment');
select is((select count(*)::integer from public.asset_access_grants where enrollment_id='58000000-0000-4000-8000-000000000002'),0,'published asset does not grant expired enrollment');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"18000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"88000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.modulos),1,'active student reads module');
select is((select count(*)::integer from public.aulas),1,'active student reads lesson');
select is((select count(*)::integer from public.assets),1,'active student reads granted lesson asset');
select lives_ok(
  $$insert into public.progresso_aulas(user_id,aula_id,progresso_percentual) values ('18000000-0000-4000-8000-000000000002','48000000-0000-4000-8000-000000000001',10)$$,
  'active student inserts own progress'
);
select lives_ok(
  $$update public.progresso_aulas set progresso_percentual=75 where user_id='18000000-0000-4000-8000-000000000002'$$,
  'active student updates own progress'
);
select is_empty(
  $$update public.progresso_aulas set progresso_percentual=99 where user_id='18000000-0000-4000-8000-000000000003' returning id$$,
  'active student cannot update another student progress'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"18000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"88000000-0000-4000-8000-000000000003","is_anonymous":false}',true);
select is((select count(*)::integer from public.modulos),0,'expired student cannot read modules');
select is((select count(*)::integer from public.aulas),0,'expired student cannot read lessons');
select is((select count(*)::integer from public.assets),0,'expired student cannot read assets');
select throws_ok(
  $$insert into public.progresso_aulas(user_id,aula_id) values ('18000000-0000-4000-8000-000000000003','48000000-0000-4000-8000-000000000001')$$,
  '42501',null,'expired student cannot create progress'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"18000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"88000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select is((select count(*)::integer from public.modulos),1,'administrator reads all modules');
select is((select count(*)::integer from public.progresso_aulas),2,'administrator reads all progress rows');
select lives_ok(
  $$insert into public.modulos(course_id,titulo,ordem) values ('28000000-0000-4000-8000-000000000001','Segundo módulo',2)$$,
  'administrator creates module in course'
);
select results_eq(
  $$select (public.suspend_course_enrollment('58000000-0000-4000-8000-000000000001','manual review')).status::text$$,
  $$values ('suspended'::text)$$,
  'administrator suspends active enrollment'
);
select is((select count(*)::integer from public.asset_access_grants where enrollment_id='58000000-0000-4000-8000-000000000001'),0,'suspension removes enrollment-derived asset grants');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"18000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"88000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.modulos),0,'suspended student loses modules');
select is((select count(*)::integer from public.assets),0,'suspended student loses assets');
select is((select count(*)::integer from public.progresso_aulas),0,'suspended student loses progress visibility');
reset role;

select * from finish();
rollback;
