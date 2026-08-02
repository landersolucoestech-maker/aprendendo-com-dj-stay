import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  publicCourseCatalogSchema,
  type PublicCourseCatalog,
} from "@/contracts/public-course-catalog";
import { supabase } from "@/integrations/supabase/client";

export const publicCourseCatalogKey = ["public", "course-catalog"] as const;

export const usePublicCourseCatalog = () =>
  useQuery({
    queryKey: publicCourseCatalogKey,
    queryFn: async (): Promise<PublicCourseCatalog> => {
      const { data, error } = await supabase.rpc("get_public_course_catalog");
      if (error) throw error;

      return parseDataContract(
        publicCourseCatalogSchema,
        data,
        "catálogo público de cursos",
      );
    },
    staleTime: 60_000,
  });
