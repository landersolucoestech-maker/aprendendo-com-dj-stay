begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select has_type('public','assessment_status','assessment lifecycle enum exists');
select has_type('public','assessment_scope','assessment scope enum exists');
select has_type('public','assessment_question_type','assessment question type enum exists');
select has_type('public','assessment_attempt_status','assessment attempt status enum exists');
select has_type('public','assessment_event_type','assessment event enum exists');
select has_table('public','assessments','assessments table exists');
select has_table('public','assessment_questions','assessment questions table exists');
select has_table('public','assessment_options','assessment options table exists');
select has_table('public','assessment_attempts','assessment attempts table exists');
select has_table('public','assessment_answers','assessment answers table exists');
select has_table('public','assessment_events','assessment events table exists');
select has_table('private','assessment_attempt_keys','private attempt answer keys table exists');
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in (
  'public.assessments'::regclass,
  'public.assessment_questions'::regclass,
  'public.assessment_options'::regclass,
  'public.assessment_attempts'::regclass,
  'public.assessment_answers'::regclass,
  'public.assessment_events'::regclass
)),'all public assessment tables force RLS');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='private' and table_name='assessment_attempt_keys' and grantee in ('PUBLIC','anon','authenticated','service_role')),0,'private answer keys have no exposed-role table grants');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name like 'assessment%' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')),0,'authenticated cannot mutate assessment tables directly');
select is((select count(*)::integer from information_schema.role_table_grants where grantee='anon' and table_schema='public' and table_name like 'assessment%'),0,'anonymous has no assessment table privileges');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
  'create_assessment','update_assessment','create_assessment_question','update_assessment_question',
  'reorder_assessment_questions','publish_assessment','unpublish_assessment','archive_assessment',
  'delete_assessment','archive_assessment_question','delete_assessment_question','start_assessment_attempt',
  'save_assessment_answer','submit_assessment_attempt','get_assessment_attempt_result'
)),15,'assessment exposes fifteen public RPCs');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%assessment%' and p.prosecdef),0,'assessment public RPCs are invoker functions');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%assessment%' and has_function_privilege('anon',p.oid,'EXECUTE')),0,'anonymous cannot execute assessment RPCs');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
  'create_assessment','update_assessment','create_assessment_question','update_assessment_question',
  'reorder_assessment_questions','publish_assessment','unpublish_assessment','archive_assessment',
  'delete_assessment','archive_assessment_question','delete_assessment_question','start_assessment_attempt',
  'save_assessment_answer','submit_assessment_attempt','get_assessment_attempt_result'
) and has_function_privilege('authenticated',p.oid,'EXECUTE')),15,'authenticated reaches public assessment wrappers');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef),0,'no public security definer exists');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like '%assessment%' and p.prosecdef and p.proconfig is distinct from array['search_path=""']::text[]),0,'private assessment security definers fix empty search path');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename in ('assessments','assessment_questions','assessment_options','assessment_attempts','assessment_answers','assessment_events')),6,'assessment tables expose six non-overlapping read policies');
select is((select count(*)::integer from (select tablename,roles,cmd from pg_policies where schemaname='public' and tablename like 'assessment%' and permissive='PERMISSIVE' group by tablename,roles,cmd having count(*)>1) duplicated),0,'assessment introduces no overlapping permissive policies');
select has_index('public','assessments','assessments_course_status_idx','assessment course listing is indexed');
select has_index('public','assessment_questions','assessment_questions_assessment_order_idx','assessment question order is indexed');
select has_index('public','assessment_attempts','assessment_attempts_one_active_uidx','only one active attempt is enforced');
select col_not_null('public','assessment_attempts','show_correct_answers','attempt freezes answer disclosure policy');
select has_fk('public','assessment_answers','assessment answers use foreign keys');
select ok((select array_agg(enumlabel::text order by enumsortorder) from pg_enum where enumtypid='public.assessment_scope'::regtype)=array['course','module','lesson']::text[],'assessment scopes are closed');
select ok((select array_agg(enumlabel::text order by enumsortorder) from pg_enum where enumtypid='public.assessment_question_type'::regtype)=array['single_choice','multiple_choice','true_false']::text[],'question types are closed');
select ok((select array_agg(enumlabel::text order by enumsortorder) from pg_enum where enumtypid='public.assessment_attempt_status'::regtype)=array['in_progress','graded','expired','cancelled']::text[],'attempt statuses are closed');
select ok(not has_table_privilege('service_role','private.assessment_attempt_keys','SELECT'),'service role cannot read private answer keys directly');
select is((select count(*)::integer from pg_trigger where not tgisinternal and tgrelid in ('public.assessments'::regclass,'public.assessment_questions'::regclass,'public.assessment_attempts'::regclass)),5,'assessment lifecycle and updated-at triggers exist once');
select is((select count(*)::integer from public.assessments),0,'assessment schema starts without seeded assessments');
select is((select count(*)::integer from private.assessment_attempt_keys),0,'private answer key store starts empty');

select * from finish();
rollback;
