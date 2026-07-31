begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

create temporary table b21_fixture (
  admin_id uuid not null,
  student_id uuid not null,
  course_id uuid not null,
  enrollment_id uuid not null,
  first_certificate_id uuid,
  first_code text,
  second_certificate_id uuid,
  second_code text
) on commit drop;

insert into b21_fixture(admin_id,student_id,course_id,enrollment_id)
values (
  'b2100000-0000-4000-8000-000000000001',
  'b2100000-0000-4000-8000-000000000002',
  'b2100000-0000-4000-8000-000000000003',
  'b2100000-0000-4000-8000-000000000004'
);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',admin_id,'authenticated','authenticated','admin-b21@example.test','',now(),'{}','{"full_name":"Administrador B21"}',now(),now()
from b21_fixture
union all
select '00000000-0000-0000-0000-000000000000',student_id,'authenticated','authenticated','aluno-b21@example.test','',now(),'{}','{"full_name":"Aluno Certificado"}',now(),now()
from b21_fixture;

update public.user_roles
set role='administrador_proprietario'::public.app_role
where user_id=(select admin_id from b21_fixture);

insert into public.courses(
  id,title,slug,completion_mode,certificate_enabled,certificate_min_completion_percent,created_by_user_id,updated_by_user_id
)
select course_id,'Curso de Certificação B21','curso-certificacao-b21','manual',true,100,admin_id,admin_id
from b21_fixture;

insert into public.enrollments(id,user_id,course_id,status,source,granted_by_user_id)
select enrollment_id,student_id,course_id,'active','manual_grant',admin_id
from b21_fixture;

select set_config('request.jwt.claims', jsonb_build_object('sub',(select student_id from b21_fixture),'role','authenticated')::text, true);
select throws_ok(
  format('select public.issue_enrollment_certificate(%L::uuid)',(select enrollment_id from b21_fixture)),
  '42501',null,'student cannot issue certificate'
);

select set_config('request.jwt.claims', jsonb_build_object('sub',(select admin_id from b21_fixture),'role','authenticated')::text, true);
select lives_ok(
  format('select public.issue_enrollment_certificate(%L::uuid)',(select enrollment_id from b21_fixture)),
  'administrator issues eligible certificate'
);

update b21_fixture fixture
set first_certificate_id=certificate_record.id,
    first_code=certificate_record.code
from public.certificates certificate_record
where certificate_record.enrollment_id=fixture.enrollment_id
  and certificate_record.status='issued';

select is((select count(*)::integer from public.certificates),1,'one certificate is issued');
select matches((select first_code from b21_fixture),'^DJSTAY-[A-F0-9]{20}$','certificate code follows public format');
select is((select status::text from public.certificates where id=(select first_certificate_id from b21_fixture)),'issued','certificate starts issued');
select is((select student_name_snapshot from public.certificates where id=(select first_certificate_id from b21_fixture)),'Aluno Certificado','student name is snapshotted');
select is((select course_title_snapshot from public.certificates where id=(select first_certificate_id from b21_fixture)),'Curso de Certificação B21','course title is snapshotted');
select is((select completion_percent_snapshot::integer from public.certificates where id=(select first_certificate_id from b21_fixture)),0,'manual completion certificate preserves measured percentage');
select is((select count(*)::integer from public.certificate_events where certificate_id=(select first_certificate_id from b21_fixture) and event_type='issued'),1,'issuance event is recorded');
select is((public.validate_certificate((select first_code from b21_fixture))->>'found')::boolean,true,'public validation finds certificate');
select is((public.validate_certificate((select first_code from b21_fixture))->>'valid')::boolean,true,'issued certificate validates as valid');
select is(public.validate_certificate((select first_code from b21_fixture))->>'student_name','Aluno Certificado','public validation returns snapshot name');

select set_config('request.jwt.claims', jsonb_build_object('sub',(select student_id from b21_fixture),'role','authenticated')::text, true);
select is(jsonb_array_length(public.get_my_certificates()),1,'student sees own certificate');

select set_config('request.jwt.claims', jsonb_build_object('sub',(select admin_id from b21_fixture),'role','authenticated')::text, true);
select is(jsonb_array_length(public.get_students_admin_dashboard(null,100,0)->'students'),1,'admin dashboard lists student');
select is(jsonb_array_length(public.get_students_admin_dashboard(null,100,0)->'enrollments'),1,'admin dashboard lists enrollment');
select throws_ok(
  format('select public.issue_enrollment_certificate(%L::uuid)',(select enrollment_id from b21_fixture)),
  '23505',null,'duplicate issued certificate is rejected'
);

select set_config('request.jwt.claims', jsonb_build_object('sub',(select student_id from b21_fixture),'role','authenticated')::text, true);
select throws_ok(
  format('select public.revoke_enrollment_certificate(%L::uuid,%L)',(select first_certificate_id from b21_fixture),'Revogação pelo aluno'),
  '42501',null,'student cannot revoke certificate'
);

select set_config('request.jwt.claims', jsonb_build_object('sub',(select admin_id from b21_fixture),'role','authenticated')::text, true);
select throws_ok(
  format('select public.revoke_enrollment_certificate(%L::uuid,%L)',(select first_certificate_id from b21_fixture),'x'),
  '22023',null,'short revocation reason is rejected'
);
select lives_ok(
  format('select public.revoke_enrollment_certificate(%L::uuid,%L)',(select first_certificate_id from b21_fixture),'Revogação administrativa comprovada'),
  'administrator revokes certificate'
);
select is((select status::text from public.certificates where id=(select first_certificate_id from b21_fixture)),'revoked','certificate status becomes revoked');
select ok((select revoked_at is not null from public.certificates where id=(select first_certificate_id from b21_fixture)),'revocation timestamp is stored');
select is((select revocation_reason from public.certificates where id=(select first_certificate_id from b21_fixture)),'Revogação administrativa comprovada','revocation reason is preserved');
select is((select count(*)::integer from public.certificate_events where certificate_id=(select first_certificate_id from b21_fixture)),2,'revocation appends audit event');
select is((public.validate_certificate((select first_code from b21_fixture))->>'valid')::boolean,false,'revoked certificate is publicly invalid');
select is(public.validate_certificate((select first_code from b21_fixture))->>'status','revoked','public validation exposes revoked state');
select lives_ok(
  format('select public.revoke_enrollment_certificate(%L::uuid,%L)',(select first_certificate_id from b21_fixture),'Repetição idempotente'),
  'repeated revocation is idempotent'
);
select is((select count(*)::integer from public.certificate_events where certificate_id=(select first_certificate_id from b21_fixture)),2,'idempotent revocation does not duplicate event');

select lives_ok(
  format('select public.issue_enrollment_certificate(%L::uuid)',(select enrollment_id from b21_fixture)),
  'administrator can reissue after revocation'
);
update b21_fixture fixture
set second_certificate_id=certificate_record.id,
    second_code=certificate_record.code
from public.certificates certificate_record
where certificate_record.enrollment_id=fixture.enrollment_id
  and certificate_record.status='issued';
select is((select count(*)::integer from public.certificates),2,'reissue preserves revoked history');
select is((select count(*)::integer from public.certificates where status='issued'),1,'only one issued certificate remains active');
select is((public.validate_certificate((select first_code from b21_fixture))->>'valid')::boolean,false,'old revoked code remains invalid');
select is((public.validate_certificate((select second_code from b21_fixture))->>'valid')::boolean,true,'new certificate code validates');
select throws_ok(
  format('update public.certificates set course_title_snapshot=%L where id=%L::uuid','Título adulterado',(select second_certificate_id from b21_fixture)),
  'P0001','CERTIFICATE_IDENTITY_IMMUTABLE','certificate snapshot identity cannot be altered'
);
select is((public.validate_certificate('DJSTAY-00000000000000000000')->>'found')::boolean,false,'unknown certificate code is not found');

select * from finish();
rollback;
