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

interface AdminPrivacyRightsFilters {
  status: PrivacyRightsRequestStatus | null;
  requestType: PrivacyRightsRequestType | null;
  limit: number;
  offset: number;
}

const privacyRightsKeys = {
  all: ["privacy-rights-requests"] as const,
  student: (limit: number, offset: number) =>
    ["privacy-rights-requests", "student", limit, offset] as const,
  admin: (filters: AdminPrivacyRightsFilters) =>
    ["privacy-rights-requests", "admin", filters] as const,
};

export const useMyPrivacyRightsRequests = (limit = 10, offset = 0) =>
  useQuery({
    queryKey: privacyRightsKeys.student(limit, offset),
    queryFn: async () => {
      const { data, error } = await privacyRightsRpcClient.rpc(
        "get_my_privacy_rights_requests",
        { p_limit: limit, p_offset: offset },
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: privacyRightsKeys.all }),
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: privacyRightsKeys.all }),
  });
};

export const useAdminPrivacyRightsRequests = (input: {
  status: PrivacyRightsRequestStatus | null;
  requestType: PrivacyRightsRequestType | null;
  limit?: number;
  offset?: number;
}) => {
  const filters: AdminPrivacyRightsFilters = {
    status: input.status,
    requestType: input.requestType,
    limit: input.limit ?? 25,
    offset: input.offset ?? 0,
  };

  return useQuery({
    queryKey: privacyRightsKeys.admin(filters),
    queryFn: async () => {
      const { data, error } = await privacyRightsRpcClient.rpc(
        "admin_get_privacy_rights_requests",
        {
          p_status: filters.status,
          p_request_type: filters.requestType,
          p_limit: filters.limit,
          p_offset: filters.offset,
        },
      );
      if (error) throw error;
      return privacyRightsRequestListSchema.parse(data);
    },
  });
};

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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: privacyRightsKeys.all }),
  });
};
