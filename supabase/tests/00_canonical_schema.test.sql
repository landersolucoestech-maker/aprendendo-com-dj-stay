begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_table('public', 'modulos', 'modulos exists');
select has_table('public', 'aulas', 'aulas exists');
select has_table('public', 'progresso_aulas', 'progresso_aulas exists');
select has_table('public', 'user_profiles', 'user_profiles exists');
select has_table('public', 'lesson_files', 'lesson_files exists');

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.modulos'::regclass), 'modulos has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.aulas'::regclass), 'aulas has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.progresso_aulas'::regclass), 'progresso_aulas has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.user_profiles'::regclass), 'user_profiles has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.lesson_files'::regclass), 'lesson_files has forced RLS');

select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='progresso_aulas'), 4, 'progress has four owner policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='user_profiles'), 4, 'profiles has four owner policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='modulos' and roles = array['authenticated']::name[]), 1, 'modules read is authenticated only');

select throws_ok($$insert into public.progresso_aulas(user_id,aula_id,progresso_percentual) values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',101)$$, '23514', null, 'progress percentage constraint rejects values above 100');
select has_check('public', 'progresso_aulas', 'progress has check constraints');
select has_check('public', 'aulas', 'lessons have check constraints');
select has_check('public', 'lesson_files', 'lesson files have check constraints');

select is((select prosecdef from pg_proc where oid='public.set_updated_at()'::regprocedure), false, 'updated_at function is invoker security');
select is((select proconfig from pg_proc where oid='public.set_updated_at()'::regprocedure), array['search_path=pg_catalog']::text[], 'updated_at function fixes search_path');
select is((select count(*)::integer from pg_trigger where not tgisinternal and tgfoid='public.set_updated_at()'::regprocedure), 5, 'updated_at trigger is attached to five tables');

select * from finish();
rollback;
