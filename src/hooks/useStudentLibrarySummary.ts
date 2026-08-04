import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/use-auth";
import { parseDataContract } from "@/contracts/contract-error";
import { studentLibrarySummarySchema } from "@/contracts/student-library-summary";
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

export const useStudentLibrarySummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["student-library-summary", user?.id ?? null],
    queryFn: async () => {
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { error, count } = await supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("state", "published")
        .is("deleted_at", null)
        .in("purpose", [...STUDENT_MATERIAL_PURPOSES]);

      if (error) throw error;

      return parseDataContract(
        studentLibrarySummarySchema,
        { total: count ?? 0 },
        "resumo da biblioteca privada do aluno",
      );
    },
    enabled: user !== null,
    staleTime: 60_000,
  });
};
