create index support_ticket_messages_author_user_idx
  on public.support_ticket_messages (author_user_id)
  where author_user_id is not null;

create index support_ticket_events_actor_user_idx
  on public.support_ticket_events (actor_user_id)
  where actor_user_id is not null;
