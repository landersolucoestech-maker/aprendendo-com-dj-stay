begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users(id,email) values
 ('1d000000-0000-4000-8000-000000000001','lesson-admin@example.test'),
 ('1d000000-0000-4000-8000-000000000002','lesson-student@example.test');
update public.user_roles set role='administrador_proprietario' where user_id='1d000000-0000-4000-8000-000000000001';
insert into public.courses(id,title,slug) values('3d000000-0000-4000-8000-000000000001','Curso de aulas','curso-de-aulas');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1d000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7d000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.module1',(select id::text from public.create_module('3d000000-0000-4000-8000-000000000001','{"title":"Módulo A","status":"published"}'::jsonb)),false);
select set_config('test.module2',(select id::text from public.create_module('3d000000-0000-4000-8000-000000000001','{"title":"Módulo B","status":"published"}'::jsonb)),false);
select set_config('test.lesson1',(select id::text from public.create_lesson(current_setting('test.module1')::uuid,'{"title":"Texto inicial","description":"Descrição","text_content":"Conteúdo persistido","status":"published","content_kind":"text","completion_mode":"reading_acknowledgement"}'::jsonb)),false);
select set_config('test.lesson2',(select id::text from public.create_lesson(current_setting('test.module1')::uuid,'{"title":"Vídeo inicial","status":"published","content_kind":"video","completion_mode":"media_progress","completion_percent":80}'::jsonb)),false);
select is((select count(*)::integer from public.aulas where modulo_id=current_setting('test.module1')::uuid),2,'admin creates lessons in module');
select is((select array_agg(ordem order by ordem) from public.aulas where modulo_id=current_setting('test.module1')::uuid),array[0,1]::integer[],'lesson creation appends contiguous order');
select is((select conteudo_texto from public.aulas where id=current_setting('test.lesson1')::uuid),'Conteúdo persistido','lesson text is persisted');
select is((select completion_percent from public.aulas where id=current_setting('test.lesson2')::uuid),80::smallint,'media completion threshold is persisted');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1d000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"7d000000-0000-4000-8000-000000000002","is_anonymous":false}',true);
select throws_ok($$select public.create_lesson(current_setting('test.module1')::uuid,'{"title":"Negada"}'::jsonb)$$,'42501',null,'student cannot create lesson');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1d000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7d000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.lesson1_version',(select version::text from public.update_lesson(current_setting('test.lesson1')::uuid,1,'{"title":"Texto atualizado","duration":15,"text_content":"Conteúdo atualizado"}'::jsonb)),false);
select is(current_setting('test.lesson1_version')::integer,2,'lesson update increments version');
select is((select descricao from public.aulas where id=current_setting('test.lesson1')::uuid),'Descrição','omitted lesson description is preserved');
select throws_ok($$select public.update_lesson(current_setting('test.lesson1')::uuid,1,'{"title":"Conflito"}'::jsonb)$$,'40001',null,'stale lesson version is rejected');
select throws_ok($$select public.update_lesson(current_setting('test.lesson1')::uuid,2,'{"text_content":""}'::jsonb)$$,'22023',null,'empty text content is rejected');
select set_config('test.lesson2_version',(select version::text from public.set_lesson_prerequisites(current_setting('test.lesson2')::uuid,1,array[current_setting('test.lesson1')::uuid])),false);
select is(current_setting('test.lesson2_version')::integer,2,'lesson prerequisite update increments version');
select is((select count(*)::integer from public.lesson_prerequisites where lesson_id=current_setting('test.lesson2')::uuid),1,'lesson prerequisite is persisted');
select throws_ok($$select public.set_lesson_prerequisites(current_setting('test.lesson1')::uuid,2,array[current_setting('test.lesson1')::uuid])$$,'22023',null,'lesson cannot require itself');
select throws_ok($$select public.set_lesson_prerequisites(current_setting('test.lesson1')::uuid,2,array[current_setting('test.lesson2')::uuid])$$,'23514',null,'lesson prerequisite cycle is rejected');
select set_config('test.module1_version',(select version::text from public.reorder_lessons(current_setting('test.module1')::uuid,1,jsonb_build_array(
 jsonb_build_object('id',current_setting('test.lesson2'),'order',0,'version',2),
 jsonb_build_object('id',current_setting('test.lesson1'),'order',1,'version',2)
))),false);
select is(current_setting('test.module1_version')::integer,2,'lesson reorder increments module version');
select is((select titulo from public.aulas where modulo_id=current_setting('test.module1')::uuid order by ordem limit 1),'Vídeo inicial','lesson reorder is persisted atomically');
select set_config('test.copy',(select id::text from public.duplicate_lesson(current_setting('test.lesson1')::uuid,'Texto cópia')),false);
select ok((select status='draft' and duplicated_from_lesson_id=current_setting('test.lesson1')::uuid and audio_asset_id is null from public.aulas where id=current_setting('test.copy')::uuid),'lesson duplicate copies metadata without assets');
select lives_ok($$select public.upsert_external_lesson_media(current_setting('test.lesson1')::uuid,'youtube','https://youtu.be/dQw4w9WgXcQ',true)$$,'external lesson media uses normalized B10 flow');
select is((select provider::text from public.lesson_media where lesson_id=current_setting('test.lesson1')::uuid),'youtube','external media provider is persisted');
reset role;

insert into public.assets(id,owner_user_id,created_by_user_id,lesson_id,purpose,state,original_name,normalized_name,extension,mime_type,size_bytes,idempotency_key,uploaded_at,published_at)
values
 ('2d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000001',current_setting('test.lesson2')::uuid,'audio','published','audio.mp3','audio.mp3','mp3','audio/mpeg',2000,'lesson:audio:00000001',statement_timestamp(),statement_timestamp()),
 ('2d000000-0000-4000-8000-000000000002','1d000000-0000-4000-8000-000000000001','1d000000-0000-4000-8000-000000000001',current_setting('test.lesson2')::uuid,'document','published','material.pdf','material.pdf','pdf','application/pdf',3000,'lesson:material:00001',statement_timestamp(),statement_timestamp());
insert into public.asset_access_grants(asset_id,user_id,granted_by_user_id) values('2d000000-0000-4000-8000-000000000002','1d000000-0000-4000-8000-000000000002','1d000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"1d000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"7d000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('test.lesson2_audio_version',(select version::text from public.update_lesson(current_setting('test.lesson2')::uuid,3,jsonb_build_object('audio_asset_id','2d000000-0000-4000-8000-000000000001','content_kind','mixed','completion_mode','media_progress','completion_percent',80))),false);
select is(current_setting('test.lesson2_audio_version')::integer,4,'audio association increments lesson version');
select is((select audio_asset_id from public.aulas where id=current_setting('test.lesson2')::uuid),'2d000000-0000-4000-8000-000000000001'::uuid,'published scoped audio is associated');
select lives_ok($$select public.archive_lesson_material('2d000000-0000-4000-8000-000000000002',current_setting('test.lesson2')::uuid)$$,'lesson material is archived through RPC');
select ok((select deleted_at is not null from public.assets where id='2d000000-0000-4000-8000-000000000002'),'material is soft deleted');
select is((select count(*)::integer from public.asset_access_grants where asset_id='2d000000-0000-4000-8000-000000000002'),0,'material grants are revoked');
select set_config('test.moved_copy',(select version::text from public.move_lesson(current_setting('test.copy')::uuid,1,current_setting('test.module2')::uuid,2,1)),false);
select is(current_setting('test.moved_copy')::integer,2,'lesson move increments lesson version');
select is((select modulo_id from public.aulas where id=current_setting('test.copy')::uuid),current_setting('test.module2')::uuid,'lesson is moved to target module');
select set_config('test.copy_archived',(select version::text from public.archive_lesson(current_setting('test.copy')::uuid,2)),false);
select is(current_setting('test.copy_archived')::integer,3,'lesson archive increments version');
select is((select public.delete_lesson(current_setting('test.copy')::uuid,3)),true,'empty archived lesson can be deleted');
select set_config('test.lesson1_archived',(select version::text from public.archive_lesson(current_setting('test.lesson1')::uuid,3)),false);
select is((select is_active from public.lesson_media where lesson_id=current_setting('test.lesson1')::uuid),false,'archiving lesson disables media');
select throws_ok($$select public.delete_lesson(current_setting('test.lesson1')::uuid,current_setting('test.lesson1_archived')::integer)$$,'23503',null,'lesson with media or reverse prerequisite cannot be deleted');
select throws_ok($$update public.aulas set titulo='bypass' where id=current_setting('test.lesson2')::uuid$$,'42501',null,'administrator cannot bypass lesson RPCs');
select ok((select count(*)>=12 from public.curriculum_editor_events where course_id='3d000000-0000-4000-8000-000000000001'),'lesson lifecycle is audited');
reset role;

select * from finish();
rollback;
