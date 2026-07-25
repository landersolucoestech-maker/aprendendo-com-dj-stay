import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, TicketStatus } from "@/lib/platform";

export function useSupportTickets(scope: "mine" | "staff" = "mine") {
  return useQuery({
    queryKey: ["support-tickets", scope],
    queryFn: async () => {
      let query = db.from("support_tickets").select(`
        id,ticket_number,subject,category,priority,status,assigned_to,last_message_at,created_at,updated_at,
        profiles!support_tickets_user_id_fkey(id,full_name,avatar_url),
        courses(id,title),orders(id,order_number)
      `).order("last_message_at", { ascending: false });
      if (scope === "mine") {
        const { data: authData } = await db.auth.getUser();
        query = query.eq("user_id", authData.user?.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSupportTicket(ticketId?: string) {
  return useQuery({
    queryKey: ["support-ticket", ticketId],
    enabled: Boolean(ticketId),
    queryFn: async () => {
      const { data: ticket, error } = await db.from("support_tickets").select(`
        *,profiles!support_tickets_user_id_fkey(id,full_name,avatar_url),courses(id,title),orders(id,order_number)
      `).eq("id", ticketId).single();
      if (error) throw error;
      const { data: messages, error: messagesError } = await db.from("support_messages").select(`
        id,body,is_internal,created_at,edited_at,sender_id,
        profiles!support_messages_sender_id_fkey(id,full_name,avatar_url),
        support_attachments(id,file_name,mime_type,file_size_bytes,storage_path)
      `).eq("ticket_id", ticketId).order("created_at", { ascending: true });
      if (messagesError) throw messagesError;
      return { ...ticket, messages: messages ?? [] };
    },
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      message: string;
      category?: string;
      priority?: "low" | "normal" | "high" | "urgent";
      courseId?: string;
      orderId?: string;
    }) => {
      const { data, error } = await db.rpc("create_support_ticket", {
        target_subject: input.subject,
        target_message: input.message,
        target_category: input.category ?? "general",
        target_priority: input.priority ?? "normal",
        target_course_id: input.courseId ?? null,
        target_order_id: input.orderId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });
}

export function useReplySupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, message, internal = false }: { ticketId: string; message: string; internal?: boolean }) => {
      const { data, error } = await db.rpc("reply_support_ticket", {
        target_ticket_id: ticketId,
        target_message: message,
        target_internal: internal,
      });
      if (error) throw error;
      return { data, ticketId };
    },
    onSuccess: ({ ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status, assignee }: { ticketId: string; status: TicketStatus; assignee?: string }) => {
      const { data, error } = await db.rpc("update_ticket_status", {
        target_ticket_id: ticketId,
        target_status: status,
        target_assignee: assignee ?? null,
      });
      if (error) throw error;
      return { data, ticketId };
    },
    onSuccess: ({ ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}
