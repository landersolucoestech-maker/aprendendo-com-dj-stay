import { useQuery } from "@tanstack/react-query";

import { paymentAdminAnalyticsSchema } from "@/contracts/payment-analytics";
import { parseDataContract } from "@/contracts/contract-error";
import { paymentAnalyticsRpcClient } from "@/integrations/supabase/payment-analytics-rpc";

export type PaymentAnalyticsQuery = {
  readonly startAt: string;
  readonly endAt: string;
  readonly topLimit?: number;
};

export const usePaymentAdminAnalytics = ({
  startAt,
  endAt,
  topLimit = 10,
}: PaymentAnalyticsQuery) =>
  useQuery({
    queryKey: ["payment-admin-analytics", startAt, endAt, topLimit],
    queryFn: async () => {
      const { data, error } = await paymentAnalyticsRpcClient.rpc(
        "get_payment_admin_analytics",
        {
          p_start_at: startAt,
          p_end_at: endAt,
          p_top_limit: topLimit,
        },
      );
      if (error) throw error;
      return parseDataContract(
        paymentAdminAnalyticsSchema,
        data,
        "analytics financeiro administrativo",
      );
    },
  });
