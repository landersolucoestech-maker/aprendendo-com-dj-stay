import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { studentPaymentHistorySchema } from "@/contracts/student-payments";
import { studentPaymentRpcClient } from "@/integrations/supabase/student-payment-rpc";

export const useStudentPaymentHistory = (page = 0, pageSize = 50) =>
  useQuery({
    queryKey: ["student-payment-history", page, pageSize],
    queryFn: async () => {
      const { data, error } = await studentPaymentRpcClient.rpc(
        "get_my_payment_history",
        {
          p_limit: pageSize,
          p_offset: page * pageSize,
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
