import { useState } from "react";
import { z } from "zod";

import { parseDataContract } from "@/contracts/contract-error";
import { assetRowSchema, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";

const courseImageSchema = z.instanceof(File)
  .refine((file) => ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type.toLowerCase()), "Use JPEG, PNG, WebP ou AVIF.")
  .refine((file) => file.size > 0 && file.size <= 25 * 1024 * 1024, "A imagem deve ter no máximo 25 MB.")
  .refine((file) => file.name.length <= 255 && !/[\\/]/.test(file.name), "Nome de arquivo inválido.");

const cleanup = async (asset: AssetRow) => {
  const { error: removeError } = await supabase.storage.from(asset.bucket_id).remove([asset.object_path]);
  await supabase.rpc("fail_asset_upload", {
    p_asset_id: asset.id,
    p_reason: "COURSE_IMAGE_UPLOAD_FAILED",
    p_object_removed: removeError === null,
  });
};

export const useCourseImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (input: File): Promise<AssetRow> => {
    let prepared: AssetRow | null = null;
    setIsUploading(true);
    try {
      const file = courseImageSchema.parse(input);
      const { data: prepareData, error: prepareError } = await supabase.rpc("prepare_asset_upload", {
        p_purpose: "image",
        p_original_name: file.name,
        p_mime_type: file.type.toLowerCase(),
        p_size_bytes: file.size,
        p_idempotency_key: `course-image:${crypto.randomUUID()}`,
      });
      if (prepareError) throw prepareError;
      prepared = parseDataContract(assetRowSchema, prepareData, "intent da imagem do curso");
      const { error: uploadError } = await supabase.storage.from(prepared.bucket_id).upload(prepared.object_path, file, {
        contentType: prepared.mime_type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: confirmedData, error: confirmedError } = await supabase.rpc("confirm_asset_upload", { p_asset_id: prepared.id });
      if (confirmedError) throw confirmedError;
      const confirmed = parseDataContract(assetRowSchema, confirmedData, "confirmação da imagem do curso");
      if (confirmed.state !== "uploaded") throw new Error("A imagem não foi confirmada pelo Storage.");
      const { data: publishedData, error: publishedError } = await supabase.rpc("transition_asset_state", { p_asset_id: prepared.id, p_target_state: "published" });
      if (publishedError) throw publishedError;
      return parseDataContract(assetRowSchema, publishedData, "publicação da imagem do curso");
    } catch (error) {
      if (prepared && prepared.state !== "published") {
        try { await cleanup(prepared); } catch { /* Registro auditável permanece para limpeza posterior. */ }
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
