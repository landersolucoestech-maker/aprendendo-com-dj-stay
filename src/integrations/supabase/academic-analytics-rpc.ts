import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{
  data: Json | null;
  error: unknown | null;
}>;

type AcademicAnalyticsRpcClient = {
  rpc: (
    functionName: "get_academic_admin_analytics",
    args: {
      p_start_at?: string | null;
      p_end_at?: string | null;
      p_course_id?: string | null;
      p_inactive_days?: number;
    },
  ) => RpcResponse;
};

export const academicAnalyticsRpcClient =
  supabase as unknown as AcademicAnalyticsRpcClient;
