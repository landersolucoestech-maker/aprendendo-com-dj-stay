import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{ data: Json | null; error: unknown | null }>;

type StudentNotificationRpcClient = {
  rpc: (
    functionName:
      | "get_my_student_notifications"
      | "mark_my_student_notification_read"
      | "mark_all_my_student_notifications_read",
    args?: {
      p_limit?: number;
      p_offset?: number;
      p_notification_id?: string;
    },
  ) => RpcResponse;
};

export const studentNotificationRpcClient =
  supabase as unknown as StudentNotificationRpcClient;
