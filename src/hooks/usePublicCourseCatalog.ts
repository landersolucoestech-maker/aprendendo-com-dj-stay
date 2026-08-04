import { useQuery } from "@tanstack/react-query";

import { ciRuntimeSmokeEnabled } from "@/config/public-config";
import { parseDataContract } from "@/contracts/contract-error";
import {
  publicCourseCatalogSchema,
  type PublicCourseCatalog,
} from "@/contracts/public-course-catalog";
import { supabase } from "@/integrations/supabase/client";
import { ciRuntimeSmokeCatalog } from "@/runtime/ci-runtime-smoke-catalog";

export const publicCourseCatalogKey = ["public", "course-catalog"] as const;

type CatalogRpcResult = {
  readonly data: unknown;
  readonly error: unknown;
};

type CatalogRpc = () => Promise<CatalogRpcResult>;

const executePublicCourseCatalogRpc: CatalogRpc = async () => {
  const { data, error } = await supabase.rpc("get_public_course_catalog");
  return { data, error };
};

export const loadPublicCourseCatalog = async (
  runtimeSmokeEnabled = ciRuntimeSmokeEnabled,
  executeRpc: CatalogRpc = executePublicCourseCatalogRpc,
): Promise<PublicCourseCatalog> => {
  if (runtimeSmokeEnabled) {
    return parseDataContract(
      publicCourseCatalogSchema,
      ciRuntimeSmokeCatalog,
      "catálogo sintético do smoke de runtime",
    );
  }

  const { data, error } = await executeRpc();
  if (error) throw error;

  return parseDataContract(
    publicCourseCatalogSchema,
    data,
    "catálogo público de cursos",
  );
};

export const usePublicCourseCatalog = () =>
  useQuery({
    queryKey: publicCourseCatalogKey,
    queryFn: () => loadPublicCourseCatalog(),
    staleTime: 60_000,
  });
