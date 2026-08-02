import { z } from "zod";

const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });

export const profileOptionalNameSchema = z.string().trim().max(120);
export const profileDisplayNameSchema = profileOptionalNameSchema.min(1);
export const profilePhoneSchema = z.string().trim().max(40);
export const profileBioSchema = z.string().trim().max(1000);
export const profileOptionalHttpsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (value.length === 0) return true;

    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "A URL deve utilizar HTTPS.");

export const profileMetadataInputSchema = z
  .object({
    name: profileDisplayNameSchema,
    phone: profilePhoneSchema,
    bio: profileBioSchema,
    instagram: profileOptionalHttpsUrlSchema,
    youtube: profileOptionalHttpsUrlSchema,
    website: profileOptionalHttpsUrlSchema,
  })
  .strict();

export const authUserMetadataSchema = z
  .object({
    full_name: profileOptionalNameSchema.optional(),
    name: profileOptionalNameSchema.optional(),
    phone: profilePhoneSchema.optional(),
    bio: profileBioSchema.optional(),
    instagram: profileOptionalHttpsUrlSchema.optional(),
    youtube: profileOptionalHttpsUrlSchema.optional(),
    website: profileOptionalHttpsUrlSchema.optional(),
  })
  .passthrough();

export const userProfileSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    avatar_asset_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export type ProfileMetadataInput = z.infer<typeof profileMetadataInputSchema>;
export type AuthUserMetadata = z.infer<typeof authUserMetadataSchema>;
export type UserProfileRow = z.infer<typeof userProfileSchema>;
