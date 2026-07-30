import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  avatarUpdateInputSchema,
  userProfileSchema,
  type UserProfileRow,
} from "@/contracts/learning";
import { supabase } from "@/integrations/supabase/client";

export type UserProfile = UserProfileRow;

export const useUserProfile = () =>
  useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data === null ? null : parseDataContract(userProfileSchema, data, "perfil do aluno");
    },
  });

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { avatarUrl: string | null }): Promise<UserProfile> => {
      const validatedInput = parseDataContract(
        avatarUpdateInputSchema,
        input,
        "parâmetros de atualização do avatar",
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert({ user_id: user.id, avatar_url: validatedInput.avatarUrl }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return parseDataContract(userProfileSchema, data, "atualização de perfil");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
};
