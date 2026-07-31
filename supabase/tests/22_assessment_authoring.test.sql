begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users(id,email) values
 ('1f000000-0000-4000-8000-000000000001','assessment-admin@example.test'),
 ('1f000000-0000-4000-8000-000000000002','assessment-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='1f000000-0000-4000-8000-000000000001';
insert into public.courses(id,title,slug) values
 ('3f000000-0000-4000-8000-000000000001','Curso de avaliações','curso-de-avaliacoes');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1f000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7f000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select throws_ok(
  $$select public.create_assessment('{"course_id":"3f000000-0000-4000-8000-000000000001","title":"Negada"}'::jsonb)$$,
  '42501', null, 'student cannot create assessment'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1f000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7f000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.assessment',(select id::text from public.create_assessment('{"course_id":"3f000000-0000-4000-8000-000000000001","title":"Prova final","passing_score":75,"max_attempts":2,"show_correct_answers":true}'::jsonb)),false);
select is((select version from public.assessments where id=current_setting('test.assessment')::uuid),1,'assessment starts at version one');
select is((select passing_score from public.assessments where id=current_setting('test.assessment')::uuid),75::numeric,'passing score persists');
select throws_ok(
  $$select public.create_assessment_question(current_setting('test.assessment')::uuid,1,'{"question_type":"single_choice","prompt":"Inválida?","options":[{"text":"A","is_correct":true},{"text":"B","is_correct":true}]}'::jsonb)$$,
  '22023', null, 'single choice rejects two correct options'
);
select set_config('test.question1',(select id::text from public.create_assessment_question(current_setting('test.assessment')::uuid,1,'{"question_type":"single_choice","prompt":"Qual alternativa está correta?","explanation":"A primeira alternativa.","points":2,"options":[{"text":"Correta","is_correct":true},{"text":"Incorreta","is_correct":false}]}'::jsonb)),false);
select is((select version from public.assessments where id=current_setting('test.assessment')::uuid),2,'creating question increments assessment version');
select is((select count(*)::integer from public.assessment_options where question_id=current_setting('test.question1')::uuid),2,'question options persist');
select set_config('test.question2',(select id::text from public.create_assessment_question(current_setting('test.assessment')::uuid,2,'{"question_type":"multiple_choice","prompt":"Selecione duas corretas","points":3,"options":[{"text":"A","is_correct":true},{"text":"B","is_correct":true},{"text":"C","is_correct":false}]}'::jsonb)),false);
select is((select version from public.assessments where id=current_setting('test.assessment')::uuid),3,'second question increments assessment version');
select set_config('test.question1_version',(select version::text from public.update_assessment_question(current_setting('test.question1')::uuid,1,'{"prompt":"Qual é a alternativa correta?","options":[{"text":"Nova correta","is_correct":true},{"text":"Nova incorreta","is_correct":false}]}'::jsonb)),false);
select is(current_setting('test.question1_version')::integer,2,'question update increments question version');
select is((select version from public.assessments where id=current_setting('test.assessment')::uuid),4,'question update increments assessment version');
select throws_ok(
  $$select public.update_assessment_question(current_setting('test.question1')::uuid,1,'{"prompt":"Conflito"}'::jsonb)$$,
  '40001', null, 'stale question version is rejected'
);
select set_config('test.assessment_version',(select version::text from public.reorder_assessment_questions(current_setting('test.assessment')::uuid,4,jsonb_build_array(
  jsonb_build_object('id',current_setting('test.question2'),'order',0,'version',1),
  jsonb_build_object('id',current_setting('test.question1'),'order',1,'version',2)
))),false);
select is(current_setting('test.assessment_version')::integer,5,'question reorder increments assessment version');
select is((select prompt from public.assessment_questions where assessment_id=current_setting('test.assessment')::uuid order by ordem limit 1),'Selecione duas corretas','question reorder persists');
select set_config('test.published_version',(select version::text from public.publish_assessment(current_setting('test.assessment')::uuid,5)),false);
select is(current_setting('test.published_version')::integer,6,'publish increments assessment version');
select is((select status::text from public.assessments where id=current_setting('test.assessment')::uuid),'published','assessment is published');
select is((select count(*)::integer from public.assessment_questions where assessment_id=current_setting('test.assessment')::uuid and status='published'),2,'publishing assessment publishes active questions');
select throws_ok(
  $$select public.update_assessment(current_setting('test.assessment')::uuid,6,'{"title":"Não permitido"}'::jsonb)$$,
  '55000', null, 'published assessment cannot be edited'
);
select set_config('test.unpublished_version',(select version::text from public.unpublish_assessment(current_setting('test.assessment')::uuid,6)),false);
select is(current_setting('test.unpublished_version')::integer,7,'unpublish increments assessment version');
select is((select status::text from public.assessment_questions where id=current_setting('test.question1')::uuid),'draft','unpublish returns questions to draft');
select set_config('test.question2_archived',(select version::text from public.archive_assessment_question(current_setting('test.question2')::uuid,4)),false);
select is(current_setting('test.question2_archived')::integer,5,'question archive increments question version');
select is((select public.delete_assessment_question(current_setting('test.question2')::uuid,5)),true,'archived question without attempts is logically deleted');
select ok((select deleted_at is not null from public.assessment_questions where id=current_setting('test.question2')::uuid),'question logical deletion records timestamp');
select is((select count(*)::integer from public.assessment_events where question_id=current_setting('test.question2')::uuid and event_type='question_deleted'),1,'question deletion event is retained');
select set_config('test.archived_version',(select version::text from public.archive_assessment(current_setting('test.assessment')::uuid,9)),false);
select is((select status::text from public.assessments where id=current_setting('test.assessment')::uuid),'archived','assessment archives after question removal');
select is((select public.delete_assessment(current_setting('test.assessment')::uuid,current_setting('test.archived_version')::integer)),true,'archived assessment without attempts is logically deleted');
select ok((select deleted_at is not null from public.assessments where id=current_setting('test.assessment')::uuid),'assessment logical deletion records timestamp');
select is((select count(*)::integer from public.assessment_events where assessment_id=current_setting('test.assessment')::uuid and event_type='deleted'),1,'assessment deletion event is retained');
select ok((select count(*)>=11 from public.assessment_events where assessment_id=current_setting('test.assessment')::uuid),'assessment lifecycle is audited');
select throws_ok($$insert into public.assessments(course_id,title) values('3f000000-0000-4000-8000-000000000001','Bypass')$$,'42501',null,'administrator cannot bypass authoring RPCs');
reset role;

select * from finish();
rollback;
