import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { studentActivityHistoryResponseSchema } from "@/contracts/student-activity-history";
import { supabase } from "@/integrations/supabase/client";
import {
  toRecentActivities,
  type RecentActivity,
} from "@/lib/recent-activities";

const normalizeActivityHistoryPage = (value: number): number =>
  Math.max(0, Math.trunc(value));

const normalizeActivityHistoryPageSize = (value: number): number =>
  Math.min(100, Math.max(1, Math.trunc(value)));

interface StudentActivityHistory {
  readonly total: number;
  readonly activities: RecentActivity[];
}

export const useStudentActivityHistory = (page = 0, pageSize = 20) => {
  const normalizedPage = normalizeActivityHistoryPage(page);
  const normalizedPageSize = normalizeActivityHistoryPageSize(pageSize);
  const offset = normalizedPage * normalizedPageSize;

  return useQuery({
    queryKey: ["student-activity-history", normalizedPage, normalizedPageSize],
    queryFn: async (): Promise<StudentActivityHistory> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error, count } = await supabase
        .from("progresso_aulas")
        .select("*,aulas(titulo,modulo_id,modulos(titulo))", {
          count: "exact",
        })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + normalizedPageSize - 1);

      if (error) {
        throw error;
      }

      const response = parseDataContract(
        studentActivityHistoryResponseSchema,
        { total: count ?? 0, rows: data },
        "histórico paginado de atividades do aluno",
      );

      return {
        total: response.total,
        activities: toRecentActivities(response.rows),
      };
    },
    placeholderData: (previousData) => previousData,
  });
};
