begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users(id,email) values
 ('20000000-0000-4000-8000-000000000001','attempt-admin@example.test'),
 ('20000000-0000-4000-8000-000000000002','attempt-student@example.test'),
 ('20000000-0000-4000-8000-000000000003','attempt-other@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='20000000-0000-4000-8000-000000000001';
insert into public.courses(id,title,slug,status,published_at)
values('30000000-0000-4000-8000-000000000001','Curso com prova','curso-com-prova','published',statement_timestamp());
insert into public.enrollments(id,user_id,course_id,status,source,starts_at,granted_by_user_id)
values('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','active','manual_grant',statement_timestamp()-interval '1 day','20000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"70000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.assessment',(select id::text from public.create_assessment('{"course_id":"30000000-0000-4000-8000-000000000001","title":"Avaliação objetiva","passing_score":80,"max_attempts":2,"show_correct_answers":true}'::jsonb)),false);
select set_config('test.q1',(select id::text from public.create_assessment_question(current_setting('test.assessment')::uuid,1,'{"question_type":"single_choice","prompt":"Questão simples","points":2,"explanation":"Resposta A","options":[{"text":"A","is_correct":true},{"text":"B","is_correct":false}]}'::jsonb)),false);
select set_config('test.q2',(select id::text from public.create_assessment_question(current_setting('test.assessment')::uuid,2,'{"question_type":"multiple_choice","prompt":"Questão múltipla","points":3,"explanation":"Respostas C e D","options":[{"text":"C","is_correct":true},{"text":"D","is_correct":true},{"text":"E","is_correct":false}]}'::jsonb)),false);
select set_config('test.q1_correct',(select id::text from public.assessment_options where question_id=current_setting('test.q1')::uuid and is_correct order by ordem limit 1),false);
select set_config('test.q2_correct1',(select id::text from public.assessment_options where question_id=current_setting('test.q2')::uuid and is_correct order by ordem limit 1),false);
select set_config('test.q2_correct2',(select id::text from public.assessment_options where question_id=current_setting('test.q2')::uuid and is_correct order by ordem offset 1 limit 1),false);
select lives_ok(format('select public.publish_assessment(%L::uuid,3)',current_setting('test.assessment')),'admin publishes assessment');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"70000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.assessments),1,'student sees available published assessment');
select is((select count(*)::integer from public.assessment_questions),0,'student cannot read authoring questions');
select is((select count(*)::integer from public.assessment_options),0,'student cannot read answer options table');
select set_config('test.attempt1',(select id::text from public.start_assessment_attempt(current_setting('test.assessment')::uuid)),false);
select is((select status::text from public.assessment_attempts where id=current_setting('test.attempt1')::uuid),'in_progress','student starts active attempt');
select ok((select question_snapshot::text !~ 'is_correct|correct_option_ids|explanation' from public.assessment_attempts where id=current_setting('test.attempt1')::uuid),'public attempt snapshot contains no answer key or explanation');
select is((select id::text from public.start_assessment_attempt(current_setting('test.assessment')::uuid)),current_setting('test.attempt1'),'starting again reuses active attempt');
select ok(not (public.get_assessment_attempt_result(current_setting('test.attempt1')::uuid) ? 'answer_review'),'answer key is hidden before grading');
select throws_ok(format('select public.save_assessment_answer(%L::uuid,%L::uuid,array[%L::uuid])',current_setting('test.attempt1'),current_setting('test.q1'),'ffffffff-ffff-4fff-8fff-ffffffffffff'),'22023',null,'foreign option is rejected');
select lives_ok(format('select public.save_assessment_answer(%L::uuid,%L::uuid,array[%L::uuid])',current_setting('test.attempt1'),current_setting('test.q1'),current_setting('test.q1_correct')),'valid single answer is saved');
select throws_ok(format('select public.submit_assessment_attempt(%L::uuid)',current_setting('test.attempt1')),'22023',null,'required unanswered question blocks submission');
select lives_ok(format('select public.save_assessment_answer(%L::uuid,%L::uuid,array[%L::uuid])',current_setting('test.attempt1'),current_setting('test.q2'),current_setting('test.q2_correct1')),'partial multiple-choice answer is accepted for grading');
select set_config('test.attempt1_score',(select score_percent::text from public.submit_assessment_attempt(current_setting('test.attempt1')::uuid)),false);
select is(current_setting('test.attempt1_score')::numeric,40.00::numeric,'partial multiple-choice match receives zero points for that question');
select is((select passed from public.assessment_attempts where id=current_setting('test.attempt1')::uuid),false,'first attempt fails passing criterion');
select ok(public.get_assessment_attempt_result(current_setting('test.attempt1')::uuid) ? 'answer_review','frozen disclosure policy exposes review only after grading');
select set_config('test.attempt2',(select id::text from public.start_assessment_attempt(current_setting('test.assessment')::uuid)),false);
select is((select attempt_number from public.assessment_attempts where id=current_setting('test.attempt2')::uuid),2::smallint,'second attempt receives sequential number');
select is((select id::text from public.start_assessment_attempt(current_setting('test.assessment')::uuid)),current_setting('test.attempt2'),'second active attempt is also idempotent');
select lives_ok(format('select public.save_assessment_answer(%L::uuid,%L::uuid,array[%L::uuid])',current_setting('test.attempt2'),current_setting('test.q1'),current_setting('test.q1_correct')),'second attempt saves first correct answer');
select lives_ok(format('select public.save_assessment_answer(%L::uuid,%L::uuid,array[%L::uuid,%L::uuid])',current_setting('test.attempt2'),current_setting('test.q2'),current_setting('test.q2_correct1'),current_setting('test.q2_correct2')),'second attempt saves exact multiple-choice set');
select set_config('test.attempt2_score',(select score_percent::text from public.submit_assessment_attempt(current_setting('test.attempt2')::uuid)),false);
select is(current_setting('test.attempt2_score')::numeric,100.00::numeric,'exact server-side answer sets score one hundred percent');
select is((select passed from public.assessment_attempts where id=current_setting('test.attempt2')::uuid),true,'second attempt passes criterion');
select throws_ok(format('select public.start_assessment_attempt(%L::uuid)',current_setting('test.assessment')),'22023',null,'third attempt is blocked by maximum attempts');
select throws_ok($$update public.assessment_attempts set score_percent=100 where id=current_setting('test.attempt1')::uuid$$,'42501',null,'student cannot tamper with attempt grading');
select throws_ok($$select count(*) from private.assessment_attempt_keys$$,'42501',null,'student cannot read private answer keys');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"70000000-0000-4000-8000-000000000003","is_anonymous":false}',true);
select throws_ok(format('select public.get_assessment_attempt_result(%L::uuid)',current_setting('test.attempt1')),'42501',null,'another student cannot read attempt result');
reset role;

set local role anon;
select throws_ok(format('select public.start_assessment_attempt(%L::uuid)',current_setting('test.assessment')),'42501',null,'anonymous cannot start attempt');
reset role;

select is((select count(*)::integer from private.assessment_attempt_keys),2,'one immutable private answer key exists per attempt');
select ok((select count(*) >= 8 from public.assessment_events where assessment_id=current_setting('test.assessment')::uuid),'attempt and answer lifecycle is audited');

select * from finish();
rollback;
