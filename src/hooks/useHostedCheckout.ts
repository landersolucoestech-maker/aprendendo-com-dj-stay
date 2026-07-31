import { useMutation } from "@tanstack/react-query";

import {
  hostedCheckoutInputSchema,
  hostedCheckoutResultSchema,
  type HostedCheckoutInput,
  type HostedCheckoutResult,
} from "@/contracts/checkout";
import { parseDataContract } from "@/contracts/contract-error";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
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

type GeneratedAttributionArgs =
  Database["public"]["Functions"]["prepare_checkout_intent_with_attribution"]["Args"];

type NullableLicenseAttributionArgs = Omit<GeneratedAttributionArgs, "p_license_id"> & {
  p_license_id: string | null;
};

export const useHostedCheckout = () =>
  useMutation({
    mutationFn: async (input: HostedCheckoutInput): Promise<HostedCheckoutResult> => {
      const value = parseDataContract(
        hostedCheckoutInputSchema,
        input,
        "solicitação de checkout hospedado",
      );
      const affiliateVisitorToken = getStoredAffiliateVisitorToken();
      const attributionArgs: NullableLicenseAttributionArgs = {
        p_subject_type: value.subjectType,
        p_subject_id: value.subjectId,
        p_license_id: value.licenseId,
        p_idempotency_key: value.idempotencyKey,
        ...(affiliateVisitorToken
          ? { p_affiliate_visitor_token: affiliateVisitorToken }
          : {}),
      };

      // PostgreSQL aceita NULL para o UUID da licença; o gerador de tipos não
      // representa nulabilidade de argumentos sem DEFAULT. A adaptação fica
      // restrita a esta fronteira e preserva a assinatura pública existente.
      const { error: attributionError } = await supabase.rpc(
        "prepare_checkout_intent_with_attribution",
        attributionArgs as unknown as GeneratedAttributionArgs,
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
