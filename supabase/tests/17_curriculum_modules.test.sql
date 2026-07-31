begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(id,email) values
 ('1c000000-0000-4000-8000-000000000001','curriculum-admin@example.test'),
 ('1c000000-0000-4000-8000-000000000002','curriculum-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='1c000000-0000-4000-8000-000000000001';
insert into public.courses(id,title,slug) values('3c000000-0000-4000-8000-000000000001','Curso curricular','curso-curricular');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1c000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7c000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select throws_ok($$select public.create_module('3c000000-0000-4000-8000-000000000001','{"title":"Negado"}'::jsonb)$$,'42501',null,'student cannot create module');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1c000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7c000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.module1',(select id::text from public.create_module('3c000000-0000-4000-8000-000000000001','{"title":"Fundamentos","description":"Base","status":"published","required":true}'::jsonb)),false);
select set_config('test.module2',(select id::text from public.create_module('3c000000-0000-4000-8000-000000000001','{"title":"Prática","status":"published","release_mode":"after_prerequisites"}'::jsonb)),false);
select set_config('test.module3',(select id::text from public.create_module('3c000000-0000-4000-8000-000000000001','{"title":"Entrega","preview_enabled":true}'::jsonb)),false);
select is((select count(*)::integer from public.modulos where course_id='3c000000-0000-4000-8000-000000000001'),3,'admin creates three modules');
select is((select array_agg(ordem order by ordem) from public.modulos where course_id='3c000000-0000-4000-8000-000000000001'),array[0,1,2]::integer[],'creation appends contiguous order');
select is((select status::text from public.modulos where id=current_setting('test.module1')::uuid),'published','module status is persisted');
select is((select preview_enabled from public.modulos where id=current_setting('test.module3')::uuid),true,'module preview is persisted');
select set_config('test.module1_version',(select version::text from public.update_module(current_setting('test.module1')::uuid,1,'{"title":"Fundamentos atualizados","required":false}'::jsonb)),false);
select is(current_setting('test.module1_version')::integer,2,'module update increments version');
select is((select descricao from public.modulos where id=current_setting('test.module1')::uuid),'Base','omitted module description is preserved');
select throws_ok($$select public.update_module(current_setting('test.module1')::uuid,1,'{"title":"Conflito"}'::jsonb)$$,'40001',null,'stale module version is rejected');
select throws_ok($$select public.update_module(current_setting('test.module1')::uuid,2,'{"title":""}'::jsonb)$$,'22023',null,'empty module title is rejected');
select set_config('test.module2_version',(select version::text from public.set_module_prerequisites(current_setting('test.module2')::uuid,1,array[current_setting('test.module1')::uuid])),false);
select is(current_setting('test.module2_version')::integer,2,'module prerequisite update increments version');
select is((select count(*)::integer from public.module_prerequisites where module_id=current_setting('test.module2')::uuid),1,'module prerequisite is persisted');
select throws_ok($$select public.set_module_prerequisites(current_setting('test.module1')::uuid,2,array[current_setting('test.module1')::uuid])$$,'22023',null,'module cannot require itself');
select throws_ok($$select public.set_module_prerequisites(current_setting('test.module1')::uuid,2,array[current_setting('test.module2')::uuid])$$,'23514',null,'module prerequisite cycle is rejected');
select set_config('test.course_version',(select version::text from public.reorder_modules('3c000000-0000-4000-8000-000000000001',1,jsonb_build_array(
 jsonb_build_object('id',current_setting('test.module3'),'order',0,'version',1),
 jsonb_build_object('id',current_setting('test.module2'),'order',1,'version',2),
 jsonb_build_object('id',current_setting('test.module1'),'order',2,'version',2)
))),false);
select is(current_setting('test.course_version')::integer,2,'module reorder increments course version');
select is((select titulo from public.modulos where course_id='3c000000-0000-4000-8000-000000000001' order by ordem limit 1),'Entrega','module reorder is persisted atomically');
select throws_ok($$select public.reorder_modules('3c000000-0000-4000-8000-000000000001',1,'[]'::jsonb)$$,'40001',null,'stale course version blocks module reorder');
select set_config('test.copy',(select id::text from public.duplicate_module(current_setting('test.module1')::uuid,'Fundamentos cópia')),false);
select ok((select status='draft' and duplicated_from_module_id=current_setting('test.module1')::uuid from public.modulos where id=current_setting('test.copy')::uuid),'module duplicate is an independent draft with source reference');
select set_config('test.copy_version',(select version::text from public.archive_module(current_setting('test.copy')::uuid,1)),false);
select is(current_setting('test.copy_version')::integer,2,'module archive increments version');
select is((select archived_at is not null from public.modulos where id=current_setting('test.copy')::uuid),true,'module archive records timestamp');
select is((select public.delete_module(current_setting('test.copy')::uuid,2)),true,'empty archived module can be deleted');
select set_config('test.module1_archived',(select version::text from public.archive_module(current_setting('test.module1')::uuid,3)),false);
select throws_ok($$select public.delete_module(current_setting('test.module1')::uuid,current_setting('test.module1_archived')::integer)$$,'23503',null,'module with reverse prerequisite cannot be deleted');
select throws_ok($$update public.modulos set titulo='bypass' where id=current_setting('test.module2')::uuid$$,'42501',null,'administrator cannot bypass module RPCs');
select ok((select count(*)>=9 from public.curriculum_editor_events where course_id='3c000000-0000-4000-8000-000000000001'),'module lifecycle is audited');
reset role;

select * from finish();
rollback;
