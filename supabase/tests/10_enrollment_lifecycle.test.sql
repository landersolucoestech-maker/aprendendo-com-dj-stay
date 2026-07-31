begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id,email)
values
  ('17000000-0000-4000-8000-000000000001','course-admin@example.test'),
  ('17000000-0000-4000-8000-000000000002','course-student-one@example.test'),
  ('17000000-0000-4000-8000-000000000003','course-student-two@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='17000000-0000-4000-8000-000000000001';

insert into public.courses (id,title,slug,status,access_duration_days)
values ('27000000-0000-4000-8000-000000000001','Curso com matrícula','curso-com-matricula','published',365);
insert into public.modulos (id,course_id,titulo,ordem,status)
values ('37000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001','Módulo matriculado',1,'published');
insert into public.aulas (id,modulo_id,titulo,ordem,status)
values ('47000000-0000-4000-8000-000000000001','37000000-0000-4000-8000-000000000001','Aula matriculada',1,'published');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),0,'student without enrollment cannot read course');
select is((select count(*)::integer from public.modulos),0,'student without enrollment cannot read modules');
select throws_ok(
  $$select public.grant_course_enrollment('17000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001',statement_timestamp(),null,'self grant')$$,
  '42501',null,'student cannot grant their own enrollment'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select results_eq(
  $$select (public.grant_course_enrollment('17000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001',statement_timestamp()-interval '1 minute',null,'manual access')).status::text$$,
  $$values ('active'::text)$$,
  'administrator grants active enrollment'
);
select results_eq(
  $$select source::text from public.enrollments where user_id='17000000-0000-4000-8000-000000000002'$$,
  $$values ('manual_grant'::text)$$,
  'manual enrollment records its trusted source'
);
select is((select count(*)::integer from public.enrollment_events where event_type='created'),1,'manual enrollment creation is audited');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),1,'active student reads enrolled course');
select is((select count(*)::integer from public.modulos),1,'active student reads enrolled module');
select is((select count(*)::integer from public.aulas),1,'active student reads enrolled lesson');
select lives_ok(
  $$insert into public.progresso_aulas(user_id,aula_id,progresso_percentual) values ('17000000-0000-4000-8000-000000000002','47000000-0000-4000-8000-000000000001',25)$$,
  'active student can create progress'
);
select is((select count(*)::integer from public.progresso_aulas),1,'active student reads own progress');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select results_eq(
  $$select (public.suspend_course_enrollment((select id from public.enrollments where user_id='17000000-0000-4000-8000-000000000002'),'chargeback review')).status::text$$,
  $$values ('suspended'::text)$$,
  'administrator suspends enrollment'
);
select is((select count(*)::integer from public.enrollment_events where event_type='suspended'),1,'suspension is audited');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),0,'suspended student immediately loses course access');
select is((select count(*)::integer from public.progresso_aulas),0,'suspended student cannot read prior progress through course policy');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select results_eq(
  $$select (public.renew_course_enrollment((select id from public.enrollments where user_id='17000000-0000-4000-8000-000000000002'),statement_timestamp()+interval '30 days')).status::text$$,
  $$values ('active'::text)$$,
  'administrator renews suspended enrollment'
);
select ok((select expires_at > statement_timestamp()+interval '29 days' from public.enrollments where user_id='17000000-0000-4000-8000-000000000002'),'renewal records future expiry');
select is((select count(*)::integer from public.enrollment_events where event_type='renewed'),1,'renewal is audited');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),1,'renewed student regains course access');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select results_eq(
  $$select (public.revoke_course_enrollment((select id from public.enrollments where user_id='17000000-0000-4000-8000-000000000002'),'refund completed')).status::text$$,
  $$values ('revoked'::text)$$,
  'administrator revokes enrollment'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),0,'revoked student loses course access');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"77000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select throws_ok(
  $$select public.renew_course_enrollment((select id from public.enrollments where user_id='17000000-0000-4000-8000-000000000002'),statement_timestamp()+interval '60 days')$$,
  '22023',null,'revoked enrollment cannot be renewed'
);
reset role;

set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select results_eq(
  $$select (public.confirm_course_purchase('17000000-0000-4000-8000-000000000003','27000000-0000-4000-8000-000000000001','payment_reference_0001',statement_timestamp(),statement_timestamp(),statement_timestamp()+interval '365 days')).status::text$$,
  $$values ('active'::text)$$,
  'trusted backend activates confirmed purchase'
);
select ok(
  (select source='purchase' and payment_confirmed_at is not null from public.enrollments where user_id='17000000-0000-4000-8000-000000000003'),
  'purchase enrollment stores payment confirmation evidence'
);
reset role;

select * from finish();
rollback;
