import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/contracts/support";
import {
  addMySupportMessage,
  adminReplySupportTicket,
  createSupportTicket,
  getMySupportTickets,
  getSupportAdminDashboard,
} from "@/integrations/supabase/support-rpc";

export const supportQueryKeys = {
  mine: (limit: number, offset: number) => ["support", "mine", limit, offset] as const,
  admin: (filters: {
    status?: SupportTicketStatus | null;
    priority?: SupportTicketPriority | null;
    search?: string | null;
    limit: number;
    offset: number;
  }) => ["support", "admin", filters] as const,
};

export const useMySupportTickets = (limit = 25, offset = 0) =>
  useQuery({
    queryKey: supportQueryKeys.mine(limit, offset),
    queryFn: () => getMySupportTickets({ limit, offset }),
  });

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support", "mine"] });
    },
  });
};

export const useAddMySupportMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addMySupportMessage,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support", "mine"] });
      await queryClient.invalidateQueries({ queryKey: ["support", "admin"] });
    },
  });
};

export const useSupportAdminDashboard = (filters: {
  status?: SupportTicketStatus | null;
  priority?: SupportTicketPriority | null;
  search?: string | null;
  limit?: number;
  offset?: number;
} = {}) => {
  const normalized = {
    status: filters.status ?? null,
    priority: filters.priority ?? null,
    search: filters.search ?? null,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  };
  return useQuery({
    queryKey: supportQueryKeys.admin(normalized),
    queryFn: () => getSupportAdminDashboard(normalized),
  });
};

export const useAdminReplySupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminReplySupportTicket,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support", "admin"] });
      await queryClient.invalidateQueries({ queryKey: ["support", "mine"] });
    },
  });
};
