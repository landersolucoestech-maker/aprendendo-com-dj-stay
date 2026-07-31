import { useState } from "react";

import { parseDataContract } from "@/contracts/contract-error";
import { assetPurposeSchema, assetRowSchema, type AssetPurpose, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";

export type LessonUploadPurpose = Extract<
  AssetPurpose,
  "video" | "audio" | "document" | "sample" | "preset" | "stem" | "project" | "archive" | "template" | "support_file"
>;

const maxBytesByPurpose: Record<LessonUploadPurpose, number> = {
  video: 5 * 1024 * 1024 * 1024,
  audio: 500 * 1024 * 1024,
  document: 250 * 1024 * 1024,
  sample: 2 * 1024 * 1024 * 1024,
  preset: 250 * 1024 * 1024,
  stem: 2 * 1024 * 1024 * 1024,
  project: 2 * 1024 * 1024 * 1024,
  archive: 2 * 1024 * 1024 * 1024,
  template: 500 * 1024 * 1024,
  support_file: 500 * 1024 * 1024,
};

const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const allowedAudioTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
]);

const validateFile = (file: File, purpose: LessonUploadPurpose): File => {
  assetPurposeSchema.parse(purpose);
  const mimeType = file.type.toLowerCase();
  if (file.size <= 0 || file.size > maxBytesByPurpose[purpose]) {
    throw new Error("O arquivo está vazio ou ultrapassa o limite permitido para essa finalidade.");
  }
  if (file.name.length > 255 || /[\\/]/.test(file.name)) {
    throw new Error("O nome do arquivo é inválido.");
  }
  if (mimeType.length < 3 || mimeType.length > 255) {
    throw new Error("O navegador não informou um tipo de arquivo válido.");
  }
  if (purpose === "video" && !allowedVideoTypes.has(mimeType)) {
    throw new Error("Use vídeo MP4, WebM ou MOV.");
  }
  if (purpose === "audio" && !allowedAudioTypes.has(mimeType)) {
    throw new Error("Use áudio MP3, WAV, FLAC, OGG, WebM ou M4A.");
  }
  return file;
};

const cleanup = async (asset: AssetRow) => {
  const { error: removeError } = await supabase.storage.from(asset.bucket_id).remove([asset.object_path]);
  await supabase.rpc("fail_asset_upload", {
    p_asset_id: asset.id,
    p_reason: "LESSON_ASSET_UPLOAD_FAILED",
    p_object_removed: removeError === null,
  });
};

export const useLessonAssetUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const upload = async ({ file: input, lessonId, purpose }: {
    file: File;
    lessonId: string;
    purpose: LessonUploadPurpose;
  }): Promise<AssetRow> => {
    let prepared: AssetRow | null = null;
    setIsUploading(true);
    try {
      const file = validateFile(input, purpose);
      const { data: prepareData, error: prepareError } = await supabase.rpc("prepare_asset_upload", {
        p_purpose: purpose,
        p_original_name: file.name,
        p_mime_type: file.type.toLowerCase(),
        p_size_bytes: file.size,
        p_idempotency_key: `lesson-${purpose}:${crypto.randomUUID()}`,
        p_lesson_id: lessonId,
      });
      if (prepareError) throw prepareError;
      prepared = parseDataContract(assetRowSchema, prepareData, `intent do asset ${purpose}`);

      const { error: uploadError } = await supabase.storage.from(prepared.bucket_id).upload(prepared.object_path, file, {
        contentType: prepared.mime_type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: confirmedData, error: confirmedError } = await supabase.rpc("confirm_asset_upload", {
        p_asset_id: prepared.id,
      });
      if (confirmedError) throw confirmedError;
      const confirmed = parseDataContract(assetRowSchema, confirmedData, `confirmação do asset ${purpose}`);
      if (confirmed.state !== "uploaded") throw new Error("O Storage não confirmou o arquivo enviado.");

      const { data: publishedData, error: publishedError } = await supabase.rpc("transition_asset_state", {
        p_asset_id: prepared.id,
        p_target_state: "published",
      });
      if (publishedError) throw publishedError;
      return parseDataContract(assetRowSchema, publishedData, `publicação do asset ${purpose}`);
    } catch (error: unknown) {
      if (prepared && prepared.state !== "published") {
        try {
          await cleanup(prepared);
        } catch {
          // O registro auditável permanece disponível para o job de limpeza.
        }
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading };
};
