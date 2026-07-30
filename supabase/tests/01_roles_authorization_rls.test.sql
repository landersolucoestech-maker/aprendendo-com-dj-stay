begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select has_type('public', 'app_role', 'application role enum exists');
select results_eq(
  $$select enumlabel::text from pg_enum where enumtypid = 'public.app_role'::regtype order by enumsortorder$$,
  $$values ('aluno'::text), ('afiliado'::text), ('administrador_proprietario'::text)$$,
  'only the three authorized application roles exist'
);
select has_table('public', 'user_roles', 'user roles table exists');
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.user_roles'::regclass),
  'user roles has forced RLS'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.prosecdef and n.nspname = 'public'),
  0,
  'no security definer function is exposed in public'
);
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.prosecdef and n.nspname = 'private'),
  2,
  'only the two audited private security definer functions exist'
);
select is(
  (select proconfig from pg_proc where oid = 'private.current_user_role()'::regprocedure),
  array['search_path=']::text[],
  'role helper has an empty fixed search_path'
);
select is(
  (select proconfig from pg_proc where oid = 'private.handle_new_user_role()'::regprocedure),
  array['search_path=']::text[],
  'new-user trigger function has an empty fixed search_path'
);
select ok(
  has_function_privilege('authenticated', 'private.current_user_role()', 'EXECUTE'),
  'authenticated users can execute only the role lookup helper'
);
select ok(
  not has_function_privilege('authenticated', 'private.handle_new_user_role()', 'EXECUTE'),
  'authenticated users cannot execute the privileged signup trigger function'
);
select ok(
  not has_function_privilege('anon', 'private.current_user_role()', 'EXECUTE'),
  'anonymous database role cannot execute the role helper'
);
select is(
  (select count(*)::integer from pg_trigger where not tgisinternal and tgname = 'on_auth_user_role_created'),
  1,
  'auth signup role trigger exists once'
);

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'student-one@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'student-two@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'affiliate@example.test'),
  ('10000000-0000-4000-8000-000000000004', 'owner@example.test'),
  ('10000000-0000-4000-8000-000000000005', 'anonymous-user@example.test');

select is(
  (select count(*)::integer from public.user_roles where role = 'aluno'::public.app_role),
  5,
  'new auth users receive the student role by default'
);

update public.user_roles
set role = 'afiliado'::public.app_role
where user_id = '10000000-0000-4000-8000-000000000003';

update public.user_roles
set role = 'administrador_proprietario'::public.app_role
where user_id = '10000000-0000-4000-8000-000000000004';

insert into public.modulos (id, titulo, ordem)
values ('20000000-0000-4000-8000-000000000001', 'Módulo protegido', 1);

insert into public.aulas (id, modulo_id, titulo, ordem, duracao)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'Aula protegida',
  1,
  10
);

insert into public.lesson_files (id, aula_id, samples_file_path)
values (
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'samples/aula-protegida.zip'
);

insert into public.progresso_aulas (
  id,
  user_id,
  aula_id,
  progresso_percentual,
  tempo_assistido
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    25,
    60
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    50,
    120
  );

insert into public.user_profiles (id, user_id)
values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003'),
  ('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select is((select private.current_user_role()), 'aluno'::public.app_role, 'student role resolves from protected table');
select is((select count(*)::integer from public.modulos), 1, 'student can read learning modules');
select is((select count(*)::integer from public.progresso_aulas), 1, 'student sees only their own progress');
select is((select count(*)::integer from public.user_profiles), 1, 'student sees only their own profile');
select is_empty(
  $$update public.progresso_aulas set progresso_percentual = 99 where user_id = '10000000-0000-4000-8000-000000000002' returning id$$,
  'student cannot update another student progress'
);
select throws_ok(
  $$insert into public.progresso_aulas (user_id, aula_id) values ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'student cannot insert progress for another user'
);
select is_empty(
  $$update public.user_roles set role = 'administrador_proprietario'::public.app_role where user_id = '10000000-0000-4000-8000-000000000001' returning user_id$$,
  'student cannot promote their own role'
);
select throws_ok(
  $$insert into public.modulos (titulo, ordem) values ('Tentativa indevida', 99)$$,
  '42501',
  null,
  'student cannot create learning content'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
select is((select private.current_user_role()), 'afiliado'::public.app_role, 'affiliate role resolves from protected table');
select is((select count(*)::integer from public.modulos), 0, 'affiliate cannot read student learning content');
select is((select count(*)::integer from public.progresso_aulas), 0, 'affiliate cannot read student progress');
select is((select count(*)::integer from public.user_profiles), 1, 'affiliate can read only their own profile');
select lives_ok(
  $$update public.user_profiles set avatar_url = 'https://example.test/avatar.webp' where user_id = '10000000-0000-4000-8000-000000000003'$$,
  'affiliate can update their own profile'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated","is_anonymous":true}',
  true
);
select is_null((select private.current_user_role()), 'anonymous authenticated user receives no application role');
select is((select count(*)::integer from public.modulos), 0, 'anonymous authenticated user cannot read learning content');
select is((select count(*)::integer from public.user_profiles), 0, 'anonymous authenticated user cannot read profiles');
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',
  true
);
select is((select private.current_user_role()), 'administrador_proprietario'::public.app_role, 'owner administrator role resolves from protected table');
select is((select count(*)::integer from public.user_roles), 5, 'owner administrator can read all roles');
select is((select count(*)::integer from public.progresso_aulas), 2, 'owner administrator can read all progress');
select is((select count(*)::integer from public.user_profiles), 4, 'owner administrator can read all profiles');
select lives_ok(
  $$insert into public.modulos (titulo, ordem) values ('Módulo administrativo', 2)$$,
  'owner administrator can create learning content'
);
select lives_ok(
  $$update public.user_roles set role = 'aluno'::public.app_role where user_id = '10000000-0000-4000-8000-000000000003'$$,
  'owner administrator can manage application roles'
);
reset role;

select * from finish();
rollback;
