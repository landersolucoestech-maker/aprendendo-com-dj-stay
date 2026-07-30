import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { modulesResponseSchema } from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleLesson {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  durationLabel: string | null;
  order: number;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: ModuleLesson[];
}

const formatDuration = (minutes: number | null): string | null =>
  minutes === null ? null : `${minutes} min`;

export const useModules = () =>
  useQuery({
    queryKey: ["modules"],
    queryFn: async (): Promise<LearningModule[]> => {
      const { data, error } = await supabase
        .from("modulos")
        .select("id,titulo,descricao,ordem,aulas(id,titulo,descricao,ordem,duracao)")
        .order("ordem", { ascending: true })
        .order("ordem", { foreignTable: "aulas", ascending: true });

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
  });
