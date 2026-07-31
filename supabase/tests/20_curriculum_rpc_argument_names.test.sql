begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is((select proargnames[1:pronargs] from pg_proc where oid='public.create_lesson(uuid,jsonb)'::regprocedure),array['p_module_id','p_payload']::text[],'create_lesson exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.update_lesson(uuid,integer,jsonb)'::regprocedure),array['p_lesson_id','p_expected_version','p_payload']::text[],'update_lesson exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.set_lesson_prerequisites(uuid,integer,uuid[])'::regprocedure),array['p_lesson_id','p_expected_version','p_prerequisite_ids']::text[],'set_lesson_prerequisites exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.reorder_lessons(uuid,integer,jsonb)'::regprocedure),array['p_module_id','p_expected_module_version','p_items']::text[],'reorder_lessons exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.move_lesson(uuid,integer,uuid,integer,integer)'::regprocedure),array['p_lesson_id','p_expected_lesson_version','p_target_module_id','p_expected_source_module_version','p_expected_target_module_version']::text[],'move_lesson exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.duplicate_lesson(uuid,text)'::regprocedure),array['p_lesson_id','p_title']::text[],'duplicate_lesson exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.archive_lesson(uuid,integer)'::regprocedure),array['p_lesson_id','p_expected_version']::text[],'archive_lesson exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.delete_lesson(uuid,integer)'::regprocedure),array['p_lesson_id','p_expected_version']::text[],'delete_lesson exposes stable argument names');
select is((select proargnames[1:pronargs] from pg_proc where oid='public.archive_lesson_material(uuid,uuid)'::regprocedure),array['p_asset_id','p_lesson_id']::text[],'archive_lesson_material exposes stable argument names');

select * from finish();
rollback;
