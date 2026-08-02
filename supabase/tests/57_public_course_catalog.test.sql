begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_function('private','get_public_course_catalog','private public catalog reader exists');
select has_function('public','get_public_course_catalog','public catalog RPC exists');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_public_course_catalog'),'private catalog reader is security definer');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_public_course_catalog'),'public catalog wrapper is security invoker');
select is((select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='get_public_course_catalog'),'s','private catalog reader is stable');
select is((select p.provolatile::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_public_course_catalog'),'s','public catalog wrapper is stable');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='private' and grantee='anon' and routine_name='get_public_course_catalog'),1,'anonymous can execute the private catalog reader only through an explicit grant');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='anon' and routine_name='get_public_course_catalog'),1,'anonymous can execute the public catalog RPC');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='authenticated' and routine_name='get_public_course_catalog'),1,'authenticated users can execute the public catalog RPC');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('courses','modulos','aulas') and grantee='anon'),0,'anonymous receives no direct learning table grants');

insert into public.courses (
  id,title,slug,status,short_description,description,category,language_code,level,
  objectives,prerequisites,price_amount,currency_code,promotional_price_amount,
  promotion_starts_at,promotion_ends_at,availability_starts_at,availability_ends_at,
  release_mode,published_at
) values
(
  '00000000-0000-4000-8000-000000000881','Curso público','curso-publico','published',
  'Descrição curta persistida.','Descrição completa persistida.','Produção musical','pt-BR','beginner',
  array['Criar uma produção completa'],array['Computador com acesso à internet'],297.00,'BRL',199.00,
  statement_timestamp()-interval '1 day',statement_timestamp()+interval '1 day',null,null,
  'immediate',statement_timestamp()
),
(
  '00000000-0000-4000-8000-000000000882','Curso em rascunho','curso-rascunho','draft',
  'Não deve aparecer.','Não deve aparecer.','Teste','pt-BR','all_levels',
  array['Não aparecer'],array[]::text[],100.00,'BRL',null,null,null,null,null,
  'immediate',null
),
(
  '00000000-0000-4000-8000-000000000883','Curso futuro','curso-futuro','published',
  'Ainda indisponível.','Ainda indisponível.','Teste','pt-BR','all_levels',
  array['Não aparecer ainda'],array[]::text[],150.00,'BRL',null,null,null,
  statement_timestamp()+interval '1 day',null,'immediate',statement_timestamp()
);

insert into public.modulos (
  id,course_id,titulo,descricao,ordem,status,preview_enabled
) values
(
  '00000000-0000-4000-8000-000000000891','00000000-0000-4000-8000-000000000881',
  'Fundamentos','Conteúdo publicado do módulo.',0,'published',true
),
(
  '00000000-0000-4000-8000-000000000892','00000000-0000-4000-8000-000000000881',
  'Rascunho interno','Não deve aparecer.',1,'draft',false
);

insert into public.aulas (
  id,modulo_id,titulo,descricao,ordem,duracao,status,content_kind,
  completion_mode,preview_enabled
) values
(
  '00000000-0000-4000-8000-0000000008a1','00000000-0000-4000-8000-000000000891',
  'Aula um','Publicada.',0,45,'published','video','manual',true
),
(
  '00000000-0000-4000-8000-0000000008a2','00000000-0000-4000-8000-000000000891',
  'Aula dois','Publicada.',1,30,'published','video','manual',false
),
(
  '00000000-0000-4000-8000-0000000008a3','00000000-0000-4000-8000-000000000891',
  'Aula interna','Rascunho.',2,90,'draft','video','manual',true
);

set local role anon;
select is(jsonb_array_length(public.get_public_course_catalog()->'courses'),1,'catalog exposes only currently visible published courses');
select is(public.get_public_course_catalog() #>> '{courses,0,slug}','curso-publico','catalog returns the persisted slug');
select is(public.get_public_course_catalog() #>> '{courses,0,title}','Curso público','catalog returns the persisted title');
select is((public.get_public_course_catalog() #>> '{courses,0,effective_price_amount}')::numeric,199.00::numeric,'active promotion defines the effective price');
select is((public.get_public_course_catalog() #>> '{courses,0,promotion_active}')::boolean,true,'active promotion is explicit');
select is((public.get_public_course_catalog() #>> '{courses,0,module_count}')::integer,1,'draft modules are excluded');
select is((public.get_public_course_catalog() #>> '{courses,0,lesson_count}')::integer,2,'draft lessons are excluded');
select is((public.get_public_course_catalog() #>> '{courses,0,duration_minutes}')::integer,75,'duration is derived from persisted published lessons');
select is((public.get_public_course_catalog() #>> '{courses,0,preview_lesson_count}')::integer,1,'preview count is derived from persisted flags');
select is(jsonb_array_length(public.get_public_course_catalog() #> '{courses,0,modules}'),1,'catalog exposes only published modules');
select is(public.get_public_course_catalog() #>> '{courses,0,modules,0,title}','Fundamentos','module title comes from the CMS');
select ok(not ((public.get_public_course_catalog() #> '{courses,0}') ? 'cover_asset_id'),'catalog does not expose private asset identifiers');
select ok(not ((public.get_public_course_catalog() #> '{courses,0}') ? 'version'),'catalog does not expose administrative versioning');
reset role;

select * from finish();
rollback;
