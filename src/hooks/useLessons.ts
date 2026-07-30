import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { lessonsResponseSchema } from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string | null;
  order: number;
  moduleId: string;
  durationMinutes: number | null;
  durationLabel: string | null;
}

const formatDuration = (minutes: number | null): string | null =>
  minutes === null ? null : `${minutes} min`;

export const useLessons = () =>
  useQuery({
    queryKey: ["lessons"],
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from("aulas")
        .select("id,titulo,descricao,video,ordem,modulo_id,duracao")
        .order("ordem", { ascending: true });

      if (error) {
        throw error;
      }

      const lessons = parseDataContract(lessonsResponseSchema, data, "listagem de aulas");

      return lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.titulo,
        description: lesson.descricao,
        videoUrl: lesson.video,
        order: lesson.ordem,
        moduleId: lesson.modulo_id,
        durationMinutes: lesson.duracao,
        durationLabel: formatDuration(lesson.duracao),
      }));
    },
  });
