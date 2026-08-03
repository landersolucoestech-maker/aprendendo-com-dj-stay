begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users(id,email) values
  ('b1030000-0000-4000-8000-000000000001','b103-affiliate@example.test'),
  ('b1030000-0000-4000-8000-000000000002','b103-student@example.test');

update public.user_roles
set role = 'afiliado'::public.app_role
where user_id = 'b1030000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1030000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select public.request_affiliate_profile('Afiliado B103');

reset role;
update public.affiliate_profiles
set status = 'active'::public.affiliate_profile_status,
    activated_at = '2026-08-03T10:00:00Z'::timestamptz,
    activated_by_user_id = 'b1030000-0000-4000-8000-000000000001'
where user_id = 'b1030000-0000-4000-8000-000000000001';

delete from public.affiliate_events
where affiliate_user_id = 'b1030000-0000-4000-8000-000000000001';

insert into public.affiliate_links(
  id,affiliate_user_id,subject_type,subject_id,code,status,destination_path,created_at,updated_at
) values
  ('b1030000-0000-4000-8000-000000000101','b1030000-0000-4000-8000-000000000001','course','b1030000-0000-4000-8000-000000000201','b103link00001','active','/curso-1','2026-08-03T10:00:00Z','2026-08-03T10:00:00Z'),
  ('b1030000-0000-4000-8000-000000000102','b1030000-0000-4000-8000-000000000001','course','b1030000-0000-4000-8000-000000000202','b103link00002','active','/curso-2','2026-08-03T11:00:00Z','2026-08-03T11:00:00Z'),
  ('b1030000-0000-4000-8000-000000000103','b1030000-0000-4000-8000-000000000001','digital_product','b1030000-0000-4000-8000-000000000203','b103link00003','active','/produto-3','2026-08-03T12:00:00Z','2026-08-03T12:00:00Z');

insert into public.affiliate_events(
  id,affiliate_user_id,event_type,actor_user_id,details,created_at
) values
  ('b1030000-0000-4000-8000-000000000301','b1030000-0000-4000-8000-000000000001','link_created','b1030000-0000-4000-8000-000000000001','{"sequence":1}'::jsonb,'2026-08-03T13:00:00Z'),
  ('b1030000-0000-4000-8000-000000000302','b1030000-0000-4000-8000-000000000001','link_deactivated','b1030000-0000-4000-8000-000000000001','{"sequence":2}'::jsonb,'2026-08-03T14:00:00Z'),
  ('b1030000-0000-4000-8000-000000000303','b1030000-0000-4000-8000-000000000001','link_created','b1030000-0000-4000-8000-000000000001','{"sequence":3}'::jsonb,'2026-08-03T15:00:00Z');

select has_function(
  'private','get_affiliate_portal',
  array['integer','integer','integer','integer','integer','integer','integer','integer','integer','integer'],
  'private paginated affiliate portal exists'
);
select has_function(
  'public','get_affiliate_portal',
  array['integer','integer','integer','integer','integer','integer','integer','integer','integer','integer'],
  'public paginated affiliate portal exists'
);
select hasnt_function(
  'private','get_affiliate_portal',array[]::text[],
  'legacy private zero-argument affiliate portal is removed'
);
select hasnt_function(
  'public','get_affiliate_portal',array[]::text[],
  'legacy public zero-argument affiliate portal is removed'
);
select ok(
  (select prosecdef from pg_proc where oid = 'private.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure),
  'private affiliate portal is security definer'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure),
  'public affiliate portal is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'anonymous role cannot execute affiliate portal'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'authenticated role may reach guarded affiliate portal'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1030000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.get_affiliate_portal(25,0,25,0,25,0,25,0,25,0)$$,
  '42501','AFFILIATE_ROLE_REQUIRED',
  'student cannot inspect affiliate portal'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1030000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
select lives_ok(
  $$select public.get_affiliate_portal()$$,
  'default arguments preserve legacy zero-argument invocation'
);
select is(
  (public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'totals'->>'links')::integer,
  3,
  'link total is independent from link page size'
);
select is(
  (public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'totals'->>'events')::integer,
  3,
  'event total is independent from event page size'
);
select is(
  public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'profile'->>'user_id',
  'b1030000-0000-4000-8000-000000000001',
  'portal preserves the authenticated affiliate profile'
);
select is(
  jsonb_array_length(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'links'),
  1,
  'link page respects independent limit'
);
select is(
  public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'links'->0->>'code',
  'b103link00003',
  'link page starts with newest link'
);
select is(
  public.get_affiliate_portal(1,0,1,1,1,0,1,0,1,0)->'links'->0->>'code',
  'b103link00002',
  'link offset returns next link'
);
select isnt(
  public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'links'->0->>'id',
  public.get_affiliate_portal(1,0,1,1,1,0,1,0,1,0)->'links'->0->>'id',
  'adjacent link pages do not overlap'
);
select is(
  jsonb_array_length(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'events'),
  1,
  'event page respects independent limit'
);
select is(
  (public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'events'->0->'details'->>'sequence')::integer,
  3,
  'event page starts with newest event'
);
select is(
  (public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,1)->'events'->0->'details'->>'sequence')::integer,
  2,
  'event offset returns next event'
);
select is(
  jsonb_array_length(public.get_affiliate_portal(0,0,0,0,0,0,0,0,0,0)->'links'),
  1,
  'zero limits are clamped independently to one'
);
select is(
  public.get_affiliate_portal(1,-10,1,-10,1,-10,1,-10,1,-10)->'links'->0->>'code',
  'b103link00003',
  'negative offsets are clamped independently to zero'
);
select ok(
  (public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'totals' ?&
    array['offers','links','commissions','payouts','events']),
  'portal exposes totals for all five paginated collections'
);
select ok(
  jsonb_typeof(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'offers') = 'array'
  and jsonb_typeof(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'links') = 'array'
  and jsonb_typeof(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'commissions') = 'array'
  and jsonb_typeof(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'payouts') = 'array'
  and jsonb_typeof(public.get_affiliate_portal(1,0,1,0,1,0,1,0,1,0)->'events') = 'array',
  'all five paginated portal collections remain arrays'
);
select ok(
  position('limit v_offer_limit offset v_offer_offset' in lower(pg_get_functiondef('private.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_link_limit offset v_link_offset' in lower(pg_get_functiondef('private.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_commission_limit offset v_commission_offset' in lower(pg_get_functiondef('private.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_payout_limit offset v_payout_offset' in lower(pg_get_functiondef('private.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_event_limit offset v_event_offset' in lower(pg_get_functiondef('private.get_affiliate_portal(integer,integer,integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0,
  'each portal collection applies its own limit and offset'
);

select * from finish();
rollback;
