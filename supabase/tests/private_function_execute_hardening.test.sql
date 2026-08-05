begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select is(
  (
    select count(*)::integer
    from pg_proc function
    join pg_namespace namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'private'
      and has_function_privilege('public', function.oid, 'EXECUTE')
  ),
  0,
  'private functions are not executable by PUBLIC'
);

select ok(
  exists (
    select 1
    from pg_default_acl default_acl
    join pg_roles owner_role on owner_role.oid = default_acl.defaclrole
    where owner_role.rolname = 'postgres'
      and default_acl.defaclnamespace = 0
      and default_acl.defaclobjtype = 'f'
      and not exists (
        select 1
        from aclexplode(default_acl.defaclacl) privilege
        where privilege.grantee = 0
          and privilege.privilege_type = 'EXECUTE'
      )
  ),
  'future postgres-owned functions do not grant EXECUTE to PUBLIC by default'
);

select ok(
  has_function_privilege(
    'authenticated',
    'private.create_module(uuid,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated preserves access to the private curriculum implementation'
);

select ok(
  has_function_privilege(
    'service_role',
    'private.create_module(uuid,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'service_role preserves access to the private curriculum implementation'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.create_module(uuid,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot execute the private curriculum implementation'
);

select ok(
  has_function_privilege(
    'service_role',
    'private.confirm_course_purchase(uuid,uuid,text,timestamp with time zone,timestamp with time zone,timestamp with time zone)'::regprocedure,
    'EXECUTE'
  ),
  'service_role preserves access to payment fulfillment implementation'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.confirm_course_purchase(uuid,uuid,text,timestamp with time zone,timestamp with time zone,timestamp with time zone)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot execute payment fulfillment implementation'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_module(uuid,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated can still execute the public curriculum wrapper'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_module(uuid,jsonb)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot execute the public curriculum wrapper'
);

create function private.__private_function_execute_hardening_probe()
returns integer
language sql
set search_path = ''
as $$ select 1 $$;

select ok(
  not has_function_privilege(
    'public',
    'private.__private_function_execute_hardening_probe()'::regprocedure,
    'EXECUTE'
  ),
  'new private functions are not executable by PUBLIC'
);

select ok(
  not has_function_privilege(
    'anon',
    'private.__private_function_execute_hardening_probe()'::regprocedure,
    'EXECUTE'
  ),
  'new private functions are not executable by anon'
);

select * from finish();
rollback;
