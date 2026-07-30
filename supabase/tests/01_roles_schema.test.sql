begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_type('public', 'app_role', 'application role enum exists');
select ok(
  (
    select array_agg(enumlabel::text order by enumsortorder)
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
  ) = array['aluno', 'afiliado', 'administrador_proprietario']::text[],
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
  array['search_path=""']::text[],
  'role helper has an empty fixed search_path'
);
select is(
  (select proconfig from pg_proc where oid = 'private.handle_new_user_role()'::regprocedure),
  array['search_path=""']::text[],
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
select is(
  (
    select count(*)::integer
    from (
      select tablename, roles, cmd
      from pg_policies
      where schemaname = 'public' and permissive = 'PERMISSIVE'
      group by tablename, roles, cmd
      having count(*) > 1
    ) as duplicate_policies
  ),
  0,
  'no action has overlapping permissive policies'
);

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000001', 'default-role@example.test');

select is(
  (select count(*)::integer from public.user_roles where user_id = '10000000-0000-4000-8000-000000000001' and role = 'aluno'::public.app_role),
  1,
  'new auth users receive the student role by default'
);

select * from finish();
rollback;
