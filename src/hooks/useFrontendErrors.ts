import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  frontendErrorDashboardSchema,
  frontendErrorMaintenanceHistorySchema,
  frontendErrorRetentionResultSchema,
  frontendErrorStatusUpdateResultSchema,
  type FrontendErrorSource,
  type FrontendErrorStatus,
} from "@/contracts/frontend-errors";
import { parseDataContract } from "@/contracts/contract-error";
import { frontendErrorRpcClient } from "@/integrations/supabase/frontend-error-rpc";

const frontendErrorKeys = {
  all: ["frontend-errors"] as const,
  admin: (
    status: FrontendErrorStatus | null,
    source: FrontendErrorSource | null,
    route: string,
  ) => ["frontend-errors", "admin", status, source, route] as const,
  maintenance: (limit: number, offset: number) =>
    ["frontend-errors", "maintenance", limit, offset] as const,
};

export const useFrontendErrorDashboard = (
  status: FrontendErrorStatus | null,
  source: FrontendErrorSource | null,
  route: string,
) =>
  useQuery({
    queryKey: frontendErrorKeys.admin(status, source, route),
    queryFn: async () => {
      const normalizedRoute = route.trim();
      const { data, error } = await frontendErrorRpcClient.rpc(
        "get_frontend_error_dashboard",
        {
          ...(status === null ? {} : { p_status: status }),
          ...(source === null ? {} : { p_source: source }),
          ...(normalizedRoute ? { p_route: normalizedRoute } : {}),
          p_limit: 100,
          p_offset: 0,
        },
      );
      if (error) throw error;
      return parseDataContract(
        frontendErrorDashboardSchema,
        data,
        "painel administrativo de erros do frontend",
      );
    },
  });

export const useFrontendErrorMaintenanceHistory = (
  limit = 20,
  offset = 0,
) =>
  useQuery({
    queryKey: frontendErrorKeys.maintenance(limit, offset),
    queryFn: async () => {
      const { data, error } = await frontendErrorRpcClient.rpc(
        "get_frontend_error_maintenance_history",
        { p_limit: limit, p_offset: offset },
      );
      if (error) throw error;
      return parseDataContract(
        frontendErrorMaintenanceHistorySchema,
        data,
        "histórico de manutenção dos erros do frontend",
      );
    },
  });

export const useUpdateFrontendErrorStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      frontendErrorId: string;
      status: FrontendErrorStatus;
      note: string | null;
    }) => {
      const normalizedNote = input.note?.trim();
      const { data, error } = await frontendErrorRpcClient.rpc(
        "update_frontend_error_status",
        {
          p_frontend_error_id: input.frontendErrorId,
          p_status: input.status,
          ...(normalizedNote ? { p_note: normalizedNote } : {}),
        },
      );
      if (error) throw error;
      return parseDataContract(
        frontendErrorStatusUpdateResultSchema,
        data,
        "atualização de erro do frontend",
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: frontendErrorKeys.all });
    },
  });
};

export const usePurgeFrontendErrors = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      retentionDays: number;
      batchLimit?: number;
    }) => {
      const { data, error } = await frontendErrorRpcClient.rpc(
        "purge_frontend_error_events",
        {
          p_retention_days: input.retentionDays,
          p_limit: input.batchLimit ?? 1000,
        },
      );
      if (error) throw error;
      return parseDataContract(
        frontendErrorRetentionResultSchema,
        data,
        "retenção de erros do frontend",
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: frontendErrorKeys.all });
    },
  });
};
