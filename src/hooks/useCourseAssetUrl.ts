import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { assetRowSchema } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";
import { createSignedAssetUrl } from "@/lib/private-assets";

export const useCourseAssetUrl = (assetId: string | null) => useQuery({
  queryKey: ["course-asset-url", assetId],
  queryFn: async (): Promise<string> => {
    if (!assetId) throw new Error("Asset não informado.");
    const { data, error } = await supabase.from("assets").select("*").eq("id", assetId).single();
    if (error) throw error;
    const asset = parseDataContract(assetRowSchema, data, "imagem do curso");
    return createSignedAssetUrl(asset, 300);
  },
  enabled: assetId !== null,
  staleTime: 4 * 60 * 1000,
});
