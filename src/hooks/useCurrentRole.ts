import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/use-auth";
import { parseDataContract } from "@/contracts/contract-error";
import { userRoleRowSchema, type UserRoleRow } from "@/contracts/authorization";
import { supabase } from "@/integrations/supabase/client";

export const useCurrentRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async (): Promise<UserRoleRow> => {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id,role,created_at,updated_at")
        .eq("user_id", user.id)
        .single();

      if (error) {
        throw error;
      }

      return parseDataContract(userRoleRowSchema, data, "papel do usuário autenticado");
    },
    enabled: user !== null,
    staleTime: 5 * 60 * 1000,
  });
};
