import type { User } from "@supabase/supabase-js";
import { z } from "zod";

import { parseDataContract } from "@/contracts/contract-error";

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional();
const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value.length === 0 || (z.string().url().safeParse(value).success && new URL(value).protocol === "https:"),
    "O valor deve ser uma URL HTTPS completa.",
  )
  .optional();

const userMetadataSchema = z
  .object({
    full_name: optionalText(120),
    name: optionalText(120),
    phone: optionalText(40),
    bio: optionalText(1000),
    instagram: optionalHttpsUrl,
    youtube: optionalHttpsUrl,
    website: optionalHttpsUrl,
  })
  .passthrough();

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
    userMetadataSchema,
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
