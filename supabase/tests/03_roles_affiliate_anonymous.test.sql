begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email)
values
  ('12000000-0000-4000-8000-000000000001', 'affiliate@example.test'),
  ('12000000-0000-4000-8000-000000000002', 'anonymous-user@example.test');
update public.user_roles set role = 'afiliado'::public.app_role where user_id = '12000000-0000-4000-8000-000000000001';

insert into public.modulos (id, titulo, ordem)
values ('22000000-0000-4000-8000-000000000001', 'Módulo protegido', 1);
insert into public.aulas (id, modulo_id, titulo, ordem)
values ('32000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'Aula protegida', 1);
insert into public.progresso_aulas (id, user_id, aula_id)
values ('52000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000001');
insert into public.user_profiles (id, user_id)
values
  ('62000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
select is((select private.current_user_role()), 'afiliado'::public.app_role, 'affiliate role resolves from protected table');
select is((select count(*)::integer from public.modulos), 0, 'affiliate cannot read student learning content');
select is((select count(*)::integer from public.progresso_aulas), 0, 'affiliate cannot read student progress');
select is((select count(*)::integer from public.user_profiles), 1, 'affiliate can read only their own profile');
select lives_ok(
  $$update public.user_profiles set avatar_asset_id = avatar_asset_id where user_id = '12000000-0000-4000-8000-000000000001'$$,
  'affiliate can update their own profile'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}', true);
select ok((select private.current_user_role()) is null, 'anonymous authenticated user receives no application role');
select is((select count(*)::integer from public.modulos), 0, 'anonymous authenticated user cannot read learning content');
select is((select count(*)::integer from public.user_profiles), 0, 'anonymous authenticated user cannot read profiles');
reset role;

select * from finish();
rollback;
