begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users(id,email) values
 ('b2200000-0000-4000-8000-000000000201','b22-avatar-owner@example.test'),
 ('b2200000-0000-4000-8000-000000000202','b22-avatar-other@example.test');

insert into storage.objects(id,bucket_id,name,owner,metadata)
values
 ('b2280000-0000-4000-8000-000000000201','private-assets','users/b2200000-0000-4000-8000-000000000201/avatar/first.webp','b2200000-0000-4000-8000-000000000201','{"size":1200,"mimetype":"image/webp"}'::jsonb),
 ('b2280000-0000-4000-8000-000000000202','private-assets','users/b2200000-0000-4000-8000-000000000201/avatar/second.webp','b2200000-0000-4000-8000-000000000201','{"size":1400,"mimetype":"image/webp"}'::jsonb);

insert into public.assets(
  id,owner_user_id,created_by_user_id,purpose,state,original_name,normalized_name,
  extension,mime_type,size_bytes,idempotency_key,uploaded_at
)
values
 ('b2270000-0000-4000-8000-000000000201','b2200000-0000-4000-8000-000000000201','b2200000-0000-4000-8000-000000000201','avatar','uploaded','first.webp','first.webp','webp','image/webp',1200,'b22:test:avatar:first:0001',statement_timestamp()),
 ('b2270000-0000-4000-8000-000000000202','b2200000-0000-4000-8000-000000000201','b2200000-0000-4000-8000-000000000201','avatar','uploaded','second.webp','second.webp','webp','image/webp',1400,'b22:test:avatar:second:0001',statement_timestamp());

select ok(exists(select 1 from public.user_profiles where user_id='b2200000-0000-4000-8000-000000000201'),'owner profile exists');

set local role authenticated;
select set_config('request.jwt.claim.sub','b2200000-0000-4000-8000-000000000202',true);
select set_config('request.jwt.claims','{"sub":"b2200000-0000-4000-8000-000000000202","role":"authenticated","is_anonymous":false}',true);
select throws_ok(
  $$select public.transition_asset_state('b2270000-0000-4000-8000-000000000201','published')$$,
  '42501','ASSET_ACCESS_DENIED','another user cannot publish avatar asset'
);

select set_config('request.jwt.claim.sub','b2200000-0000-4000-8000-000000000201',true);
select set_config('request.jwt.claims','{"sub":"b2200000-0000-4000-8000-000000000201","role":"authenticated","is_anonymous":false}',true);
select lives_ok(
  $$select public.transition_asset_state('b2270000-0000-4000-8000-000000000201','published')$$,
  'owner publishes first avatar'
);
reset role;
select is((select state::text from public.assets where id='b2270000-0000-4000-8000-000000000201'),'published','first avatar becomes published');
select is((select avatar_asset_id from public.user_profiles where user_id='b2200000-0000-4000-8000-000000000201'),'b2270000-0000-4000-8000-000000000201'::uuid,'profile points to first published avatar');
select is((select count(*)::integer from public.asset_events where asset_id='b2270000-0000-4000-8000-000000000201' and event_type='associated'),1,'first avatar association is audited');

set local role authenticated;
select set_config('request.jwt.claim.sub','b2200000-0000-4000-8000-000000000201',true);
select set_config('request.jwt.claims','{"sub":"b2200000-0000-4000-8000-000000000201","role":"authenticated","is_anonymous":false}',true);
select lives_ok(
  $$select public.transition_asset_state('b2270000-0000-4000-8000-000000000202','published')$$,
  'owner publishes replacement avatar'
);
reset role;
select is((select state::text from public.assets where id='b2270000-0000-4000-8000-000000000202'),'published','replacement avatar becomes published');
select is((select avatar_asset_id from public.user_profiles where user_id='b2200000-0000-4000-8000-000000000201'),'b2270000-0000-4000-8000-000000000202'::uuid,'profile points to replacement avatar');
select is((select state::text from public.assets where id='b2270000-0000-4000-8000-000000000201'),'failed','replaced avatar leaves published state');
select is((select failure_reason from public.assets where id='b2270000-0000-4000-8000-000000000201'),'REPLACED_BY_NEW_AVATAR','replaced avatar stores cleanup reason');
select ok((select failed_at is not null from public.assets where id='b2270000-0000-4000-8000-000000000201'),'replaced avatar stores failure timestamp');
select is((select count(*)::integer from public.asset_events where asset_id='b2270000-0000-4000-8000-000000000201' and event_type='cleanup_requested'),1,'replaced avatar cleanup is audited');
select is((select count(*)::integer from public.asset_events where asset_id='b2270000-0000-4000-8000-000000000202' and event_type='associated'),1,'replacement association is audited');
select is((select count(*)::integer from public.assets where purpose='avatar' and owner_user_id='b2200000-0000-4000-8000-000000000201' and state='published'),1,'only current avatar remains published');
select ok(exists(select 1 from storage.objects where bucket_id='private-assets' and name='users/b2200000-0000-4000-8000-000000000201/avatar/first.webp'),'replaced object remains available for explicit cleanup');
select ok((select avatar_asset_id is not null from public.user_profiles where user_id='b2200000-0000-4000-8000-000000000201'),'profile avatar binding is non-null after replacement');
select is((select count(*)::integer from public.asset_events where asset_id in ('b2270000-0000-4000-8000-000000000201','b2270000-0000-4000-8000-000000000202') and event_type in ('published','associated','cleanup_requested')),5,'avatar lifecycle preserves all expected audit events');
select ok(not exists(select 1 from public.user_profiles where user_id='b2200000-0000-4000-8000-000000000201' and avatar_asset_id='b2270000-0000-4000-8000-000000000201'),'profile never points to replaced avatar after commit');

select * from finish();
rollback;
