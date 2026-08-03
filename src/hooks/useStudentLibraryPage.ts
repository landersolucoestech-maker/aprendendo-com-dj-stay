import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { studentLibraryPageSchema } from "@/contracts/student-library-page";
import { supabase } from "@/integrations/supabase/client";

const normalizeLibraryPage = (value: number): number =>
  Math.max(0, Math.trunc(value));

const normalizeLibraryPageSize = (value: number): number =>
  Math.min(100, Math.max(1, Math.trunc(value)));

export const useStudentLibraryPage = (page = 0, pageSize = 20) => {
  const normalizedPage = normalizeLibraryPage(page);
  const normalizedPageSize = normalizeLibraryPageSize(pageSize);
  const offset = normalizedPage * normalizedPageSize;

  return useQuery({
    queryKey: ["student-library-page", normalizedPage, normalizedPageSize],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error, count } = await supabase
        .from("assets")
        .select("*", { count: "exact" })
        .eq("state", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range(offset, offset + normalizedPageSize - 1);

      if (error) throw error;

      return parseDataContract(
        studentLibraryPageSchema,
        { total: count ?? 0, assets: data },
        "biblioteca paginada do aluno",
      );
    },
    placeholderData: (previousData) => previousData,
  });
};
