import { parseDataContract } from "@/contracts/contract-error";
import {
  publicCourseCatalogSchema,
  type PublicCourseCatalog,
} from "@/contracts/public-course-catalog";
import { ciRuntimeSmokeCatalog } from "@/runtime/ci-runtime-smoke-catalog";

export type CatalogRpcResult = {
  readonly data: unknown;
  readonly error: unknown;
};

export type CatalogRpc = () => Promise<CatalogRpcResult>;

export const loadPublicCourseCatalog = async (
  runtimeSmokeEnabled: boolean,
  executeRpc: CatalogRpc,
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
