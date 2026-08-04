import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { studentProgressSummarySchema } from "@/contracts/student-progress-summary";
import { supabase } from "@/integrations/supabase/client";

export const useStudentProgressSummary = () =>
  useQuery({
    queryKey: ["student-progress-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_student_progress_summary",
      );

      if (error) throw error;

      return parseDataContract(
        studentProgressSummarySchema,
        data,
        "resumo acadêmico do aluno",
      );
    },
    staleTime: 30_000,
  });
