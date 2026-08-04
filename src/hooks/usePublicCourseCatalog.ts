import { useQuery } from "@tanstack/react-query";

import { ciRuntimeSmokeEnabled } from "@/config/public-config";
import { supabase } from "@/integrations/supabase/client";
import { loadPublicCourseCatalog } from "@/runtime/load-public-course-catalog";

export const publicCourseCatalogKey = ["public", "course-catalog"] as const;

const executePublicCourseCatalogRpc = async () => {
  const { data, error } = await supabase.rpc("get_public_course_catalog");
  return { data, error };
};

export const usePublicCourseCatalog = () =>
  useQuery({
    queryKey: publicCourseCatalogKey,
    queryFn: () =>
      loadPublicCourseCatalog(
        ciRuntimeSmokeEnabled,
        executePublicCourseCatalogRpc,
      ),
    staleTime: 60_000,
  });
