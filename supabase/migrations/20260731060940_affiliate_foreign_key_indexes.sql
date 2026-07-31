-- FASE B20: índices das FKs administrativas e de auditoria.

create index affiliate_profiles_created_by_idx
  on public.affiliate_profiles (created_by_user_id);
create index affiliate_profiles_activated_by_idx
  on public.affiliate_profiles (activated_by_user_id);
create index affiliate_subject_terms_created_by_idx
  on public.affiliate_subject_terms (created_by_user_id);
create index affiliate_subject_terms_updated_by_idx
  on public.affiliate_subject_terms (updated_by_user_id);
create index affiliate_payouts_created_by_idx
  on public.affiliate_payouts (created_by_user_id);
create index affiliate_payouts_paid_by_idx
  on public.affiliate_payouts (paid_by_user_id);
create index affiliate_events_actor_idx
  on public.affiliate_events (actor_user_id);
create index affiliate_events_profile_user_idx
  on public.affiliate_events (profile_user_id);
