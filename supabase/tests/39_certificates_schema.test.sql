begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

select has_type('public','certificate_status','certificate status enum exists');
select has_type('public','certificate_event_type','certificate event type enum exists');
select has_table('public','certificates','certificates table exists');
select has_table('public','certificate_events','certificate events table exists');
select has_column('public','certificates','code','certificate has public validation code');
select has_column('public','certificates','status','certificate has lifecycle status');
select has_column('public','certificates','revocation_reason','certificate preserves revocation reason');
select has_check('public','certificates','certificate snapshots and lifecycle have checks');

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.certificates'::regclass),'certificates force RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.certificate_events'::regclass),'certificate events force RLS');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('certificates','certificate_events') and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')),0,'authenticated cannot mutate certificate tables');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('certificates','certificate_events') and grantee='anon'),0,'anonymous has no certificate table grants');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename in ('certificates','certificate_events')),2,'certificate tables expose two read policies');

select has_pk('public','certificates','certificates have primary key');
select has_pk('public','certificate_events','certificate events have primary key');
select has_fk('public','certificates','certificates have foreign keys');
select has_fk('public','certificate_events','certificate events have foreign keys');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='certificates_one_issued_per_enrollment_uidx'),'only one issued certificate exists per enrollment');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='certificates' and indexdef ilike 'create unique index%code%'),'certificate code is unique');
select has_index('public','certificates','certificates_user_issued_idx','student certificate history is indexed');
select has_index('public','certificates','certificates_course_issued_idx','course certificates are indexed');
select has_index('public','certificate_events','certificate_events_certificate_created_idx','certificate audit history is indexed');
select has_index('public','certificate_events','certificate_events_actor_idx','certificate actors are indexed');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.certificates'::regclass and tgname='certificates_freeze_identity'),'certificate identity is frozen');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.certificates'::regclass and tgname='certificates_set_updated_at'),'certificate updates are timestamped');

select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('calculate_enrollment_completion','issue_enrollment_certificate','revoke_enrollment_certificate','get_my_certificates','validate_certificate_code','get_students_admin_dashboard')),6,'six private B21 functions exist');
select ok((select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('calculate_enrollment_completion','issue_enrollment_certificate','revoke_enrollment_certificate','get_my_certificates','validate_certificate_code','get_students_admin_dashboard')),'private B21 functions are security definer');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('issue_enrollment_certificate','revoke_enrollment_certificate','get_my_certificates','validate_certificate','get_students_admin_dashboard')),5,'five public B21 RPCs exist');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('issue_enrollment_certificate','revoke_enrollment_certificate','get_my_certificates','validate_certificate','get_students_admin_dashboard') and p.prosecdef),0,'public B21 RPCs are security invoker');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='anon' and routine_name in ('issue_enrollment_certificate','revoke_enrollment_certificate','get_my_certificates','validate_certificate','get_students_admin_dashboard')),1,'anonymous can execute only certificate validation');
select is((select count(*)::integer from public.certificates)+(select count(*)::integer from public.certificate_events),0,'certificate schema starts empty');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%certificate%' and p.prosecdef),'no public certificate function uses security definer');

select * from finish();
rollback;
