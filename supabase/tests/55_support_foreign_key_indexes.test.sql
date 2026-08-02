begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_index(
  'public',
  'support_ticket_messages',
  'support_ticket_messages_author_user_idx',
  'support messages cover the author foreign key'
);
select has_index(
  'public',
  'support_ticket_events',
  'support_ticket_events_actor_user_idx',
  'support events cover the actor foreign key'
);
select is(
  (select indpred is not null from pg_index where indexrelid='public.support_ticket_messages_author_user_idx'::regclass),
  true,
  'message author index is partial'
);
select is(
  (select indpred is not null from pg_index where indexrelid='public.support_ticket_events_actor_user_idx'::regclass),
  true,
  'event actor index is partial'
);
select is(
  (select pg_get_indexdef('public.support_ticket_messages_author_user_idx'::regclass) like '%(author_user_id)%'),
  true,
  'message index covers author_user_id'
);
select is(
  (select pg_get_indexdef('public.support_ticket_events_actor_user_idx'::regclass) like '%(actor_user_id)%'),
  true,
  'event index covers actor_user_id'
);

select * from finish();
rollback;
