begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into auth.users(id,email) values
 ('1a000000-0000-4000-8000-000000000001','cms-admin@example.test'),
 ('1a000000-0000-4000-8000-000000000002','cms-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='1a000000-0000-4000-8000-000000000001';

insert into public.assets(id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values
 ('2a000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000001','image','published','cover.webp','cover.webp','webp','image/webp',1000,'cms:cover:00000001',statement_timestamp(),statement_timestamp()),
 ('2a000000-0000-4000-8000-000000000002','1a000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000001','image','published','thumb.webp','thumb.webp','webp','image/webp',500,'cms:thumb:00000001',statement_timestamp(),statement_timestamp());

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1a000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7a000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select throws_ok($$select public.create_course('{"title":"Curso indevido","slug":"curso-indevido"}'::jsonb)$$,'42501',null,'student cannot create course');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7a000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.course_id',(select id::text from public.create_course(jsonb_build_object(
 'title','Curso CMS','slug','curso-cms','short_description','Descrição curta','description','Descrição integral persistida',
 'category','Produção musical','language_code','pt-BR','level','beginner','objectives',jsonb_build_array('Produzir uma faixa'),
 'prerequisites',jsonb_build_array('Computador'),'cover_asset_id','2a000000-0000-4000-8000-000000000001',
 'thumbnail_asset_id','2a000000-0000-4000-8000-000000000002','price_amount',199.90,'currency_code','BRL',
 'promotional_price_amount',149.90,'completion_mode','percentage','completion_required_percent',80,
 'certificate_enabled',true,'certificate_min_completion_percent',80,'release_mode','immediate',
 'affiliate_eligible',true,'preview_enabled',true))),false);
select matches(current_setting('test.course_id'),'^[0-9a-f-]{36}$','admin creates draft course');
select is((select status::text from public.courses where id=current_setting('test.course_id')::uuid),'draft','new course starts as draft');
select is((select description from public.courses where id=current_setting('test.course_id')::uuid),'Descrição integral persistida','complete description is persisted');
select is((select objectives from public.courses where id=current_setting('test.course_id')::uuid),array['Produzir uma faixa']::text[],'objectives are persisted without fallback');
select is((select count(*)::integer from public.course_editor_events where event_type='created'),1,'creation is audited');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,1,'{}'::jsonb)$$,'22023',null,'empty patch is rejected');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,1,'{"description":""}'::jsonb)$$,'22023',null,'empty string cannot erase description');
select set_config('test.updated_version',(select version::text from public.update_course(current_setting('test.course_id')::uuid,1,'{"category":"Tecnologia musical","price_amount":249.90}'::jsonb)),false);
select is(current_setting('test.updated_version')::integer,2,'partial update increments version');
select is((select description from public.courses where id=current_setting('test.course_id')::uuid),'Descrição integral persistida','omitted field remains unchanged');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,1,'{"category":"Conflito"}'::jsonb)$$,'40001',null,'stale version is rejected');
select set_config('test.copy_id',(select id::text from public.duplicate_course(current_setting('test.course_id')::uuid,'Curso CMS Cópia','curso-cms-copia')),false);
select is((select status::text from public.courses where id=current_setting('test.copy_id')::uuid),'draft','duplicate is an independent draft');
select is((select description from public.courses where id=current_setting('test.copy_id')::uuid),'Descrição integral persistida','duplicate copies all persisted content');
select is((select duplicated_from_course_id from public.courses where id=current_setting('test.copy_id')::uuid),current_setting('test.course_id')::uuid,'duplicate records source course');
select is((select count(*)::integer from public.modulos where course_id=current_setting('test.copy_id')::uuid),0,'B11 duplication does not invent module copies');
select set_config('test.publish_module_id',(select id::text from public.create_module(current_setting('test.course_id')::uuid,'{"title":"Módulo publicável","status":"published"}'::jsonb)),false);
select set_config('test.publish_lesson_id',(select id::text from public.create_lesson(current_setting('test.publish_module_id')::uuid,'{"title":"Aula publicável","status":"published","content_kind":"text","text_content":"Conteúdo validado"}'::jsonb)),false);
select set_config('test.published_status',(select status::text from public.publish_course(current_setting('test.course_id')::uuid,2)),false);
select is(current_setting('test.published_status'),'published','complete course can be published');
select ok((select published_at is not null and version=3 from public.courses where id=current_setting('test.course_id')::uuid),'publication records timestamp and version');
select set_config('test.unpublished_status',(select status::text from public.unpublish_course(current_setting('test.course_id')::uuid,3)),false);
select is(current_setting('test.unpublished_status'),'draft','published course can be unpublished');
select ok((select unpublished_at is not null and version=4 from public.courses where id=current_setting('test.course_id')::uuid),'unpublication is timestamped');
select set_config('test.archived_status',(select status::text from public.archive_course(current_setting('test.course_id')::uuid,4)),false);
select is(current_setting('test.archived_status'),'archived','course can be archived');
select ok((select archived_at is not null and version=5 from public.courses where id=current_setting('test.course_id')::uuid),'archive is timestamped');
select set_config('test.copy_deleted',(select jsonb_build_object('deleted',deleted_at is not null,'slug',slug)::text from public.delete_course(current_setting('test.copy_id')::uuid,1)),false);
select is((current_setting('test.copy_deleted')::jsonb->>'deleted')::boolean,true,'empty duplicate is soft deleted');
select like(current_setting('test.copy_deleted')::jsonb->>'slug','curso-cms-copia-deleted-%','soft deletion releases original slug');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7a000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select throws_ok($$select public.delete_course(current_setting('test.course_id')::uuid,5)$$,'23503',null,'course with modules requires archive instead of deletion');
select is((select count(*)::integer from public.course_editor_events where course_id=current_setting('test.course_id')::uuid),5,'main course lifecycle is fully audited');
select is((select count(*)::integer from public.course_editor_events where course_id=current_setting('test.copy_id')::uuid),2,'duplicate creation and deletion are audited');
select is((select affiliate_eligible from public.courses where id=current_setting('test.course_id')::uuid),true,'affiliate eligibility is persisted');
select is((select certificate_enabled from public.courses where id=current_setting('test.course_id')::uuid),true,'certificate configuration is persisted');
select is((select completion_required_percent from public.courses where id=current_setting('test.course_id')::uuid),80::smallint,'completion rule is persisted');
select is((select price_amount from public.courses where id=current_setting('test.course_id')::uuid),249.90::numeric,'updated price remains numeric');
reset role;

select * from finish();
rollback;
