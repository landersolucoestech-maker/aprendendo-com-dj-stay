import type { User } from "@supabase/supabase-js";
import { parseDataContract } from "@/contracts/contract-error";
import { authUserMetadataSchema } from "@/contracts/profile";

export interface UserMetadataProfile {
  readonly fullName: string;
  readonly phone: string;
  readonly bio: string;
  readonly instagram: string;
  readonly youtube: string;
  readonly website: string;
}

export function getUserMetadataProfile(user: User): UserMetadataProfile {
  const metadata = parseDataContract(
    authUserMetadataSchema,
    user.user_metadata,
    "metadados do usuário autenticado",
  );

  return {
    fullName: metadata.full_name || metadata.name || user.email?.split("@")[0] || "Aluno",
    phone: metadata.phone ?? "",
    bio: metadata.bio ?? "",
    instagram: metadata.instagram ?? "",
    youtube: metadata.youtube ?? "",
    website: metadata.website ?? "",
  };
}
