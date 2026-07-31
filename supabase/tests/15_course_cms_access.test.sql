begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users(id,email) values
 ('1b000000-0000-4000-8000-000000000001','cms-access-admin@example.test'),
 ('1b000000-0000-4000-8000-000000000002','cms-access-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='1b000000-0000-4000-8000-000000000001';
insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values
 ('2b000000-0000-4000-8000-000000000001','1b000000-0000-4000-8000-000000000001','1b000000-0000-4000-8000-000000000001','image','published','cover.webp','cover.webp','webp','image/webp',1000,'cms:access:cover1',statement_timestamp(),statement_timestamp()),
 ('2b000000-0000-4000-8000-000000000002','1b000000-0000-4000-8000-000000000001','1b000000-0000-4000-8000-000000000001','image','published','thumb.webp','thumb.webp','webp','image/webp',500,'cms:access:thumb1',statement_timestamp(),statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7b000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.course_id',(select id::text from public.create_course(jsonb_build_object(
 'title','Curso privado CMS','slug','curso-privado-cms','short_description','Curta','description','Descrição',
 'category','Produção','objectives',jsonb_build_array('Objetivo'),'cover_asset_id','2b000000-0000-4000-8000-000000000001',
 'thumbnail_asset_id','2b000000-0000-4000-8000-000000000002','availability_starts_at',statement_timestamp()+interval '1 day'))),false);
select is((select count(*)::integer from public.courses),1,'administrator reads draft for CMS and preview');
select is((select count(*)::integer from public.course_editor_events),1,'administrator reads course audit history');
select throws_ok($$update public.courses set title='bypass' where id=current_setting('test.course_id')::uuid$$,'42501',null,'administrator cannot bypass CMS RPC with direct update');
select set_config('test.published_status',(select status::text from public.publish_course(current_setting('test.course_id')::uuid,1)),false);
select is(current_setting('test.published_status'),'published','administrator publishes course');
select lives_ok($$select public.grant_course_enrollment('1b000000-0000-4000-8000-000000000002',current_setting('test.course_id')::uuid,statement_timestamp()-interval '1 minute',null,'cms access')$$,'administrator grants enrollment');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7b000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),0,'future availability blocks enrolled student');
select is((select count(*)::integer from public.course_editor_events),0,'student cannot read CMS audit history');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,2,'{"availability_starts_at":null}'::jsonb)$$,'42501',null,'student cannot edit course');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7b000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.open_version',(select version::text from public.update_course(current_setting('test.course_id')::uuid,2,'{"availability_starts_at":null}'::jsonb)),false);
select is(current_setting('test.open_version')::integer,3,'administrator opens availability without erasing other fields');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7b000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),1,'active enrollment reads available published course');
select is((select title from public.courses),'Curso privado CMS','student sees persisted title');
select is((select description from public.courses),'Descrição','student sees complete persisted description');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7b000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.unpublished_status',(select status::text from public.unpublish_course(current_setting('test.course_id')::uuid,3)),false);
select is(current_setting('test.unpublished_status'),'draft','administrator unpublishes course');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1b000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7b000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select is((select count(*)::integer from public.courses),0,'unpublished course immediately disappears from student');
reset role;

set local role anon;
select is((select count(*)::integer from public.courses),0,'anonymous role cannot read courses');
select ok(not has_function_privilege('anon','public.create_course(jsonb)','EXECUTE'),'anonymous cannot create course');
select ok(not has_function_privilege('anon','public.publish_course(uuid,integer)','EXECUTE'),'anonymous cannot publish course');
reset role;

select is((select count(*)::integer from public.course_editor_events where event_type='updated'),1,'availability edit is audited once');
select is((select count(*)::integer from public.course_editor_events where event_type='published'),1,'publication is audited once');
select is((select count(*)::integer from public.course_editor_events where event_type='unpublished'),1,'unpublication is audited once');
select ok((select short_description='Curta' and category='Produção' from public.courses where id=current_setting('test.course_id')::uuid),'partial update preserved all omitted content');

select * from finish();
rollback;
