import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  affiliateAdminDashboardSchema,
  affiliateCancelPayoutInputSchema,
  affiliateCreateLinkInputSchema,
  affiliateCreatePayoutInputSchema,
  affiliateDisplayNameInputSchema,
  affiliateLinkRowSchema,
  affiliateMarkPayoutPaidInputSchema,
  affiliatePayoutRowSchema,
  affiliatePortalSchema,
  affiliateProfileSchema,
  affiliateProfileStatusInputSchema,
  affiliateSubjectTermsRowSchema,
  affiliateTermsInputSchema,
  type AffiliateSubjectType,
} from "@/contracts/affiliate";
import { parseDataContract } from "@/contracts/contract-error";
import { uuidSchema } from "@/contracts/learning";
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
      const normalizedDisplayName = affiliateDisplayNameInputSchema.parse(displayName);
      const { data, error } = await supabase.rpc("request_affiliate_profile", {
        ...(normalizedDisplayName ? { p_display_name: normalizedDisplayName } : {}),
      });
      if (error) throw error;
      return parseDataContract(
        affiliateProfileSchema,
        data,
        "solicitação do perfil de afiliado",
      );
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
      const validated = affiliateCreateLinkInputSchema.parse(input);
      const { data, error } = await supabase.rpc("create_affiliate_link", {
        p_subject_type: validated.subjectType,
        p_subject_id: validated.subjectId,
        p_destination_path: validated.destinationPath,
      });
      if (error) throw error;
      return parseDataContract(
        affiliateLinkRowSchema,
        data,
        "criação do link de afiliado",
      );
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
      const validatedLinkId = uuidSchema.parse(linkId);
      const { data, error } = await supabase.rpc("deactivate_affiliate_link", {
        p_link_id: validatedLinkId,
      });
      if (error) throw error;
      return parseDataContract(
        affiliateLinkRowSchema,
        data,
        "desativação do link de afiliado",
      );
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
      const normalizedReason = input.reason?.trim() || null;
      const validated = affiliateProfileStatusInputSchema.parse({
        ...input,
        reason: normalizedReason,
      });
      const { data, error } = await supabase.rpc("admin_set_affiliate_profile_status", {
        p_user_id: validated.userId,
        p_status: validated.status,
        ...(validated.status === "suspended" ? { p_reason: validated.reason } : {}),
      });
      if (error) throw error;
      return parseDataContract(
        affiliateProfileSchema,
        data,
        "alteração do perfil de afiliado",
      );
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
      const validated = affiliateTermsInputSchema.parse(input);
      const { data, error } = await supabase.rpc("admin_configure_affiliate_terms", {
        p_subject_type: validated.subjectType,
        p_subject_id: validated.subjectId,
        p_commission_bps: validated.commissionBps,
        p_attribution_window_days: validated.attributionWindowDays,
        p_active: validated.active,
      });
      if (error) throw error;
      return parseDataContract(
        affiliateSubjectTermsRowSchema,
        data,
        "configuração de termos de afiliado",
      );
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
      const normalizedNotes = input.notes?.trim() || null;
      const validated = affiliateCreatePayoutInputSchema.parse({
        ...input,
        notes: normalizedNotes,
      });
      const { data, error } = await supabase.rpc("admin_create_affiliate_payout", {
        p_affiliate_user_id: validated.affiliateUserId,
        p_commission_ids: validated.commissionIds,
        ...(validated.notes ? { p_notes: validated.notes } : {}),
      });
      if (error) throw error;
      return parseDataContract(
        affiliatePayoutRowSchema,
        data,
        "criação do pagamento de afiliado",
      );
    },
    onSuccess: invalidate,
  });
};

export const useMarkAffiliatePayoutPaid = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: { payoutId: string; externalReference: string }) => {
      const validated = affiliateMarkPayoutPaidInputSchema.parse(input);
      const { data, error } = await supabase.rpc("admin_mark_affiliate_payout_paid", {
        p_payout_id: validated.payoutId,
        p_external_reference: validated.externalReference,
      });
      if (error) throw error;
      return parseDataContract(
        affiliatePayoutRowSchema,
        data,
        "confirmação do pagamento de afiliado",
      );
    },
    onSuccess: invalidate,
  });
};

export const useCancelAffiliatePayout = () => {
  const invalidate = useInvalidateAffiliateAdmin();
  return useMutation({
    mutationFn: async (input: { payoutId: string; reason: string }) => {
      const validated = affiliateCancelPayoutInputSchema.parse(input);
      const { data, error } = await supabase.rpc("admin_cancel_affiliate_payout", {
        p_payout_id: validated.payoutId,
        p_reason: validated.reason,
      });
      if (error) throw error;
      return parseDataContract(
        affiliatePayoutRowSchema,
        data,
        "cancelamento do pagamento de afiliado",
      );
    },
    onSuccess: invalidate,
  });
};
