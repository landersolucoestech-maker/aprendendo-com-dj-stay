import { parseDataContract } from "@/contracts/contract-error";
import { signedAssetUrlSchema, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";

export const createSignedAssetUrl = async (
  asset: Pick<AssetRow, "bucket_id" | "object_path">,
  expiresInSeconds: number,
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(asset.bucket_id)
    .createSignedUrl(asset.object_path, expiresInSeconds);

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error("O Storage não retornou uma URL assinada.");
  }

  return parseDataContract(signedAssetUrlSchema, data.signedUrl, "URL assinada do asset");
};

export const downloadPrivateAsset = async (asset: AssetRow): Promise<void> => {
  if (asset.state !== "published" || asset.deleted_at !== null) {
    throw new Error("O arquivo não está publicado para download.");
  }

  const signedUrl = await createSignedAssetUrl(asset, 60);
  const response = await fetch(signedUrl, {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`O Storage recusou o download (${response.status}).`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = asset.original_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
