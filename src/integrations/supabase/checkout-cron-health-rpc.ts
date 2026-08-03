import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type RpcResponse = PromiseLike<{
  data: Json | null;
  error: unknown | null;
}>;

type CheckoutCronHealthRpcClient = {
  rpc: (
    functionName: "get_checkout_expiration_cron_health",
    args: {
      p_run_limit?: number;
    },
  ) => RpcResponse;
};

export const checkoutCronHealthRpcClient =
  supabase as unknown as CheckoutCronHealthRpcClient;
