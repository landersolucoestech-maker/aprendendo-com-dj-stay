begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email)
values ('16000000-0000-4000-8000-000000000001', 'storage-failure-owner@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}', true);
select lives_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'missing.png','image/png',1024,'failure:missing:0001',null)$$,
  'missing-object scenario prepares an upload intent'
);
select results_eq(
  $$select (public.confirm_asset_upload((select id from public.assets where idempotency_key='failure:missing:0001'))).state::text$$,
  $$values ('failed'::text)$$,
  'confirmation fails closed when object is missing'
);
select results_eq(
  $$select failure_reason from public.assets where idempotency_key='failure:missing:0001'$$,
  $$values ('OBJECT_NOT_FOUND'::text)$$,
  'missing object records deterministic failure reason'
);
select is(
  (select count(*)::integer from public.asset_events where asset_id=(select id from public.assets where idempotency_key='failure:missing:0001') and event_type='failed'::public.asset_event_type),
  1,
  'missing object failure is audited once'
);

select lives_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'mismatch.webp','image/webp',2048,'failure:mismatch:01',null)$$,
  'metadata mismatch scenario prepares an intent'
);
select lives_ok(
  $$insert into storage.objects (bucket_id,name,owner_id,metadata)
    select bucket_id,object_path,owner_user_id::text,jsonb_build_object('size',9999,'mimetype',mime_type)
    from public.assets where idempotency_key='failure:mismatch:01'$$,
  'owner uploads object with mismatched metadata for negative test'
);
select results_eq(
  $$select (public.confirm_asset_upload((select id from public.assets where idempotency_key='failure:mismatch:01'))).failure_reason$$,
  $$values ('OBJECT_METADATA_MISMATCH'::text)$$,
  'metadata mismatch fails closed'
);
select throws_ok(
  $$select public.fail_asset_upload((select id from public.assets where idempotency_key='failure:mismatch:01'),'CLIENT_CLEANUP',true)$$,
  '22023', null, 'asset cannot be marked removed while storage object still exists'
);

-- The Storage API deletes the physical object and then removes its catalog row.
-- Direct application deletion remains blocked by storage.protect_objects_delete.
reset role;
alter table storage.objects disable trigger protect_objects_delete;
delete from storage.objects
where bucket_id='private-assets'
  and name=(select object_path from public.assets where idempotency_key='failure:mismatch:01');
alter table storage.objects enable trigger protect_objects_delete;
set local role authenticated;
select is(
  (select count(*)::integer from storage.objects where bucket_id='private-assets' and name=(select object_path from public.assets where idempotency_key='failure:mismatch:01')),
  0,
  'Storage API removal state is reflected before cleanup finalization'
);
select results_eq(
  $$select (public.fail_asset_upload((select id from public.assets where idempotency_key='failure:mismatch:01'),'CLIENT_CLEANUP',true)).state::text$$,
  $$values ('failed'::text)$$,
  'cleanup finalization remains idempotently failed'
);
select ok(
  (select deleted_at is not null from public.assets where idempotency_key='failure:mismatch:01'),
  'cleanup records deletion timestamp'
);
select is(
  (select count(*)::integer from public.asset_events where asset_id=(select id from public.assets where idempotency_key='failure:mismatch:01') and event_type='object_removed'::public.asset_event_type),
  1,
  'object removal is recorded in immutable audit events'
);
select lives_ok(
  $$select public.prepare_asset_upload('avatar'::public.asset_purpose,'published.webp','image/webp',3072,'failure:published:01',null)$$,
  'published lifecycle scenario prepares an intent'
);
select lives_ok(
  $$insert into storage.objects (bucket_id,name,owner_id,metadata)
    select bucket_id,object_path,owner_user_id::text,jsonb_build_object('size',size_bytes,'mimetype',mime_type)
    from public.assets where idempotency_key='failure:published:01'$$,
  'published lifecycle scenario uploads matching object'
);
select lives_ok(
  $$select public.confirm_asset_upload((select id from public.assets where idempotency_key='failure:published:01'))$$,
  'published lifecycle scenario confirms object'
);
select lives_ok(
  $$select public.transition_asset_state((select id from public.assets where idempotency_key='failure:published:01'),'published'::public.asset_state)$$,
  'published lifecycle scenario publishes asset'
);
select throws_ok(
  $$select public.fail_asset_upload((select id from public.assets where idempotency_key='failure:published:01'),'INVALIDATE_PUBLISHED',false)$$,
  '22023', null, 'published asset cannot be moved back to failed state'
);
reset role;

select * from finish();
rollback;
