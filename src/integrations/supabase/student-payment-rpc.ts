import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{
  data: Json | null;
  error: unknown | null;
}>;

type StudentPaymentRpcClient = {
  rpc: (
    functionName: "get_my_payment_history",
    args: {
      p_limit?: number;
      p_offset?: number;
    },
  ) => RpcResponse;
};

export const studentPaymentRpcClient =
  supabase as unknown as StudentPaymentRpcClient;
