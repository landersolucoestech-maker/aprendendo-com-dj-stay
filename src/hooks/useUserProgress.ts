import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseDataContract } from "@/contracts/contract-error";
import {
  progressResponseSchema,
  progressRowSchema,
  progressUpdateInputSchema,
  type ProgressRow,
  type ProgressUpdateInput,
} from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

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

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProgressUpdateInput): Promise<UserProgress> => {
      const validatedInput = parseDataContract(
        progressUpdateInputSchema,
        input,
        "parâmetros de atualização de progresso",
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("progresso_aulas")
        .upsert(
          {
            user_id: user.id,
            aula_id: validatedInput.aulaId,
            completada: validatedInput.completada,
            progresso_percentual: validatedInput.progressoPercentual,
            tempo_assistido: validatedInput.tempoAssistido,
            ultima_visualizacao: new Date().toISOString(),
          },
          { onConflict: "user_id,aula_id" },
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return parseDataContract(progressRowSchema, data, "atualização de progresso");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-progress"] });
      await queryClient.invalidateQueries({ queryKey: ["recent-activities"] });
    },
  });
};
