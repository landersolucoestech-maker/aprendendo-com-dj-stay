import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { studentPaymentHistorySchema } from "@/contracts/student-payments";
import { studentPaymentRpcClient } from "@/integrations/supabase/student-payment-rpc";

const normalizePaymentHistoryPage = (value: number): number =>
  Math.max(0, Math.trunc(value));

const normalizePaymentHistoryPageSize = (value: number): number =>
  Math.min(100, Math.max(1, Math.trunc(value)));

export const useStudentPaymentHistory = (page = 0, pageSize = 50) => {
  const normalizedPage = normalizePaymentHistoryPage(page);
  const normalizedPageSize = normalizePaymentHistoryPageSize(pageSize);

  return useQuery({
    queryKey: ["student-payment-history", normalizedPage, normalizedPageSize],
    queryFn: async () => {
      const { data, error } = await studentPaymentRpcClient.rpc(
        "get_my_payment_history",
        {
          p_limit: normalizedPageSize,
          p_offset: normalizedPage * normalizedPageSize,
        },
      );
      if (error) throw error;
      return parseDataContract(
        studentPaymentHistorySchema,
        data,
        "histórico de pedidos e pagamentos do aluno",
      );
    },
  });
};
