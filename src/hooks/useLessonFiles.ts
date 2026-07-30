import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { lessonIdSchema } from "@/contracts/learning";
import { assetRowsSchema, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";
import { downloadPrivateAsset } from "@/lib/private-assets";

export type LessonAsset = AssetRow;

export const useLessonFiles = (aulaId: string) =>
  useQuery({
    queryKey: ["lesson-assets", aulaId],
    queryFn: async (): Promise<LessonAsset[]> => {
      const validatedLessonId = parseDataContract(
        lessonIdSchema,
        aulaId,
        "identificador da aula para consulta de assets",
      );
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("lesson_id", validatedLessonId)
        .eq("state", "published")
        .is("deleted_at", null)
        .order("purpose", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return parseDataContract(assetRowsSchema, data, "assets publicados da aula");
    },
    enabled: aulaId.length > 0,
  });

export const downloadFileFromStorage = async (asset: LessonAsset): Promise<void> => {
  await downloadPrivateAsset(asset);
};
