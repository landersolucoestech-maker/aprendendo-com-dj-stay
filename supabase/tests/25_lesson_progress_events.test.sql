begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users(id,email) values
 ('21000000-0000-4000-8000-000000000000','progress-admin@example.test'),
 ('21000000-0000-4000-8000-000000000001','progress-student@example.test'),
 ('21000000-0000-4000-8000-000000000002','progress-other@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='21000000-0000-4000-8000-000000000000';
update public.user_roles set role='aluno' where user_id in ('21000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002');

insert into public.courses(id,title,slug,status,published_at)
values('31000000-0000-4000-8000-000000000001','Curso de progresso','curso-de-progresso','published',statement_timestamp());
insert into public.modulos(id,course_id,titulo,status)
values('32000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','Módulo de progresso','published');
insert into public.aulas(id,modulo_id,titulo,ordem,status,duracao,completion_mode,completion_percent) values
 ('33000000-0000-4000-8000-000000000001','32000000-0000-4000-8000-000000000001','Aula por mídia',0,'published',2,'media_progress',80),
 ('33000000-0000-4000-8000-000000000002','32000000-0000-4000-8000-000000000001','Aula manual',1,'published',2,'manual',null);
insert into public.enrollments(id,user_id,course_id,status,source,starts_at,granted_by_user_id)
values('41000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','active','manual_grant',statement_timestamp()-interval '1 day','21000000-0000-4000-8000-000000000000');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"51000000-0000-4000-8000-000000000001","is_anonymous":false}',true);

select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001',1,'heartbeat',12,120,statement_timestamp())$$,'first heartbeat is accepted');
select is((select progresso_percentual from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),10,'first heartbeat stores ten percent');
select is((select revision from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),1::bigint,'first heartbeat creates revision one');
select is((select revision from public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001',1,'heartbeat',12,120,statement_timestamp())),1::bigint,'duplicate event id is idempotent');
select is((select count(*)::integer from public.lesson_progress_events where id='61000000-0000-4000-8000-000000000001'),1,'duplicate event is stored once');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',2,'heartbeat',84,120,statement_timestamp())$$,'second heartbeat is accepted');
select is((select progresso_percentual from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),70,'second heartbeat advances progress');
select is((select revision from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),2::bigint,'second heartbeat increments revision');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001',1,'pause',20,120,statement_timestamp())$$,'stale sequence is audited without failing');
select is((select revision from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),2::bigint,'stale sequence does not increment revision');
select is((select accepted from public.lesson_progress_events where id='61000000-0000-4000-8000-000000000003'),false,'stale sequence is marked ignored');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000002',1,'heartbeat',60,120,statement_timestamp())$$,'second tab event is accepted');
select is((select progresso_percentual from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),70,'second tab cannot regress aggregate progress');
select is((select revision from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),3::bigint,'second tab produces next aggregate revision');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000001',3,'heartbeat',96,120,statement_timestamp())$$,'threshold heartbeat is accepted');
select is((select completada from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),true,'media threshold completes lesson server-side');
select is((select progresso_percentual from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),100,'completed lesson is normalized to one hundred percent');
select is((select revision from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),4::bigint,'completion creates revision four');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000006','71000000-0000-4000-8000-000000000001',2,'pause',50,120,statement_timestamp())$$,'late second event is audited');
select is((select revision from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000001'),4::bigint,'late event cannot overwrite completed aggregate');
select is((select last_event_sequence from public.lesson_progress_streams where client_instance_id='71000000-0000-4000-8000-000000000001'),3::bigint,'first tab keeps highest sequence');
select is((select last_event_sequence from public.lesson_progress_streams where client_instance_id='71000000-0000-4000-8000-000000000002'),1::bigint,'second tab has independent sequence');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001',1,'heartbeat',120,120,statement_timestamp())$$,'manual lesson heartbeat is accepted');
select is((select completada from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000002'),false,'manual lesson is not auto-completed');
select is((select progresso_percentual from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000002'),100,'manual lesson may record full media progress');
select lives_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000002','62000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000001',2,'manual_complete',120,120,statement_timestamp())$$,'manual completion event is accepted');
select is((select completada from public.progresso_aulas where aula_id='33000000-0000-4000-8000-000000000002'),true,'manual completion completes manual lesson');
select throws_ok($$update public.progresso_aulas set progresso_percentual=0 where aula_id='33000000-0000-4000-8000-000000000001'$$,'42501',null,'student cannot update aggregate directly');
select throws_ok($$insert into public.lesson_progress_events(id,user_id,aula_id,client_instance_id,auth_session_id,event_sequence,event_type,position_seconds,calculated_progress_percent,resulting_completed,accepted,resulting_revision,observed_at) values(gen_random_uuid(),'21000000-0000-4000-8000-000000000001','33000000-0000-4000-8000-000000000001',gen_random_uuid(),'51000000-0000-4000-8000-000000000001',99,'heartbeat',1,1,false,true,1,statement_timestamp())$$,'42501',null,'student cannot forge progress events');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"21000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"51000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select throws_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001',gen_random_uuid(),gen_random_uuid(),1,'heartbeat',10,120,statement_timestamp())$$,'42501',null,'student without enrollment cannot save progress');
select is((select count(*)::integer from public.lesson_progress_events),0,'student sees no other users progress events');
reset role;

set local role anon;
select throws_ok($$select public.save_lesson_progress_event('33000000-0000-4000-8000-000000000001',gen_random_uuid(),gen_random_uuid(),1,'heartbeat',10,120,statement_timestamp())$$,'42501',null,'anonymous cannot execute progress RPC');
reset role;

select is((select count(*)::integer from public.lesson_progress_events),8,'all accepted and ignored events are audited');
select * from finish();
rollback;
