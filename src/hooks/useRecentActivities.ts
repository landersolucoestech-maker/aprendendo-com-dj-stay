import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { recentProgressResponseSchema } from "@/contracts/learning";
import { formatAppRelativeTime } from "@/lib/date-time";
import { supabase } from "@/integrations/supabase/client";

export interface RecentActivity {
  id: string;
  activity: string;
  time: string;
  type: "lesson_completed" | "lesson_started";
  updatedAt: string;
  lessonTitle: string;
  moduleTitle: string;
  progressPercent: number;
  completed: boolean;
}

const formatRelativeTime = (timestamp: string): string =>
  formatAppRelativeTime(timestamp);

export const useRecentActivities = (limit = 10) => {
  const normalizedLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

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

      return progressRows.map((progress) => {
        const lessonTitle = progress.aulas.titulo;
        const moduleTitle = progress.aulas.modulos.titulo;
        const activity = progress.completada
          ? `Completou "${lessonTitle}" em ${moduleTitle}`
          : progress.progresso_percentual > 0
            ? `Assistiu ${progress.progresso_percentual}% de "${lessonTitle}"`
            : `Iniciou "${lessonTitle}" em ${moduleTitle}`;

        return {
          id: progress.id,
          activity,
          time: formatRelativeTime(progress.updated_at),
          type: progress.completada ? "lesson_completed" : "lesson_started",
          updatedAt: progress.updated_at,
          lessonTitle,
          moduleTitle,
          progressPercent: progress.progresso_percentual,
          completed: progress.completada,
        };
      });
    },
  });
};
