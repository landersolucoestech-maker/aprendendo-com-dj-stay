import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adminUpdatePrivacyRightsRequestSchema,
  createPrivacyRightsRequestSchema,
  privacyRightsRequestListSchema,
  privacyRightsRequestSchema,
  type AdminUpdatePrivacyRightsRequest,
  type CreatePrivacyRightsRequest,
  type PrivacyRightsRequestStatus,
  type PrivacyRightsRequestType,
} from "@/contracts/privacy-rights-requests";
import { privacyRightsRpcClient } from "@/integrations/supabase/privacy-rights-rpc";

const studentKey = ["privacy-rights-requests", "student"] as const;
const adminKey = ["privacy-rights-requests", "admin"] as const;

export const useMyPrivacyRightsRequests = () =>
  useQuery({
    queryKey: studentKey,
    queryFn: async () => {
      const { data, error } = await privacyRightsRpcClient.rpc(
        "get_my_privacy_rights_requests",
        { p_limit: 100, p_offset: 0 },
      );
      if (error) throw error;
      return privacyRightsRequestListSchema.parse(data);
    },
  });

export const useCreatePrivacyRightsRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePrivacyRightsRequest) => {
      const parsed = createPrivacyRightsRequestSchema.parse(input);
      const { data, error } = await privacyRightsRpcClient.rpc(
        "create_my_privacy_rights_request",
        {
          p_request_type: parsed.request_type,
          p_description: parsed.description,
        },
      );
      if (error) throw error;
      return privacyRightsRequestSchema.parse(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKey }),
  });
};

export const useCancelPrivacyRightsRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await privacyRightsRpcClient.rpc(
        "cancel_my_privacy_rights_request",
        { p_request_id: requestId },
      );
      if (error) throw error;
      return privacyRightsRequestSchema.parse(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKey }),
  });
};

export const useAdminPrivacyRightsRequests = (
  status: PrivacyRightsRequestStatus | null,
  requestType: PrivacyRightsRequestType | null,
) =>
  useQuery({
    queryKey: [...adminKey, status, requestType],
    queryFn: async () => {
      const { data, error } = await privacyRightsRpcClient.rpc(
        "admin_get_privacy_rights_requests",
        {
          p_status: status,
          p_request_type: requestType,
          p_limit: 200,
          p_offset: 0,
        },
      );
      if (error) throw error;
      return privacyRightsRequestListSchema.parse(data);
    },
  });

export const useAdminUpdatePrivacyRightsRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminUpdatePrivacyRightsRequest) => {
      const parsed = adminUpdatePrivacyRightsRequestSchema.parse(input);
      const { data, error } = await privacyRightsRpcClient.rpc(
        "admin_update_privacy_rights_request",
        {
          p_request_id: parsed.request_id,
          p_status: parsed.status,
          p_admin_notes: parsed.admin_notes,
        },
      );
      if (error) throw error;
      return privacyRightsRequestSchema.parse(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKey }),
  });
};
