begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select has_function(
  'private',
  'get_payment_admin_analytics',
  array['timestamp with time zone', 'timestamp with time zone', 'integer'],
  'private payment analytics read model exists'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'get_payment_admin_analytics'),
  'private payment analytics is security definer'
);
select is(
  (select p.provolatile::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'get_payment_admin_analytics'),
  's',
  'private payment analytics is stable'
);
select has_function(
  'public',
  'get_payment_admin_analytics',
  array['timestamp with time zone', 'timestamp with time zone', 'integer'],
  'public payment analytics RPC exists'
);
select ok(
  not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_payment_admin_analytics'),
  'public payment analytics RPC is security invoker'
);
select ok(
  not has_function_privilege('anon', 'public.get_payment_admin_analytics(timestamptz,timestamptz,integer)', 'EXECUTE'),
  'anonymous users cannot inspect payment analytics'
);
select ok(
  has_function_privilege('authenticated', 'public.get_payment_admin_analytics(timestamptz,timestamptz,integer)', 'EXECUTE'),
  'authenticated users can reach the owner-guarded payment analytics RPC'
);
select ok(
  position('ADMIN_REQUIRED' in pg_get_functiondef('private.get_payment_admin_analytics(timestamptz,timestamptz,integer)'::regprocedure)) > 0,
  'payment analytics requires owner administrator role'
);
select ok(
  position('interval ''366 days''' in pg_get_functiondef('private.get_payment_admin_analytics(timestamptz,timestamptz,integer)'::regprocedure)) > 0,
  'payment analytics bounds the requested period'
);
select ok(
  position('least(greatest(coalesce(p_top_limit, 10), 1), 20)' in pg_get_functiondef('private.get_payment_admin_analytics(timestamptz,timestamptz,integer)'::regprocedure)) > 0,
  'payment analytics bounds the top-offer limit'
);
select ok(
  position('America/Sao_Paulo' in pg_get_functiondef('private.get_payment_admin_analytics(timestamptz,timestamptz,integer)'::regprocedure)) > 0,
  'payment analytics groups daily values in the canonical app time zone'
);
select ok(
  position('payment_order.payment_confirmed_at >= v_start_at' in pg_get_functiondef('private.get_payment_admin_analytics(timestamptz,timestamptz,integer)'::regprocedure)) > 0,
  'payment analytics includes only persisted confirmations from the requested period'
);

insert into auth.users(id, email) values
  ('b9600000-0000-4000-8000-000000000101', 'b96-owner@example.test'),
  ('b9600000-0000-4000-8000-000000000102', 'b96-buyer-one@example.test'),
  ('b9600000-0000-4000-8000-000000000103', 'b96-buyer-two@example.test');

update public.user_roles
set role = 'administrador_proprietario'::public.app_role
where user_id = 'b9600000-0000-4000-8000-000000000101';

insert into public.digital_products(
  id, title, slug, status, price_amount, currency_code
) values (
  'b9600000-0000-4000-8000-000000000201',
  'Pack B96',
  'pack-b96',
  'published'::public.digital_product_status,
  50,
  'BRL'
);

insert into public.digital_product_licenses(
  id, product_id, kind, title, terms_text, version, status, is_default
) values (
  'b9600000-0000-4000-8000-000000000202',
  'b9600000-0000-4000-8000-000000000201',
  'personal'::public.digital_license_kind,
  'Licença pessoal B96',
  'Termos persistidos da licença pessoal para a fixture B96.',
  1,
  'published'::public.digital_license_status,
  true
);

insert into public.checkout_intents(
  id, user_id, subject_type, subject_id, license_id, status,
  amount_cents, currency_code, title_snapshot, item_snapshot, idempotency_key
) values
  ('b9600000-0000-4000-8000-000000000301', 'b9600000-0000-4000-8000-000000000102', 'course', 'b9600000-0000-4000-8000-000000000401', null, 'prepared', 10000, 'BRL', 'Curso A', '{}'::jsonb, 'b9600000-0000-4000-8000-000000000501'),
  ('b9600000-0000-4000-8000-000000000302', 'b9600000-0000-4000-8000-000000000103', 'course', 'b9600000-0000-4000-8000-000000000401', null, 'prepared', 10000, 'BRL', 'Curso A', '{}'::jsonb, 'b9600000-0000-4000-8000-000000000502'),
  ('b9600000-0000-4000-8000-000000000303', 'b9600000-0000-4000-8000-000000000102', 'digital_product', 'b9600000-0000-4000-8000-000000000201', 'b9600000-0000-4000-8000-000000000202', 'prepared', 5000, 'BRL', 'Pack B96', '{}'::jsonb, 'b9600000-0000-4000-8000-000000000503'),
  ('b9600000-0000-4000-8000-000000000304', 'b9600000-0000-4000-8000-000000000103', 'course', 'b9600000-0000-4000-8000-000000000402', null, 'prepared', 20000, 'BRL', 'Curso B', '{}'::jsonb, 'b9600000-0000-4000-8000-000000000504'),
  ('b9600000-0000-4000-8000-000000000305', 'b9600000-0000-4000-8000-000000000102', 'course', 'b9600000-0000-4000-8000-000000000402', null, 'prepared', 30000, 'BRL', 'Curso B Atualizado', '{}'::jsonb, 'b9600000-0000-4000-8000-000000000505'),
  ('b9600000-0000-4000-8000-000000000306', 'b9600000-0000-4000-8000-000000000102', 'course', 'b9600000-0000-4000-8000-000000000403', null, 'prepared', 9999, 'BRL', 'Curso fora do período', '{}'::jsonb, 'b9600000-0000-4000-8000-000000000506');

insert into public.payment_orders(
  id, user_id, checkout_intent_id, subject_type, subject_id, license_id,
  status, amount_cents, currency_code, title_snapshot, item_snapshot,
  payment_confirmed_at, created_at, updated_at
) values
  ('b9600000-0000-4000-8000-000000000601', 'b9600000-0000-4000-8000-000000000102', 'b9600000-0000-4000-8000-000000000301', 'course', 'b9600000-0000-4000-8000-000000000401', null, 'paid', 10000, 'BRL', 'Curso A', '{}'::jsonb, '2026-08-01T03:30:00+00', '2026-08-01T03:00:00+00', '2026-08-01T03:30:00+00'),
  ('b9600000-0000-4000-8000-000000000602', 'b9600000-0000-4000-8000-000000000103', 'b9600000-0000-4000-8000-000000000302', 'course', 'b9600000-0000-4000-8000-000000000401', null, 'refunded', 10000, 'BRL', 'Curso A', '{}'::jsonb, '2026-08-01T12:00:00+00', '2026-08-01T11:30:00+00', '2026-08-01T12:00:00+00'),
  ('b9600000-0000-4000-8000-000000000603', 'b9600000-0000-4000-8000-000000000102', 'b9600000-0000-4000-8000-000000000303', 'digital_product', 'b9600000-0000-4000-8000-000000000201', 'b9600000-0000-4000-8000-000000000202', 'paid', 5000, 'BRL', 'Pack B96', '{}'::jsonb, '2026-08-02T12:00:00+00', '2026-08-02T11:30:00+00', '2026-08-02T12:00:00+00'),
  ('b9600000-0000-4000-8000-000000000604', 'b9600000-0000-4000-8000-000000000103', 'b9600000-0000-4000-8000-000000000304', 'course', 'b9600000-0000-4000-8000-000000000402', null, 'chargeback_lost', 20000, 'BRL', 'Curso B', '{}'::jsonb, '2026-08-02T15:00:00+00', '2026-08-02T14:30:00+00', '2026-08-02T15:00:00+00'),
  ('b9600000-0000-4000-8000-000000000605', 'b9600000-0000-4000-8000-000000000102', 'b9600000-0000-4000-8000-000000000305', 'course', 'b9600000-0000-4000-8000-000000000402', null, 'refund_pending', 30000, 'BRL', 'Curso B Atualizado', '{}'::jsonb, '2026-08-03T12:00:00+00', '2026-08-03T11:30:00+00', '2026-08-03T12:00:00+00'),
  ('b9600000-0000-4000-8000-000000000606', 'b9600000-0000-4000-8000-000000000102', 'b9600000-0000-4000-8000-000000000306', 'course', 'b9600000-0000-4000-8000-000000000403', null, 'paid', 9999, 'BRL', 'Curso fora do período', '{}'::jsonb, '2026-07-01T12:00:00+00', '2026-07-01T11:30:00+00', '2026-07-01T12:00:00+00');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9600000-0000-4000-8000-000000000102","role":"authenticated","session_id":"b9600000-0000-4000-8000-000000000802","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)$$,
  '42501',
  'ADMIN_REQUIRED',
  'student cannot inspect payment analytics'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b9600000-0000-4000-8000-000000000101","role":"authenticated","session_id":"b9600000-0000-4000-8000-000000000801","is_anonymous":false}',
  true
);
select is(
  public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{period,time_zone}',
  'America/Sao_Paulo',
  'analytics returns the canonical time zone'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,confirmed_orders}')::integer,
  5,
  'analytics counts only confirmed orders inside the period'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,unique_customers}')::integer,
  2,
  'analytics counts unique confirmed customers'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,gross_revenue_cents}')::bigint,
  75000::bigint,
  'analytics calculates gross confirmed revenue'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,refunded_amount_cents}')::bigint,
  10000::bigint,
  'analytics calculates completed refunds'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,chargeback_lost_amount_cents}')::bigint,
  20000::bigint,
  'analytics calculates lost chargebacks'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,refund_pending_amount_cents}')::bigint,
  30000::bigint,
  'analytics exposes refund value still pending'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,net_after_reversals_cents}')::bigint,
  45000::bigint,
  'analytics calculates revenue retained after completed reversals'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{summary,average_ticket_cents}')::bigint,
  15000::bigint,
  'analytics calculates the average confirmed ticket'
);
select is(
  (
    select (status_row->>'order_count')::integer
    from jsonb_array_elements(public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)->'status_breakdown') as status_row
    where status_row->>'status' = 'paid'
  ),
  2,
  'analytics exposes the current paid-order count'
);
select is(
  (
    select (subject_row->>'gross_revenue_cents')::bigint
    from jsonb_array_elements(public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)->'subject_breakdown') as subject_row
    where subject_row->>'subject_type' = 'course'
  ),
  70000::bigint,
  'analytics aggregates gross course revenue'
);
select is(
  (
    select (subject_row->>'net_after_reversals_cents')::bigint
    from jsonb_array_elements(public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)->'subject_breakdown') as subject_row
    where subject_row->>'subject_type' = 'digital_product'
  ),
  5000::bigint,
  'analytics aggregates retained digital-product revenue'
);
select is(
  jsonb_array_length(public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)->'top_offers'),
  3,
  'analytics lists each sold offer once'
);
select is(
  public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{top_offers,0,subject_id}',
  'b9600000-0000-4000-8000-000000000402',
  'top offers are ordered by sales and gross value'
);
select is(
  public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{top_offers,0,title}',
  'Curso B Atualizado',
  'top offer uses the latest persisted title snapshot'
);
select is(
  jsonb_array_length(public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)->'daily'),
  4,
  'daily series includes every local calendar day in the period'
);
select is(
  public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{daily,0,day}',
  '2026-07-31',
  'daily series starts at the local calendar day of the period boundary'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{daily,1,net_after_reversals_cents}')::bigint,
  10000::bigint,
  'first populated local day subtracts its completed reversal'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{daily,2,net_after_reversals_cents}')::bigint,
  5000::bigint,
  'second populated local day subtracts its lost chargeback'
);
select is(
  (public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10) #>> '{daily,0,order_count}')::integer,
  0,
  'daily series includes zero-value days without fabrication'
);
select is(
  jsonb_array_length(public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 0)->'top_offers'),
  1,
  'top-offer limit is clamped to one'
);
select ok(
  public.get_payment_admin_analytics('2026-08-01T00:00:00Z', '2026-08-04T00:00:00Z', 10)::text !~ 'provider_payment_id|provider_checkout_id|customer_email',
  'analytics payload omits provider and customer identifiers'
);
select throws_ok(
  $$select public.get_payment_admin_analytics('2026-08-04T00:00:00Z', '2026-08-01T00:00:00Z', 10)$$,
  '22023',
  'PAYMENT_ANALYTICS_PERIOD_INVALID',
  'analytics rejects an inverted period'
);
select throws_ok(
  $$select public.get_payment_admin_analytics('2025-08-01T00:00:00Z', '2026-08-03T00:00:00Z', 10)$$,
  '22023',
  'PAYMENT_ANALYTICS_PERIOD_TOO_LARGE',
  'analytics rejects a period longer than 366 days'
);
reset role;

select * from finish();
rollback;
