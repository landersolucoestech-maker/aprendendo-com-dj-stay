import { useMutation } from "@tanstack/react-query";

import {
  hostedCheckoutInputSchema,
  hostedCheckoutResultSchema,
  type HostedCheckoutInput,
  type HostedCheckoutResult,
} from "@/contracts/checkout";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAffiliateVisitorToken } from "@/lib/affiliate-attribution";

const checkoutStorageKey = (
  subjectType: HostedCheckoutInput["subjectType"],
  subjectId: string,
  licenseId: string | null,
): string => `hosted-checkout:${subjectType}:${subjectId}:${licenseId ?? "none"}`;

export const getHostedCheckoutIdempotencyKey = (
  subjectType: HostedCheckoutInput["subjectType"],
  subjectId: string,
  licenseId: string | null,
): string => {
  const storageKey = checkoutStorageKey(subjectType, subjectId, licenseId);
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const idempotencyKey = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, idempotencyKey);
  return idempotencyKey;
};

export const clearHostedCheckoutIdempotencyKey = (
  subjectType: HostedCheckoutInput["subjectType"],
  subjectId: string,
  licenseId: string | null,
): void => {
  window.sessionStorage.removeItem(checkoutStorageKey(subjectType, subjectId, licenseId));
};

export const useHostedCheckout = () =>
  useMutation({
    mutationFn: async (input: HostedCheckoutInput): Promise<HostedCheckoutResult> => {
      const value = parseDataContract(
        hostedCheckoutInputSchema,
        input,
        "solicitação de checkout hospedado",
      );

      const { error: attributionError } = await supabase.rpc(
        "prepare_checkout_intent_with_attribution",
        {
          p_subject_type: value.subjectType,
          p_subject_id: value.subjectId,
          p_license_id: value.licenseId,
          p_idempotency_key: value.idempotencyKey,
          p_affiliate_visitor_token: getStoredAffiliateVisitorToken(),
        },
      );
      if (attributionError) throw attributionError;

      const { data, error } = await supabase.functions.invoke("create-asaas-checkout", {
        body: value,
      });

      if (error) throw error;
      return parseDataContract(
        hostedCheckoutResultSchema,
        data,
        "resposta do checkout hospedado",
      );
    },
  });
