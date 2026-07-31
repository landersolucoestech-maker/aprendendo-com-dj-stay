begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email)
values
  ('13000000-0000-4000-8000-000000000001', 'student@example.test'),
  ('13000000-0000-4000-8000-000000000002', 'affiliate@example.test'),
  ('13000000-0000-4000-8000-000000000003', 'owner@example.test');
update public.user_roles set role = 'afiliado'::public.app_role where user_id = '13000000-0000-4000-8000-000000000002';
update public.user_roles set role = 'administrador_proprietario'::public.app_role where user_id = '13000000-0000-4000-8000-000000000003';

insert into public.courses (id, title, slug, status)
values ('20000000-0000-4000-8000-000000000003', 'Curso administrativo', 'curso-administrativo', 'published');
insert into public.modulos (id, course_id, titulo, ordem, status)
values ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Módulo protegido', 1, 'published');
insert into public.aulas (id, modulo_id, titulo, ordem, status)
values ('33000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'Aula protegida', 1, 'published');
insert into public.progresso_aulas (id, user_id, aula_id)
values ('53000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001');
insert into public.user_profiles (id, user_id)
values
  ('63000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001'),
  ('63000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002'),
  ('63000000-0000-4000-8000-000000000003', '13000000-0000-4000-8000-000000000003');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"13000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}', true);
select is((select private.current_user_role()), 'administrador_proprietario'::public.app_role, 'owner administrator role resolves from protected table');
select is((select count(*)::integer from public.user_roles), 3, 'owner administrator can read all roles');
select is((select count(*)::integer from public.progresso_aulas), 1, 'owner administrator can read all progress');
select is((select count(*)::integer from public.user_profiles), 3, 'owner administrator can read all profiles');
select lives_ok(
  $$select public.create_module('20000000-0000-4000-8000-000000000003','{"title":"Módulo administrativo"}'::jsonb)$$,
  'owner administrator can create learning content'
);
select lives_ok(
  $$update public.user_roles set role = 'aluno'::public.app_role where user_id = '13000000-0000-4000-8000-000000000002'$$,
  'owner administrator can manage application roles'
);
reset role;

select * from finish();
rollback;
