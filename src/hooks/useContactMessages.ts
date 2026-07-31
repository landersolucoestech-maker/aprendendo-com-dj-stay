import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  contactAdminDashboardSchema,
  contactStatusUpdateResultSchema,
  contactSubmissionInputSchema,
  contactSubmissionResultSchema,
  type ContactMessageStatus,
  type ContactSubmissionInput,
} from "@/contracts/contact-messages";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";

const contactKeys = {
  all: ["contact-messages"] as const,
  admin: (status: ContactMessageStatus | null, search: string) =>
    ["contact-messages", "admin", status, search] as const,
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

export const useContactMessagesAdmin = (
  status: ContactMessageStatus | null,
  search: string,
) =>
  useQuery({
    queryKey: contactKeys.admin(status, search),
    queryFn: async () => {
      const normalizedSearch = search.trim();
      const { data, error } = await supabase.rpc("get_contact_messages_admin", {
        ...(status === null ? {} : { p_status: status }),
        ...(normalizedSearch ? { p_search: normalizedSearch } : {}),
        p_limit: 100,
        p_offset: 0,
      });
      if (error) throw error;
      return parseDataContract(
        contactAdminDashboardSchema,
        data,
        "caixa administrativa de contatos",
      );
    },
  });

export const useUpdateContactMessageStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contactMessageId: string;
      status: ContactMessageStatus;
      note: string | null;
    }) => {
      const normalizedNote = input.note?.trim();
      const { data, error } = await supabase.rpc("update_contact_message_status", {
        p_contact_message_id: input.contactMessageId,
        p_status: input.status,
        ...(normalizedNote ? { p_note: normalizedNote } : {}),
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
