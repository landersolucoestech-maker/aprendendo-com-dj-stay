import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/use-auth";
import { parseDataContract } from "@/contracts/contract-error";
import { assetRowsSchema, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";

const STUDENT_MATERIAL_PURPOSES = [
  "document",
  "sample",
  "preset",
  "stem",
  "project",
  "archive",
  "template",
  "support_file",
] as const;

export const useStudentLibrary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["student-library", user?.id ?? null],
    queryFn: async (): Promise<AssetRow[]> => {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("state", "published")
        .is("deleted_at", null)
        .in("purpose", [...STUDENT_MATERIAL_PURPOSES])
        .order("published_at", { ascending: false, nullsFirst: false });

      if (error) {
        throw error;
      }

      return parseDataContract(assetRowsSchema, data, "biblioteca privada do aluno");
    },
    enabled: user !== null,
    staleTime: 60_000,
  });
};
