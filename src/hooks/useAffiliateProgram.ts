import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  affiliateAdminDashboardSchema,
  affiliatePortalSchema,
  type AffiliateSubjectType,
} from "@/contracts/affiliate";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";

const affiliatePortalKey = ["affiliate", "portal"] as const;
const affiliateAdminKey = ["affiliate", "admin"] as const;

export const useAffiliatePortal = () =>
  useQuery({
    queryKey: affiliatePortalKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_affiliate_portal");
      if (error) throw error;
      return parseDataContract(affiliatePortalSchema, data, "portal do afiliado");
    },
  });

export const useRequestAffiliateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      const normalizedDisplayName = displayName.trim();
      const { data, error } = await supabase.rpc("request_affiliate_profile", {
        ...(normalizedDisplayName ? { p_display_name: normalizedDisplayName } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: affiliatePortalKey });
    },
  });
};

export const useCreateAffiliateLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subjectType: AffiliateSubjectType;
      subjectId: string;
      destinationPath: string;
    }) => {
      const { data, error } = await supabase.rpc("create_affiliate_link", {
        p_subject_type: input.subjectType,
        p_subject_id: input.subjectId,
        p_destination_path: input.destinationPath,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: affiliatePortalKey });
    },
  });
};

export const useDeactivateAffiliateLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { data, error } = await supabase.rpc("deactivate_affiliate_link", {
        p_link_id: linkId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: affiliatePortalKey });
    },
  });
};

export const useAffiliateAdminDashboard = () =>
  useQuery({
    queryKey: affiliateAdminKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_affiliate_admin_dashboard");
      if (error) throw error;
      return parseDataContract(
        affiliateAdminDashboardSchema,
        data,
        "administração de afiliados",
      );
    },
  });

const useInvalidateAffiliateAdmin = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: affiliateAdminKey }),
      queryClient.invalidateQueries({ queryKey: affiliatePortalKey }),
    ]);
  };
};

export const useSetAffiliateProfileStatus = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      status: "active" | "suspended";
      reason?: string | null;
    }) => {
      const normalizedReason = input.reason?.trim();
      const { data, error } = await supabase.rpc("admin_set_affiliate_profile_status", {
        p_user_id: input.userId,
        p_status: input.status,
        ...(normalizedReason ? { p_reason: normalizedReason } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
};

export const useConfigureAffiliateTerms = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: {
      subjectType: AffiliateSubjectType;
      subjectId: string;
      commissionBps: number;
      attributionWindowDays: number;
      active: boolean;
    }) => {
      const { data, error } = await supabase.rpc("admin_configure_affiliate_terms", {
        p_subject_type: input.subjectType,
        p_subject_id: input.subjectId,
        p_commission_bps: input.commissionBps,
        p_attribution_window_days: input.attributionWindowDays,
        p_active: input.active,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
};

export const useCreateAffiliatePayout = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: {
      affiliateUserId: string;
      commissionIds: string[];
      notes?: string | null;
    }) => {
      const normalizedNotes = input.notes?.trim();
      const { data, error } = await supabase.rpc("admin_create_affiliate_payout", {
        p_affiliate_user_id: input.affiliateUserId,
        p_commission_ids: input.commissionIds,
        ...(normalizedNotes ? { p_notes: normalizedNotes } : {}),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
};

export const useMarkAffiliatePayoutPaid = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: { payoutId: string; externalReference: string }) => {
      const { data, error } = await supabase.rpc("admin_mark_affiliate_payout_paid", {
        p_payout_id: input.payoutId,
        p_external_reference: input.externalReference,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
};

export const useCancelAffiliatePayout = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: { payoutId: string; reason: string }) => {
      const { data, error } = await supabase.rpc("admin_cancel_affiliate_payout", {
        p_payout_id: input.payoutId,
        p_reason: input.reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
};
