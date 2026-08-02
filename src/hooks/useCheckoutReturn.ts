import { useQuery } from "@tanstack/react-query";

import {
  checkoutIntentIdSchema,
  checkoutReturnSchema,
} from "@/contracts/checkout-return";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";
import { shouldPollCheckoutReturn } from "@/lib/checkout-return";

export const checkoutReturnQueryKey = (checkoutIntentId: string | null) =>
  ["checkout-return", checkoutIntentId] as const;

export const useCheckoutReturn = (checkoutIntentId: string | null) => {
  const parsedId = checkoutIntentIdSchema.safeParse(checkoutIntentId);
  const validId = parsedId.success ? parsedId.data : null;

  return useQuery({
    queryKey: checkoutReturnQueryKey(validId),
    enabled: validId !== null,
    queryFn: async () => {
      if (validId === null) throw new Error("CHECKOUT_INTENT_ID_INVALID");

      const { data, error } = await supabase.rpc("get_my_checkout_return", {
        p_checkout_intent_id: validId,
      });
      if (error) throw error;

      return parseDataContract(
        checkoutReturnSchema,
        data,
        "retorno financeiro do checkout",
      );
    },
    refetchInterval: (query) => {
      const current = query.state.data;
      return current?.found && shouldPollCheckoutReturn(current) ? 3_000 : false;
    },
  });
};
