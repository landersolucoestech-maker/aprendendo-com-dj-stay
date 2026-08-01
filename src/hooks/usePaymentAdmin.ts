import { useQuery } from "@tanstack/react-query";

import {
  paymentAdminDashboardSchema,
  type CheckoutSubjectType,
  type PaymentOrderStatus,
} from "@/contracts/payment-admin";
import { parseDataContract } from "@/contracts/contract-error";
import { paymentAdminRpcClient } from "@/integrations/supabase/payment-admin-rpc";

export const usePaymentAdminDashboard = (input: {
  status: PaymentOrderStatus | null;
  subjectType: CheckoutSubjectType | null;
  search: string;
  page: number;
  pageSize?: number;
}) => {
  const pageSize = input.pageSize ?? 50;
  return useQuery({
    queryKey: [
      "payment-admin-dashboard",
      input.status,
      input.subjectType,
      input.search,
      input.page,
      pageSize,
    ],
    queryFn: async () => {
      const normalizedSearch = input.search.trim();
      const { data, error } = await paymentAdminRpcClient.rpc(
        "get_payment_admin_dashboard",
        {
          ...(input.status === null ? {} : { p_status: input.status }),
          ...(input.subjectType === null
            ? {}
            : { p_subject_type: input.subjectType }),
          ...(normalizedSearch ? { p_search: normalizedSearch } : {}),
          p_limit: pageSize,
          p_offset: input.page * pageSize,
        },
      );
      if (error) throw error;
      return parseDataContract(
        paymentAdminDashboardSchema,
        data,
        "painel administrativo de pedidos e pagamentos",
      );
    },
  });
};
