import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { recentProgressResponseSchema } from "@/contracts/learning";
import {
  normalizeRecentActivityLimit,
  toRecentActivities,
  type RecentActivity,
} from "@/lib/recent-activities";
import { supabase } from "@/integrations/supabase/client";

export type { RecentActivity } from "@/lib/recent-activities";

export const useRecentActivities = (limit = 10) => {
  const normalizedLimit = normalizeRecentActivityLimit(limit);

  return useQuery({
    queryKey: ["recent-activities", normalizedLimit],
    queryFn: async (): Promise<RecentActivity[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("progresso_aulas")
        .select("*,aulas(titulo,modulo_id,modulos(titulo))")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(normalizedLimit);

      if (error) {
        throw error;
      }

      const progressRows = parseDataContract(
        recentProgressResponseSchema,
        data,
        "atividades recentes",
      );

      return toRecentActivities(progressRows);
    },
  });
};
