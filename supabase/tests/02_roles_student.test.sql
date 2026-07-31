begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email)
values
  ('11000000-0000-4000-8000-000000000001', 'student-one@example.test'),
  ('11000000-0000-4000-8000-000000000002', 'student-two@example.test');

insert into public.courses (id, title, slug, status)
values ('20000000-0000-4000-8000-000000000001', 'Curso protegido', 'curso-protegido-estudante', 'published');
insert into public.modulos (id, course_id, titulo, ordem, status)
values ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Módulo protegido', 1, 'published');
insert into public.enrollments (id, user_id, course_id, status, source, starts_at)
values ('41000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'active', 'manual_grant', statement_timestamp() - interval '1 minute');
insert into public.aulas (id, modulo_id, titulo, ordem, duracao, status)
values ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Aula protegida', 1, 10, 'published');
insert into public.progresso_aulas (id, user_id, aula_id, progresso_percentual, tempo_assistido)
values
  ('51000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 25, 60),
  ('51000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 50, 120);
insert into public.user_profiles (id, user_id)
values
  ('61000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);

select is((select private.current_user_role()), 'aluno'::public.app_role, 'student role resolves from protected table');
select is((select count(*)::integer from public.modulos), 1, 'student can read learning modules');
select is((select count(*)::integer from public.progresso_aulas), 1, 'student sees only their own progress');
select is((select count(*)::integer from public.user_profiles), 1, 'student sees only their own profile');
select throws_ok(
  $$update public.progresso_aulas set progresso_percentual = 99 where user_id = '11000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'student cannot update progress aggregates directly'
);
select throws_ok(
  $$insert into public.progresso_aulas (user_id, aula_id) values ('11000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'student cannot insert progress for another user'
);
select is_empty(
  $$update public.user_roles set role = 'administrador_proprietario'::public.app_role where user_id = '11000000-0000-4000-8000-000000000001' returning user_id$$,
  'student cannot promote their own role'
);
select throws_ok(
  $$insert into public.modulos (course_id, titulo, ordem) values ('20000000-0000-4000-8000-000000000001', 'Tentativa indevida', 99)$$,
  '42501', null, 'student cannot create learning content'
);

reset role;
select * from finish();
rollback;
