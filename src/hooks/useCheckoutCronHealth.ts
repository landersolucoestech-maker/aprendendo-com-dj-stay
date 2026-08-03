import { useQuery } from "@tanstack/react-query";

import { checkoutCronHealthSchema } from "@/contracts/checkout-cron-health";
import { parseDataContract } from "@/contracts/contract-error";
import { checkoutCronHealthRpcClient } from "@/integrations/supabase/checkout-cron-health-rpc";

export const useCheckoutCronHealth = (runLimit = 8) =>
  useQuery({
    queryKey: ["checkout-expiration-cron-health", runLimit],
    queryFn: async () => {
      const { data, error } = await checkoutCronHealthRpcClient.rpc(
        "get_checkout_expiration_cron_health",
        { p_run_limit: runLimit },
      );
      if (error) throw error;
      return parseDataContract(
        checkoutCronHealthSchema,
        data,
        "saúde do cron de expiração de checkout",
      );
    },
  });
