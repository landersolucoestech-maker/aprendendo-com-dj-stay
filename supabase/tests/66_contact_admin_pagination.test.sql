begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users(id, email) values
  ('b9900000-0000-4000-8000-000000000001', 'b99-admin@example.test'),
  ('b9900000-0000-4000-8000-000000000002', 'b99-student@example.test');

update public.user_roles
set role = 'administrador_proprietario'::public.app_role
where user_id = 'b9900000-0000-4000-8000-000000000001';

insert into public.contact_messages (
  id,
  reference_code,
  user_id,
  name,
  email,
  subject,
  message,
  status,
  idempotency_key,
  submitted_at
) values
  ('b9900000-0000-4000-8000-000000000101', 'CONTATO-0000000000000001', 'b9900000-0000-4000-8000-000000000002', 'Contato 1', 'contato1@example.test', 'Assunto 1', 'Mensagem persistida número 1.', 'new', 'b9900000-0000-4000-8000-000000000201', '2026-08-01T10:00:00Z'),
  ('b9900000-0000-4000-8000-000000000102', 'CONTATO-0000000000000002', 'b9900000-0000-4000-8000-000000000002', 'Contato 2', 'contato2@example.test', 'Assunto 2', 'Mensagem persistida número 2.', 'in_progress', 'b9900000-0000-4000-8000-000000000202', '2026-08-01T11:00:00Z'),
  ('b9900000-0000-4000-8000-000000000103', 'CONTATO-0000000000000003', 'b9900000-0000-4000-8000-000000000002', 'Contato 3', 'contato3@example.test', 'Assunto 3', 'Mensagem persistida número 3.', 'new', 'b9900000-0000-4000-8000-000000000203', '2026-08-01T12:00:00Z'),
  ('b9900000-0000-4000-8000-000000000104', 'CONTATO-0000000000000004', 'b9900000-0000-4000-8000-000000000002', 'Contato 4', 'contato4@example.test', 'Assunto 4', 'Mensagem persistida número 4.', 'in_progress', 'b9900000-0000-4000-8000-000000000204', '2026-08-01T13:00:00Z'),
  ('b9900000-0000-4000-8000-000000000105', 'CONTATO-0000000000000005', 'b9900000-0000-4000-8000-000000000002', 'Contato 5', 'especial@example.test', 'Assunto especial', 'Mensagem persistida número 5.', 'new', 'b9900000-0000-4000-8000-000000000205', '2026-08-01T14:00:00Z');

insert into public.contact_message_events (
  contact_message_id,
  event_type,
  from_status,
  to_status,
  actor_user_id,
  details,
  created_at
)
select
  contact.id,
  'submitted'::public.contact_message_event_type,
  null,
  'new'::public.contact_message_status,
  contact.user_id,
  '{}'::jsonb,
  contact.submitted_at
from public.contact_messages contact
where contact.id::text like 'b9900000-0000-4000-8000-00000000010%';

select has_function(
  'private',
  'get_contact_messages_admin',
  array['public.contact_message_status', 'text', 'integer', 'integer'],
  'private paginated contact inbox exists'
);
select has_function(
  'public',
  'get_contact_messages_admin',
  array['public.contact_message_status', 'text', 'integer', 'integer'],
  'public paginated contact inbox exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'private.get_contact_messages_admin(public.contact_message_status,text,integer,integer)'::regprocedure),
  'private contact inbox remains security definer'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.get_contact_messages_admin(public.contact_message_status,text,integer,integer)'::regprocedure),
  'public contact inbox remains security invoker'
);
select ok(
  position($marker$'total'$marker$ in pg_get_functiondef('private.get_contact_messages_admin(public.contact_message_status,text,integer,integer)'::regprocedure)) > 0,
  'contact inbox exposes filtered total'
);
select ok(
  position('order by submitted_at desc, id desc' in lower(pg_get_functiondef('private.get_contact_messages_admin(public.contact_message_status,text,integer,integer)'::regprocedure))) > 0,
  'contact inbox uses deterministic ordering'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9900000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
select throws_ok(
  $$select public.get_contact_messages_admin(null, null, 2, 0)$$,
  '42501',
  'ADMIN_REQUIRED',
  'student cannot inspect paginated contact inbox'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"b9900000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select is(
  (public.get_contact_messages_admin(null, null, 2, 0)->>'total')::integer,
  5,
  'contact inbox reports complete filtered total'
);
select is(
  jsonb_array_length(public.get_contact_messages_admin(null, null, 2, 0)->'messages'),
  2,
  'first contact page respects limit'
);
select is(
  public.get_contact_messages_admin(null, null, 2, 0)->'messages'->0->>'reference_code',
  'CONTATO-0000000000000005',
  'first contact page starts with newest record'
);
select is(
  jsonb_array_length(public.get_contact_messages_admin(null, null, 2, 2)->'messages'),
  2,
  'second contact page respects offset'
);
select is(
  public.get_contact_messages_admin(null, null, 2, 2)->'messages'->0->>'reference_code',
  'CONTATO-0000000000000003',
  'second contact page continues deterministic order'
);
select is(
  jsonb_array_length(public.get_contact_messages_admin(null, null, 2, 4)->'messages'),
  1,
  'last contact page returns remaining record'
);
select is(
  public.get_contact_messages_admin(null, null, 2, 4)->'messages'->0->>'reference_code',
  'CONTATO-0000000000000001',
  'last contact page contains oldest record'
);
select isnt(
  public.get_contact_messages_admin(null, null, 2, 0)->'messages'->0->>'id',
  public.get_contact_messages_admin(null, null, 2, 2)->'messages'->0->>'id',
  'adjacent contact pages do not overlap'
);
select is(
  (public.get_contact_messages_admin('in_progress', null, 1, 0)->>'total')::integer,
  2,
  'status filter changes total before pagination'
);
select is(
  public.get_contact_messages_admin('in_progress', null, 1, 1)->'messages'->0->>'reference_code',
  'CONTATO-0000000000000002',
  'status-filtered offset returns the next matching record'
);
select is(
  (public.get_contact_messages_admin(null, 'especial', 25, 0)->>'total')::integer,
  1,
  'search filter changes total before pagination'
);
select is(
  public.get_contact_messages_admin(null, 'especial', 25, 0)->'messages'->0->>'reference_code',
  'CONTATO-0000000000000005',
  'search returns the matching contact'
);
select is(
  (public.get_contact_messages_admin(null, null, 2, 0)->'summary'->>'new')::integer,
  3,
  'summary remains independent from page size'
);
select is(
  jsonb_array_length(public.get_contact_messages_admin(null, null, 0, 0)->'messages'),
  1,
  'zero limit is clamped to one record'
);
select is(
  public.get_contact_messages_admin(null, null, 1, -10)->'messages'->0->>'reference_code',
  'CONTATO-0000000000000005',
  'negative offset is clamped to zero'
);

select * from finish();
rollback;
