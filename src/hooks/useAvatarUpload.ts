import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { assetRowSchema, assetRowsSchema, avatarFileSchema, type AssetRow } from "@/contracts/storage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/error-message";

const cleanupAssetObject = async (asset: AssetRow, reason: string): Promise<void> => {
  const { error: removeError } = await supabase.storage
    .from(asset.bucket_id)
    .remove([asset.object_path]);

  const { error: failError } = await supabase.rpc("fail_asset_upload", {
    p_asset_id: asset.id,
    p_reason: reason,
    p_object_removed: removeError === null,
  });

  if (failError && removeError === null) {
    throw failError;
  }
};

const cleanupReplacedAvatars = async (currentAssetId: string): Promise<void> => {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("purpose", "avatar")
    .eq("state", "failed")
    .eq("failure_reason", "REPLACED_BY_NEW_AVATAR")
    .is("deleted_at", null)
    .neq("id", currentAssetId);

  if (error) {
    throw error;
  }

  const staleAssets = parseDataContract(assetRowsSchema, data, "avatares substituídos");
  for (const staleAsset of staleAssets) {
    await cleanupAssetObject(staleAsset, "REPLACED_BY_NEW_AVATAR");
  }
};

export const useAvatarUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadAvatar = async (input: File): Promise<AssetRow | null> => {
    let preparedAsset: AssetRow | null = null;

    try {
      setIsUploading(true);
      const file = parseDataContract(avatarFileSchema, input, "arquivo de avatar");
      const idempotencyKey = `avatar:${crypto.randomUUID()}`;
      const { data: preparedData, error: prepareError } = await supabase.rpc(
        "prepare_asset_upload",
        {
          p_purpose: "avatar",
          p_original_name: file.name,
          p_mime_type: file.type.toLowerCase(),
          p_size_bytes: file.size,
          p_idempotency_key: idempotencyKey,
        },
      );

      if (prepareError) {
        throw prepareError;
      }

      preparedAsset = parseDataContract(assetRowSchema, preparedData, "intent de avatar");
      const { error: uploadError } = await supabase.storage
        .from(preparedAsset.bucket_id)
        .upload(preparedAsset.object_path, file, {
          cacheControl: "3600",
          contentType: preparedAsset.mime_type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: confirmedData, error: confirmError } = await supabase.rpc(
        "confirm_asset_upload",
        { p_asset_id: preparedAsset.id },
      );

      if (confirmError) {
        throw confirmError;
      }

      const confirmedAsset = parseDataContract(assetRowSchema, confirmedData, "confirmação do avatar");
      if (confirmedAsset.state !== "uploaded") {
        throw new Error(confirmedAsset.failure_reason ?? "O Storage recusou a confirmação do avatar.");
      }

      const { data: publishedData, error: publishError } = await supabase.rpc(
        "transition_asset_state",
        { p_asset_id: preparedAsset.id, p_target_state: "published" },
      );

      if (publishError) {
        throw publishError;
      }

      const publishedAsset = parseDataContract(assetRowSchema, publishedData, "publicação do avatar");
      preparedAsset = publishedAsset;
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });

      try {
        await cleanupReplacedAvatars(publishedAsset.id);
      } catch {
        // O avatar publicado permanece válido; o asset substituído continua auditável para cleanup posterior.
      }

      return publishedAsset;
    } catch (error: unknown) {
      if (preparedAsset !== null && preparedAsset.state !== "published") {
        try {
          await cleanupAssetObject(preparedAsset, "CLIENT_UPLOAD_FAILED");
        } catch {
          // A falha principal é preservada; o registro continua auditável para cleanup posterior.
        }
      }

      toast({
        title: "Erro no upload",
        description: getErrorMessage(error, "Não foi possível enviar a imagem."),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAvatar, isUploading };
};
