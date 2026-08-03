import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  contactAdminDashboardSchema,
  contactStatusUpdateInputSchema,
  contactStatusUpdateResultSchema,
  contactSubmissionInputSchema,
  contactSubmissionResultSchema,
  type ContactMessageStatus,
  type ContactSubmissionInput,
} from "@/contracts/contact-messages";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";

interface ContactAdminFilters {
  status: ContactMessageStatus | null;
  search: string;
  limit: number;
  offset: number;
}

const contactKeys = {
  all: ["contact-messages"] as const,
  admin: (filters: ContactAdminFilters) =>
    ["contact-messages", "admin", filters] as const,
};

export const useSubmitContactMessage = () =>
  useMutation({
    mutationFn: async (input: ContactSubmissionInput) => {
      const value = parseDataContract(
        contactSubmissionInputSchema,
        input,
        "solicitação de contato",
      );
      const { data, error } = await supabase.rpc("submit_contact_message", {
        p_name: value.name,
        p_email: value.email,
        p_subject: value.subject,
        p_message: value.message,
        p_idempotency_key: value.idempotencyKey,
      });
      if (error) throw error;
      return parseDataContract(
        contactSubmissionResultSchema,
        data,
        "confirmação persistida do contato",
      );
    },
  });

export const useContactMessagesAdmin = (input: {
  status: ContactMessageStatus | null;
  search: string;
  limit?: number;
  offset?: number;
}) => {
  const filters: ContactAdminFilters = {
    status: input.status,
    search: input.search.trim(),
    limit: input.limit ?? 25,
    offset: input.offset ?? 0,
  };

  return useQuery({
    queryKey: contactKeys.admin(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_contact_messages_admin", {
        ...(filters.status === null ? {} : { p_status: filters.status }),
        ...(filters.search ? { p_search: filters.search } : {}),
        p_limit: filters.limit,
        p_offset: filters.offset,
      });
      if (error) throw error;
      return parseDataContract(
        contactAdminDashboardSchema,
        data,
        "caixa administrativa de contatos",
      );
    },
  });
};

export const useUpdateContactMessageStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contactMessageId: string;
      status: ContactMessageStatus;
      note: string | null;
    }) => {
      const normalizedNote = input.note?.trim() || null;
      const value = parseDataContract(
        contactStatusUpdateInputSchema,
        { ...input, note: normalizedNote },
        "alteração do status do contato",
      );
      const { data, error } = await supabase.rpc("update_contact_message_status", {
        p_contact_message_id: value.contactMessageId,
        p_status: value.status,
        ...(value.note ? { p_note: value.note } : {}),
      });
      if (error) throw error;
      return parseDataContract(
        contactStatusUpdateResultSchema,
        data,
        "atualização do contato",
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
};
