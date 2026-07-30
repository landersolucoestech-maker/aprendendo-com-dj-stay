begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select has_type('public', 'course_status', 'course status enum exists');
select ok(
  (select array_agg(enumlabel::text order by enumsortorder) from pg_enum where enumtypid='public.course_status'::regtype)
    = array['draft','published','archived']::text[],
  'course status values are closed'
);
select has_type('public', 'enrollment_status', 'enrollment status enum exists');
select ok(
  (select array_agg(enumlabel::text order by enumsortorder) from pg_enum where enumtypid='public.enrollment_status'::regtype)
    = array['pending','active','suspended','revoked']::text[],
  'enrollment status values are closed'
);
select has_type('public', 'enrollment_source', 'enrollment source enum exists');
select has_table('public', 'courses', 'courses table exists');
select has_table('public', 'enrollments', 'enrollments table exists');
select has_table('public', 'enrollment_events', 'enrollment audit table exists');
select col_not_null('public', 'modulos', 'course_id', 'every module belongs to a course');
select has_fk('public', 'modulos', 'modules reference courses');
select has_unique('public', 'enrollments', 'one enrollment exists per user and course');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.courses'::regclass), 'courses has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.enrollments'::regclass), 'enrollments has forced RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.enrollment_events'::regclass), 'enrollment events has forced RLS');
select is((select prosecdef from pg_proc where oid='private.has_active_course_access(uuid,uuid)'::regprocedure), true, 'course access helper is privileged');
select is((select proconfig from pg_proc where oid='private.has_active_course_access(uuid,uuid)'::regprocedure), array['search_path=""']::text[], 'course access helper fixes search_path');
select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and not p.prosecdef and p.proname in ('grant_course_enrollment','confirm_course_purchase','renew_course_enrollment','suspend_course_enrollment','revoke_course_enrollment')),
  5,
  'course lifecycle exposes five invoker wrappers'
);
select ok(has_function_privilege('service_role','public.confirm_course_purchase(uuid,uuid,text,timestamptz,timestamptz,timestamptz)','EXECUTE'), 'service role can confirm purchases');
select ok(not has_function_privilege('authenticated','public.confirm_course_purchase(uuid,uuid,text,timestamptz,timestamptz,timestamptz)','EXECUTE'), 'signed-in users cannot confirm their own purchases');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef), 0, 'no security definer is exposed in public');
select col_is_null('public', 'asset_access_grants', 'enrollment_id', 'manual grants remain possible without enrollment');
select has_index('public', 'asset_access_grants', 'asset_access_grants_manual_unique', 'manual asset grants remain unique');
select has_index('public', 'asset_access_grants', 'asset_access_grants_enrollment_unique', 'enrollment grants are independently unique');
select is(
  (select count(*)::integer from (select tablename,roles,cmd from pg_policies where schemaname='public' and permissive='PERMISSIVE' group by tablename,roles,cmd having count(*)>1) x),
  0,
  'course policies do not overlap permissively'
);

select * from finish();
rollback;
