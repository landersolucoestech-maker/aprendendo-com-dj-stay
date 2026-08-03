begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users(id,email) values
 ('b1020000-0000-4000-8000-000000000001','b102-admin@example.test'),
 ('b1020000-0000-4000-8000-000000000002','b102-affiliate-one@example.test'),
 ('b1020000-0000-4000-8000-000000000003','b102-affiliate-two@example.test'),
 ('b1020000-0000-4000-8000-000000000004','b102-affiliate-three@example.test');

update public.user_roles
set role = 'administrador_proprietario'::public.app_role
where user_id = 'b1020000-0000-4000-8000-000000000001';
update public.user_roles
set role = 'afiliado'::public.app_role
where user_id in (
  'b1020000-0000-4000-8000-000000000002',
  'b1020000-0000-4000-8000-000000000003',
  'b1020000-0000-4000-8000-000000000004'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1020000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select public.request_affiliate_profile('Afiliado B102 Um');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1020000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
select public.request_affiliate_profile('Afiliado B102 Dois');

reset role;
update public.affiliate_profiles
set created_at = case user_id
  when 'b1020000-0000-4000-8000-000000000002'::uuid then '2026-08-03T10:00:00Z'::timestamptz
  when 'b1020000-0000-4000-8000-000000000003'::uuid then '2026-08-03T11:00:00Z'::timestamptz
  else created_at
end
where user_id in (
  'b1020000-0000-4000-8000-000000000002',
  'b1020000-0000-4000-8000-000000000003'
);

select has_function(
  'private',
  'get_affiliate_admin_dashboard',
  array['integer','integer','integer','integer','integer','integer','integer','integer'],
  'private paginated affiliate dashboard exists'
);
select has_function(
  'public',
  'get_affiliate_admin_dashboard',
  array['integer','integer','integer','integer','integer','integer','integer','integer'],
  'public paginated affiliate dashboard exists'
);
select hasnt_function(
  'private',
  'get_affiliate_admin_dashboard',
  array[]::text[],
  'legacy private zero-argument dashboard is removed'
);
select hasnt_function(
  'public',
  'get_affiliate_admin_dashboard',
  array[]::text[],
  'legacy public zero-argument dashboard is removed'
);
select ok(
  (select prosecdef from pg_proc where oid = 'private.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure),
  'private affiliate dashboard is security definer'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure),
  'public affiliate dashboard is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'anonymous role cannot execute affiliate administration'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'authenticated role may reach guarded affiliate wrapper'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1020000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.get_affiliate_admin_dashboard(25,0,25,0,25,0,25,0)$$,
  '42501',
  'ADMIN_ROLE_REQUIRED',
  'affiliate cannot inspect affiliate administration'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b1020000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  (public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'totals'->>'profiles')::integer,
  3,
  'profile total is independent from profile page size'
);
select is(
  (public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'summary'->>'affiliates')::integer,
  3,
  'lifetime affiliate summary is preserved'
);
select is(
  jsonb_array_length(public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'profiles'),
  1,
  'profile page respects independent limit'
);
select is(
  public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'profiles'->0->>'user_id',
  'b1020000-0000-4000-8000-000000000003',
  'profile page starts with most recently requested profile'
);
select is(
  public.get_affiliate_admin_dashboard(1,1,1,0,1,0,1,0)->'profiles'->0->>'user_id',
  'b1020000-0000-4000-8000-000000000002',
  'profile offset returns next affiliate'
);
select isnt(
  public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'profiles'->0->>'user_id',
  public.get_affiliate_admin_dashboard(1,1,1,0,1,0,1,0)->'profiles'->0->>'user_id',
  'adjacent profile pages do not overlap'
);
select is(
  jsonb_array_length(public.get_affiliate_admin_dashboard(0,0,0,0,0,0,0,0)->'profiles'),
  1,
  'zero limits are clamped to one'
);
select is(
  public.get_affiliate_admin_dashboard(1,-10,1,-10,1,-10,1,-10)->'profiles'->0->>'user_id',
  'b1020000-0000-4000-8000-000000000003',
  'negative offsets are clamped to zero'
);
select ok(
  (public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'totals' ?&
    array['profiles','offers','available_commissions','payouts']),
  'dashboard exposes totals for all four paginated collections'
);
select ok(
  jsonb_typeof(public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'profiles') = 'array'
  and jsonb_typeof(public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'offers') = 'array'
  and jsonb_typeof(public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'available_commissions') = 'array'
  and jsonb_typeof(public.get_affiliate_admin_dashboard(1,0,1,0,1,0,1,0)->'payouts') = 'array',
  'all paginated collections remain arrays'
);
select ok(
  position('limit v_profile_limit offset v_profile_offset' in lower(pg_get_functiondef('private.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_offer_limit offset v_offer_offset' in lower(pg_get_functiondef('private.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_commission_limit offset v_commission_offset' in lower(pg_get_functiondef('private.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0
  and position('limit v_payout_limit offset v_payout_offset' in lower(pg_get_functiondef('private.get_affiliate_admin_dashboard(integer,integer,integer,integer,integer,integer,integer,integer)'::regprocedure))) > 0,
  'each affiliate collection applies its own limit and offset'
);

select * from finish();
rollback;
