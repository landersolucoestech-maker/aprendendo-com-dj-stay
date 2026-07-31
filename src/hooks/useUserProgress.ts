import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  lessonProgressEventInputSchema,
  progressResponseSchema,
  progressRowSchema,
  type LessonProgressEventInput,
  type ProgressRow,
} from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";
import { publishLessonProgressUpdate } from "@/lib/lesson-progress-client";

export type UserProgress = ProgressRow;

export const useUserProgress = () =>
  useQuery({
    queryKey: ["user-progress"],
    queryFn: async (): Promise<UserProgress[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("progresso_aulas")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      return parseDataContract(progressResponseSchema, data, "progresso do aluno");
    },
  });

export const useSaveLessonProgressEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LessonProgressEventInput): Promise<UserProgress> => {
      const validatedInput = parseDataContract(
        lessonProgressEventInputSchema,
        input,
        "evento de progresso da aula",
      );

      const { data, error } = await supabase.rpc("save_lesson_progress_event", {
        p_lesson_id: validatedInput.lessonId,
        p_event_id: validatedInput.eventId,
        p_client_instance_id: validatedInput.clientInstanceId,
        p_event_sequence: validatedInput.eventSequence,
        p_event_type: validatedInput.eventType,
        p_position_seconds: validatedInput.positionSeconds,
        p_duration_seconds: validatedInput.durationSeconds,
        p_observed_at: validatedInput.observedAt,
      });

      if (error) {
        throw error;
      }

      return parseDataContract(progressRowSchema, data, "resultado do evento de progresso");
    },
    onSuccess: async (progress) => {
      queryClient.setQueryData<UserProgress[]>(["user-progress"], (current) => {
        if (current === undefined) {
          return [progress];
        }

        const existingIndex = current.findIndex((item) => item.aula_id === progress.aula_id);
        if (existingIndex === -1) {
          return [...current, progress];
        }

        return current.map((item, index) => (index === existingIndex ? progress : item));
      });

      publishLessonProgressUpdate({ lessonId: progress.aula_id, revision: progress.revision });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-progress"] }),
        queryClient.invalidateQueries({ queryKey: ["recent-activities"] }),
        queryClient.invalidateQueries({ queryKey: ["modules"] }),
      ]);
    },
  });
};
