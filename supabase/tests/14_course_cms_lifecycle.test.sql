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
select results_eq($$select status::text from public.courses where id=current_setting('test.course_id')::uuid$$,$$values('draft'::text)$$,'new course starts as draft');
select results_eq($$select description from public.courses where id=current_setting('test.course_id')::uuid$$,$$values('Descrição integral persistida'::text)$$,'complete description is persisted');
select results_eq($$select objectives from public.courses where id=current_setting('test.course_id')::uuid$$,$$values(array['Produzir uma faixa']::text[])$$,'objectives are persisted without fallback');
select is((select count(*)::integer from public.course_editor_events where event_type='created'),1,'creation is audited');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,1,'{}'::jsonb)$$,'22023',null,'empty patch is rejected');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,1,'{"description":""}'::jsonb)$$,'22023',null,'empty string cannot erase description');
select results_eq($$select version from public.update_course(current_setting('test.course_id')::uuid,1,'{"category":"Tecnologia musical","price_amount":249.90}'::jsonb)$$,$$values(2)$$,'partial update increments version');
select results_eq($$select description from public.courses where id=current_setting('test.course_id')::uuid$$,$$values('Descrição integral persistida'::text)$$,'omitted field remains unchanged');
select throws_ok($$select public.update_course(current_setting('test.course_id')::uuid,1,'{"category":"Conflito"}'::jsonb)$$,'40001',null,'stale version is rejected');
select set_config('test.copy_id',(select id::text from public.duplicate_course(current_setting('test.course_id')::uuid,'Curso CMS Cópia','curso-cms-copia')),false);
select results_eq($$select status::text from public.courses where id=current_setting('test.copy_id')::uuid$$,$$values('draft'::text)$$,'duplicate is an independent draft');
select results_eq($$select description from public.courses where id=current_setting('test.copy_id')::uuid$$,$$values('Descrição integral persistida'::text)$$,'duplicate copies all persisted content');
select results_eq($$select duplicated_from_course_id from public.courses where id=current_setting('test.copy_id')::uuid$$,$$values(current_setting('test.course_id')::uuid)$$,'duplicate records source course');
select is((select count(*)::integer from public.modulos where course_id=current_setting('test.copy_id')::uuid),0,'B11 duplication does not invent module copies');
select results_eq($$select status::text from public.publish_course(current_setting('test.course_id')::uuid,2)$$,$$values('published'::text)$$,'complete course can be published');
select ok((select published_at is not null and version=3 from public.courses where id=current_setting('test.course_id')::uuid),'publication records timestamp and version');
select results_eq($$select status::text from public.unpublish_course(current_setting('test.course_id')::uuid,3)$$,$$values('draft'::text)$$,'published course can be unpublished');
select ok((select unpublished_at is not null and version=4 from public.courses where id=current_setting('test.course_id')::uuid),'unpublication is timestamped');
select results_eq($$select status::text from public.archive_course(current_setting('test.course_id')::uuid,4)$$,$$values('archived'::text)$$,'course can be archived');
select ok((select archived_at is not null and version=5 from public.courses where id=current_setting('test.course_id')::uuid),'archive is timestamped');
select results_eq($$select deleted_at is not null from public.delete_course(current_setting('test.copy_id')::uuid,1)$$,$$values(true)$$,'empty duplicate is soft deleted');
select ok((select slug like 'curso-cms-copia-deleted-%' from public.courses where id=current_setting('test.copy_id')::uuid),'soft deletion releases original slug');
insert into public.modulos(course_id,titulo,ordem) values(current_setting('test.course_id')::uuid,'Módulo dependente',1);
select throws_ok($$select public.delete_course(current_setting('test.course_id')::uuid,5)$$,'23503',null,'course with modules requires archive instead of deletion');
select is((select count(*)::integer from public.course_editor_events where course_id=current_setting('test.course_id')::uuid),5,'main course lifecycle is fully audited');
select is((select count(*)::integer from public.course_editor_events where course_id=current_setting('test.copy_id')::uuid),2,'duplicate creation and deletion are audited');
select results_eq($$select affiliate_eligible from public.courses where id=current_setting('test.course_id')::uuid$$,$$values(true)$$,'affiliate eligibility is persisted');
select results_eq($$select certificate_enabled from public.courses where id=current_setting('test.course_id')::uuid$$,$$values(true)$$,'certificate configuration is persisted');
select results_eq($$select completion_required_percent from public.courses where id=current_setting('test.course_id')::uuid$$,$$values(80::smallint)$$,'completion rule is persisted');
select results_eq($$select price_amount from public.courses where id=current_setting('test.course_id')::uuid$$,$$values(249.90::numeric)$$,'updated price remains numeric');
reset role;

select * from finish();
rollback;
