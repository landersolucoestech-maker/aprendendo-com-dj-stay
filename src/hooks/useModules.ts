import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { modulesResponseSchema } from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";
import type { LearningModule } from "@/lib/course-progress";

export type { LearningModule, ModuleLesson } from "@/lib/course-progress";

const formatDuration = (minutes: number | null): string | null =>
  minutes === null ? null : `${minutes} min`;

export const useModules = (courseId?: string, enabled = true) =>
  useQuery({
    queryKey: ["modules", courseId ?? "all"],
    queryFn: async (): Promise<LearningModule[]> => {
      let query = supabase
        .from("modulos")
        .select("id,titulo,descricao,ordem,aulas(id,titulo,descricao,ordem,duracao)")
        .order("ordem", { ascending: true })
        .order("ordem", { foreignTable: "aulas", ascending: true });

      if (courseId !== undefined) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const modules = parseDataContract(modulesResponseSchema, data, "listagem de módulos");

      return modules.map((module) => ({
        id: module.id,
        title: module.titulo,
        description: module.descricao,
        order: module.ordem,
        lessons: module.aulas.map((lesson) => ({
          id: lesson.id,
          title: lesson.titulo,
          description: lesson.descricao,
          durationMinutes: lesson.duracao,
          durationLabel: formatDuration(lesson.duracao),
          order: lesson.ordem,
        })),
      }));
    },
    enabled,
  });
