begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('certificates', 'certificate_events')
      and cmd = 'SELECT'
  ),
  2,
  'certificate domain preserves two authenticated read policies'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('certificates', 'certificate_events')
      and qual ~* 'SELECT[[:space:]]+private\.current_user_role\(\)'
  ),
  2,
  'certificate policies cache current user role through scalar subqueries'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('certificates', 'certificate_events')
      and qual ~* 'SELECT[[:space:]]+auth\.uid\(\)'
  ),
  2,
  'certificate policies cache auth uid through scalar subqueries'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('contact_messages', 'contact_message_events')
  ),
  2,
  'contact domain exposes two explicit policies'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('contact_messages', 'contact_message_events')
      and permissive = 'RESTRICTIVE'
  ),
  2,
  'contact policies are restrictive'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('contact_messages', 'contact_message_events')
      and cmd = 'ALL'
  ),
  2,
  'contact policies cover every direct command'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('contact_messages', 'contact_message_events')
      and qual = 'false'
  ),
  2,
  'contact policies deny reads and mutations'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('contact_messages', 'contact_message_events')
      and with_check = 'false'
  ),
  2,
  'contact policies deny row creation and updates'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename in ('contact_messages', 'contact_message_events')
      and roles::text = '{anon,authenticated}'
  ),
  2,
  'contact deny policies target both client roles'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('contact_messages', 'contact_message_events')
      and grantee in ('anon', 'authenticated')
  ),
  0,
  'client roles retain zero direct contact table privileges'
);

select ok(
  (
    select bool_and(owner_role.rolbypassrls)
    from pg_class table_record
    join pg_namespace table_schema on table_schema.oid = table_record.relnamespace
    join pg_roles owner_role on owner_role.oid = table_record.relowner
    where table_schema.nspname = 'public'
      and table_record.relname in ('contact_messages', 'contact_message_events')
  ),
  'contact table owner bypasses RLS for trusted security-definer operations'
);

select ok(
  (
    select bool_and(function_record.prosecdef and owner_role.rolbypassrls)
    from pg_proc function_record
    join pg_namespace function_schema on function_schema.oid = function_record.pronamespace
    join pg_roles owner_role on owner_role.oid = function_record.proowner
    where function_schema.nspname = 'private'
      and function_record.proname in (
        'submit_contact_message',
        'get_contact_messages_admin',
        'update_contact_message_status'
      )
  ),
  'private contact functions remain security definer under a BYPASSRLS owner'
);

select * from finish();
rollback;
