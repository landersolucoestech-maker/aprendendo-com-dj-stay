create policy support_tickets_direct_access_denied
on public.support_tickets
as restrictive
for all
to public
using (false)
with check (false);

create policy support_ticket_messages_direct_access_denied
on public.support_ticket_messages
as restrictive
for all
to public
using (false)
with check (false);

create policy support_ticket_events_direct_access_denied
on public.support_ticket_events
as restrictive
for all
to public
using (false)
with check (false);
