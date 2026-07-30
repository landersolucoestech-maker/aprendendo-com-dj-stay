import type { User } from "@supabase/supabase-js";

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export interface UserMetadataProfile {
  readonly fullName: string;
  readonly phone: string;
  readonly bio: string;
  readonly instagram: string;
  readonly youtube: string;
  readonly website: string;
}

export function getUserMetadataProfile(user: User): UserMetadataProfile {
  const metadata = user.user_metadata;

  return {
    fullName:
      readString(metadata.full_name) ||
      readString(metadata.name) ||
      user.email?.split("@")[0] ||
      "Aluno",
    phone: readString(metadata.phone),
    bio: readString(metadata.bio),
    instagram: readString(metadata.instagram),
    youtube: readString(metadata.youtube),
    website: readString(metadata.website),
  };
}
