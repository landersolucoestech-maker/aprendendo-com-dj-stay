create index asset_access_grants_granted_by_user_id_idx
on public.asset_access_grants (granted_by_user_id);

create index asset_events_actor_user_id_idx
on public.asset_events (actor_user_id);
