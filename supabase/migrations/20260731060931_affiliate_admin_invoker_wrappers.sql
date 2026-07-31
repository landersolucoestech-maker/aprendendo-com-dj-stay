-- FASE B20: administração executada por wrappers públicos security invoker.

alter function public.admin_set_affiliate_profile_status(uuid, public.affiliate_profile_status, text) set schema private;
alter function public.admin_configure_affiliate_terms(public.checkout_subject_type, uuid, integer, integer, boolean) set schema private;
alter function public.admin_create_affiliate_payout(uuid, uuid[], text) set schema private;
alter function public.admin_mark_affiliate_payout_paid(uuid, text) set schema private;
alter function public.admin_cancel_affiliate_payout(uuid, text) set schema private;

revoke all on function private.admin_set_affiliate_profile_status(uuid, public.affiliate_profile_status, text) from public, anon, authenticated;
revoke all on function private.admin_configure_affiliate_terms(public.checkout_subject_type, uuid, integer, integer, boolean) from public, anon, authenticated;
revoke all on function private.admin_create_affiliate_payout(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function private.admin_mark_affiliate_payout_paid(uuid, text) from public, anon, authenticated;
revoke all on function private.admin_cancel_affiliate_payout(uuid, text) from public, anon, authenticated;

grant execute on function private.admin_set_affiliate_profile_status(uuid, public.affiliate_profile_status, text) to authenticated;
grant execute on function private.admin_configure_affiliate_terms(public.checkout_subject_type, uuid, integer, integer, boolean) to authenticated;
grant execute on function private.admin_create_affiliate_payout(uuid, uuid[], text) to authenticated;
grant execute on function private.admin_mark_affiliate_payout_paid(uuid, text) to authenticated;
grant execute on function private.admin_cancel_affiliate_payout(uuid, text) to authenticated;

create function public.admin_set_affiliate_profile_status(p_user_id uuid, p_status public.affiliate_profile_status, p_reason text default null)
returns public.affiliate_profiles
language sql security invoker set search_path=''
as $$ select private.admin_set_affiliate_profile_status(p_user_id,p_status,p_reason) $$;

create function public.admin_configure_affiliate_terms(p_subject_type public.checkout_subject_type, p_subject_id uuid, p_commission_bps integer, p_attribution_window_days integer, p_active boolean default true)
returns public.affiliate_subject_terms
language sql security invoker set search_path=''
as $$ select private.admin_configure_affiliate_terms(p_subject_type,p_subject_id,p_commission_bps,p_attribution_window_days,p_active) $$;

create function public.admin_create_affiliate_payout(p_affiliate_user_id uuid, p_commission_ids uuid[], p_notes text default null)
returns public.affiliate_payouts
language sql security invoker set search_path=''
as $$ select private.admin_create_affiliate_payout(p_affiliate_user_id,p_commission_ids,p_notes) $$;

create function public.admin_mark_affiliate_payout_paid(p_payout_id uuid, p_external_reference text)
returns public.affiliate_payouts
language sql security invoker set search_path=''
as $$ select private.admin_mark_affiliate_payout_paid(p_payout_id,p_external_reference) $$;

create function public.admin_cancel_affiliate_payout(p_payout_id uuid, p_reason text)
returns public.affiliate_payouts
language sql security invoker set search_path=''
as $$ select private.admin_cancel_affiliate_payout(p_payout_id,p_reason) $$;

revoke all on function public.admin_set_affiliate_profile_status(uuid, public.affiliate_profile_status, text) from public, anon, authenticated;
revoke all on function public.admin_configure_affiliate_terms(public.checkout_subject_type, uuid, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.admin_create_affiliate_payout(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public.admin_mark_affiliate_payout_paid(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_cancel_affiliate_payout(uuid, text) from public, anon, authenticated;

grant execute on function public.admin_set_affiliate_profile_status(uuid, public.affiliate_profile_status, text) to authenticated;
grant execute on function public.admin_configure_affiliate_terms(public.checkout_subject_type, uuid, integer, integer, boolean) to authenticated;
grant execute on function public.admin_create_affiliate_payout(uuid, uuid[], text) to authenticated;
grant execute on function public.admin_mark_affiliate_payout_paid(uuid, text) to authenticated;
grant execute on function public.admin_cancel_affiliate_payout(uuid, text) to authenticated;
