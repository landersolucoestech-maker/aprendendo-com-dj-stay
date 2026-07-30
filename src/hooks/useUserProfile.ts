import { useQuery } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import { userProfileSchema, type UserProfileRow } from "@/contracts/learning";
import { assetRowSchema } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";
import { createSignedAssetUrl } from "@/lib/private-assets";

export interface UserProfile extends UserProfileRow {
  avatarSignedUrl: string | null;
}

export const useUserProfile = () =>
  useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data === null) {
        return null;
      }

      const profile = parseDataContract(userProfileSchema, data, "perfil do usuário");

      if (profile.avatar_asset_id === null) {
        return { ...profile, avatarSignedUrl: null };
      }

      const { data: avatarData, error: avatarError } = await supabase
        .from("assets")
        .select("*")
        .eq("id", profile.avatar_asset_id)
        .eq("purpose", "avatar")
        .eq("state", "published")
        .is("deleted_at", null)
        .maybeSingle();

      if (avatarError) {
        throw avatarError;
      }

      if (avatarData === null) {
        return { ...profile, avatarSignedUrl: null };
      }

      const avatar = parseDataContract(assetRowSchema, avatarData, "asset de avatar");
      const avatarSignedUrl = await createSignedAssetUrl(avatar, 300);
      return { ...profile, avatarSignedUrl };
    },
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });
