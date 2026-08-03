import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{
  data: Json | null;
  error: unknown | null;
}>;

type PaymentAnalyticsRpcClient = {
  rpc: (
    functionName: "get_payment_admin_analytics",
    args: {
      p_start_at?: string | null;
      p_end_at?: string | null;
      p_top_limit?: number;
    },
  ) => RpcResponse;
};

export const paymentAnalyticsRpcClient =
  supabase as unknown as PaymentAnalyticsRpcClient;
