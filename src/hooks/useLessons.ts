import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  lessonsResponseSchema,
  type LessonCompletionMode,
  type LessonContentKind,
} from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

export interface Lesson {
  id: string;
  title: string;
  description: string;
  durationMinutes: number | null;
  durationLabel: string;
  order: number;
  moduleId: string;
  completionMode: LessonCompletionMode;
  completionPercent: number | null;
  contentKind: LessonContentKind;
}

const formatDuration = (minutes: number | null): string =>
  minutes === null ? "Duração não informada" : `${minutes} min`;

export const useLessons = () =>
  useQuery({
    queryKey: ["lessons"],
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from("aulas")
        .select(
          "id,titulo,descricao,ordem,modulo_id,duracao,completion_mode,completion_percent,content_kind",
        )
        .order("ordem", { ascending: true });

      if (error) {
        throw error;
      }

      const lessons = parseDataContract(lessonsResponseSchema, data, "listagem de aulas");

      return lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.titulo,
        description: lesson.descricao ?? "",
        durationMinutes: lesson.duracao,
        durationLabel: formatDuration(lesson.duracao),
        order: lesson.ordem,
        moduleId: lesson.modulo_id,
        completionMode: lesson.completion_mode,
        completionPercent: lesson.completion_percent,
        contentKind: lesson.content_kind,
      }));
    },
  });
