begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_type('public','contact_message_status','contact status enum exists');
select has_type('public','contact_message_event_type','contact event enum exists');
select has_table('public','contact_messages','contact messages table exists');
select has_table('public','contact_message_events','contact events table exists');
select has_column('public','contact_messages','reference_code','contact has persisted reference code');
select has_column('public','contact_messages','idempotency_key','contact has idempotency key');
select has_column('public','contact_messages','resolution_note','contact preserves treatment note');
select has_check('public','contact_messages','contact payload and lifecycle have checks');

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.contact_messages'::regclass),'contact messages force RLS');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.contact_message_events'::regclass),'contact events force RLS');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename in ('contact_messages','contact_message_events') and permissive='RESTRICTIVE' and cmd='ALL'),2,'contact tables expose two explicit restrictive deny policies');
select is((select count(*)::integer from information_schema.role_table_grants where table_schema='public' and table_name in ('contact_messages','contact_message_events') and grantee in ('anon','authenticated')),0,'client roles have no direct contact table grants');

select has_pk('public','contact_messages','contact messages have primary key');
select has_pk('public','contact_message_events','contact events have primary key');
select has_fk('public','contact_messages','contact messages have foreign keys');
select has_fk('public','contact_message_events','contact events have foreign keys');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='contact_messages' and indexdef ilike 'create unique index%reference_code%'),'contact reference is unique');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='contact_messages' and indexdef ilike 'create unique index%idempotency_key%'),'contact idempotency key is unique');
select has_index('public','contact_messages','contact_messages_status_submitted_idx','contact queue is indexed by status');
select has_index('public','contact_messages','contact_messages_email_submitted_idx','contact history is indexed by normalized email');
select has_index('public','contact_message_events','contact_message_events_message_created_idx','contact audit history is indexed');
select ok(exists(select 1 from pg_trigger where not tgisinternal and tgrelid='public.contact_messages'::regclass and tgname='contact_messages_set_updated_at'),'contact updates are timestamped');

select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('submit_contact_message','get_contact_messages_admin','update_contact_message_status')),3,'three private contact functions exist');
select ok((select bool_and(p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('submit_contact_message','get_contact_messages_admin','update_contact_message_status')),'private contact functions are security definer');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('submit_contact_message','get_contact_messages_admin','update_contact_message_status')),3,'three public contact RPCs exist');
select is((select count(*)::integer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('submit_contact_message','get_contact_messages_admin','update_contact_message_status') and p.prosecdef),0,'public contact RPCs are security invoker');
select is((select count(*)::integer from information_schema.role_routine_grants where specific_schema='public' and grantee='anon' and routine_name in ('submit_contact_message','get_contact_messages_admin','update_contact_message_status')),1,'anonymous can execute only contact submission');
select is((select count(*)::integer from public.contact_messages)+(select count(*)::integer from public.contact_message_events),0,'contact schema starts empty');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='contact_messages' and column_name ilike '%ip%'),'contact domain stores no raw IP column');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like '%contact%' and p.prosecdef),'no public contact function uses security definer');

select * from finish();
rollback;
