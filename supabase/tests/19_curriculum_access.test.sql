begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(id,email) values
 ('1e000000-0000-4000-8000-000000000001','access-admin@example.test'),
 ('1e000000-0000-4000-8000-000000000002','access-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='1e000000-0000-4000-8000-000000000001';
insert into public.courses(id,title,slug,status,published_at) values('3e000000-0000-4000-8000-000000000001','Curso publicado','curso-publicado','published',statement_timestamp());
insert into public.enrollments(id,user_id,course_id,status,source,starts_at,granted_by_user_id)
values('4e000000-0000-4000-8000-000000000001','1e000000-0000-4000-8000-000000000002','3e000000-0000-4000-8000-000000000001','active','manual_grant',statement_timestamp()-interval '1 day','1e000000-0000-4000-8000-000000000001');
insert into public.modulos(id,course_id,titulo,ordem,status,release_mode,release_at,obrigatorio,preview_enabled) values
 ('5e000000-0000-4000-8000-000000000001','3e000000-0000-4000-8000-000000000001','Fundamentos',0,'published','immediate',null,true,false),
 ('5e000000-0000-4000-8000-000000000002','3e000000-0000-4000-8000-000000000001','Avançado',1,'published','after_prerequisites',null,true,false),
 ('5e000000-0000-4000-8000-000000000003','3e000000-0000-4000-8000-000000000001','Futuro',2,'published','scheduled',statement_timestamp()+interval '1 day',false,false),
 ('5e000000-0000-4000-8000-000000000004','3e000000-0000-4000-8000-000000000001','Preview futuro',3,'published','scheduled',statement_timestamp()+interval '1 day',false,true);
insert into public.module_prerequisites(module_id,prerequisite_module_id,created_by_user_id)
values('5e000000-0000-4000-8000-000000000002','5e000000-0000-4000-8000-000000000001','1e000000-0000-4000-8000-000000000001');
insert into public.aulas(id,modulo_id,titulo,ordem,status,content_kind,completion_mode,obrigatoria,release_mode,release_at,preview_enabled,availability_ends_at) values
 ('6e000000-0000-4000-8000-000000000001','5e000000-0000-4000-8000-000000000001','Aula inicial',0,'published','video','manual',true,'immediate',null,false,null),
 ('6e000000-0000-4000-8000-000000000002','5e000000-0000-4000-8000-000000000002','Aula avançada',0,'published','text','reading_acknowledgement',true,'after_prerequisites',null,false,null),
 ('6e000000-0000-4000-8000-000000000003','5e000000-0000-4000-8000-000000000001','Aula futura',1,'published','text','manual',false,'scheduled',statement_timestamp()+interval '1 day',false,null),
 ('6e000000-0000-4000-8000-000000000004','5e000000-0000-4000-8000-000000000004','Aula preview',0,'published','text','manual',false,'immediate',null,true,null),
 ('6e000000-0000-4000-8000-000000000005','5e000000-0000-4000-8000-000000000001','Aula encerrada',2,'published','text','manual',false,'immediate',null,true,statement_timestamp()-interval '1 minute');
insert into public.lesson_prerequisites(lesson_id,prerequisite_lesson_id,created_by_user_id)
values('6e000000-0000-4000-8000-000000000002','6e000000-0000-4000-8000-000000000001','1e000000-0000-4000-8000-000000000001');
insert into public.lesson_media(id,lesson_id,provider,external_video_id,is_active,watermark_enabled,created_by_user_id) values
 ('8e000000-0000-4000-8000-000000000001','6e000000-0000-4000-8000-000000000001','youtube','dQw4w9WgXcQ',true,true,'1e000000-0000-4000-8000-000000000001'),
 ('8e000000-0000-4000-8000-000000000003','6e000000-0000-4000-8000-000000000003','youtube','dQw4w9WgXcQ',true,true,'1e000000-0000-4000-8000-000000000001');
insert into public.assets(id,owner_user_id,created_by_user_id,lesson_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values('2e000000-0000-4000-8000-000000000001','1e000000-0000-4000-8000-000000000001','1e000000-0000-4000-8000-000000000001','6e000000-0000-4000-8000-000000000001','document','published','guia.pdf','guia.pdf','pdf','application/pdf',1000,'curriculum:guide:001',statement_timestamp(),statement_timestamp());
insert into public.asset_access_grants(asset_id,user_id,granted_by_user_id,enrollment_id)
values('2e000000-0000-4000-8000-000000000001','1e000000-0000-4000-8000-000000000002','1e000000-0000-4000-8000-000000000001','4e000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1e000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7e000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.modulos),2,'student sees immediate and preview modules before prerequisites');
select ok(exists(select 1 from public.modulos where id='5e000000-0000-4000-8000-000000000004'),'preview bypasses future module schedule');
select ok(not exists(select 1 from public.modulos where id='5e000000-0000-4000-8000-000000000003'),'non-preview future module remains hidden');
select is((select count(*)::integer from public.aulas),2,'student sees available lesson and preview lesson before prerequisites');
select ok(not exists(select 1 from public.aulas where id='6e000000-0000-4000-8000-000000000005'),'expired availability window is never bypassed by preview');
select is((select count(*)::integer from public.lesson_media),1,'student sees media only for available lessons');
select is((select count(*)::integer from public.assets),1,'student sees granted material for available lesson');
select throws_ok($$insert into public.progresso_aulas(user_id,aula_id,completada,progresso_percentual) values('1e000000-0000-4000-8000-000000000002','6e000000-0000-4000-8000-000000000003',true,100)$$,'42501',null,'student cannot record progress for hidden lesson');
select lives_ok($$insert into public.progresso_aulas(user_id,aula_id,completada,progresso_percentual) values('1e000000-0000-4000-8000-000000000002','6e000000-0000-4000-8000-000000000001',true,100)$$,'student records progress for available lesson');
select is((select count(*)::integer from public.modulos),3,'completing required module unlocks dependent module');
select ok(exists(select 1 from public.modulos where id='5e000000-0000-4000-8000-000000000002'),'dependent module becomes visible');
select is((select count(*)::integer from public.aulas),3,'lesson prerequisite unlocks dependent lesson');
select ok(exists(select 1 from public.aulas where id='6e000000-0000-4000-8000-000000000002'),'dependent lesson becomes visible');
select is((select granted from public.request_lesson_playback_token('6e000000-0000-4000-8000-000000000001',repeat('a',64)) limit 1),true,'available lesson receives playback token');
select matches((select token from public.request_lesson_playback_token('6e000000-0000-4000-8000-000000000001',repeat('b',64)) limit 1),'^[a-f0-9]{48}$','playback token remains opaque and short-lived');
select is((select reason from public.request_lesson_playback_token('6e000000-0000-4000-8000-000000000003',repeat('c',64)) limit 1),'LESSON_NOT_AVAILABLE','hidden lesson playback is denied');
select is((select count(*)::integer from public.playback_events where reason='LESSON_NOT_AVAILABLE'),1,'playback denial is audited');
select is((select count(*)::integer from public.curriculum_editor_events),0,'student cannot read curriculum audit events');
select throws_ok($$select public.update_lesson('6e000000-0000-4000-8000-000000000001',1,'{"title":"bypass"}'::jsonb)$$,'42501',null,'student cannot mutate lesson through admin RPC');
reset role;

set local role anon;
select throws_ok($$select count(*) from public.modulos$$,'42501',null,'anonymous cannot read modules');
select throws_ok($$select count(*) from public.aulas$$,'42501',null,'anonymous cannot read lessons');
select ok(not has_function_privilege('anon','public.create_module(uuid,jsonb)','EXECUTE'),'anonymous cannot create module');
select ok(not has_function_privilege('anon','public.create_lesson(uuid,jsonb)','EXECUTE'),'anonymous cannot create lesson');
reset role;

select * from finish();
rollback;
