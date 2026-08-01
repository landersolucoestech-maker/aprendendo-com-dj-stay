import {
  mySupportTicketsSchema,
  supportAdminDashboardSchema,
  supportMutationResultSchema,
  type MySupportTickets,
  type SupportAdminDashboard,
  type SupportMutationResult,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/contracts/support";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface RpcResult {
  data: Json | null;
  error: { message?: string } | null;
}

type SupportRpcClient = {
  rpc: (
    functionName:
      | "create_support_ticket"
      | "add_my_support_message"
      | "get_my_support_tickets"
      | "get_support_admin_dashboard"
      | "admin_reply_support_ticket",
    args: Record<string, unknown>,
  ) => PromiseLike<RpcResult>;
};

const client = supabase as unknown as SupportRpcClient;

const execute = async <T>(
  functionName: Parameters<SupportRpcClient["rpc"]>[0],
  args: Record<string, unknown>,
  parse: (value: unknown) => T,
): Promise<T> => {
  const { data, error } = await client.rpc(functionName, args);
  if (error) throw new Error(error.message ?? `Falha na RPC ${functionName}.`);
  return parse(data);
};

export const createSupportTicket = (input: {
  subject: string;
  category: string;
  priority: SupportTicketPriority;
  message: string;
  idempotencyKey: string;
}): Promise<SupportMutationResult> =>
  execute(
    "create_support_ticket",
    {
      p_subject: input.subject,
      p_category: input.category,
      p_priority: input.priority,
      p_message: input.message,
      p_idempotency_key: input.idempotencyKey,
    },
    (value) => supportMutationResultSchema.parse(value),
  );

export const addMySupportMessage = (input: {
  ticketId: string;
  message: string;
  idempotencyKey: string;
}): Promise<SupportMutationResult> =>
  execute(
    "add_my_support_message",
    {
      p_ticket_id: input.ticketId,
      p_message: input.message,
      p_idempotency_key: input.idempotencyKey,
    },
    (value) => supportMutationResultSchema.parse(value),
  );

export const getMySupportTickets = (input: {
  limit?: number;
  offset?: number;
} = {}): Promise<MySupportTickets> =>
  execute(
    "get_my_support_tickets",
    { p_limit: input.limit ?? 25, p_offset: input.offset ?? 0 },
    (value) => mySupportTicketsSchema.parse(value),
  );

export const getSupportAdminDashboard = (input: {
  status?: SupportTicketStatus | null;
  priority?: SupportTicketPriority | null;
  search?: string | null;
  limit?: number;
  offset?: number;
} = {}): Promise<SupportAdminDashboard> =>
  execute(
    "get_support_admin_dashboard",
    {
      p_status: input.status ?? null,
      p_priority: input.priority ?? null,
      p_search: input.search ?? null,
      p_limit: input.limit ?? 50,
      p_offset: input.offset ?? 0,
    },
    (value) => supportAdminDashboardSchema.parse(value),
  );

export const adminReplySupportTicket = (input: {
  ticketId: string;
  message: string;
  status: SupportTicketStatus;
  idempotencyKey: string;
}): Promise<SupportMutationResult> =>
  execute(
    "admin_reply_support_ticket",
    {
      p_ticket_id: input.ticketId,
      p_message: input.message,
      p_status: input.status,
      p_idempotency_key: input.idempotencyKey,
    },
    (value) => supportMutationResultSchema.parse(value),
  );
