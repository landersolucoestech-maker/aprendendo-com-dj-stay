alter default privileges for role postgres
  revoke execute on functions from public;

do $block$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and exists (
        select 1
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
        where x.grantee = 0
          and x.privilege_type = 'EXECUTE'
      )
  loop
    execute format(
      'grant execute on function %s to authenticated, service_role',
      v_function
    );
    execute format(
      'revoke execute on function %s from public',
      v_function
    );
  end loop;
end
$block$;
