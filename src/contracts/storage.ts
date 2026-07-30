import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();

export const assetPurposeSchema = z.enum([
  "avatar",
  "video",
  "audio",
  "image",
  "document",
  "sample",
  "preset",
  "stem",
  "project",
  "archive",
  "template",
  "support_file",
  "digital_product",
]);

export const assetStateSchema = z.enum([
  "pending",
  "uploaded",
  "processing",
  "published",
  "failed",
]);

export const assetRowSchema = z
  .object({
    id: uuidSchema,
    owner_user_id: uuidSchema,
    created_by_user_id: uuidSchema,
    lesson_id: uuidSchema.nullable(),
    purpose: assetPurposeSchema,
    state: assetStateSchema,
    bucket_id: z.literal("private-assets"),
    object_path: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^v1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,16}$/),
    original_name: z.string().min(1).max(255).refine((value) => !/[\\/]/.test(value)),
    normalized_name: z.string().min(1).max(255),
    extension: z.string().regex(/^[a-z0-9]{1,16}$/),
    mime_type: z.string().min(3).max(255),
    size_bytes: z.number().int().positive().max(5_368_709_120),
    checksum_sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    idempotency_key: z.string().min(16).max(128),
    metadata: z.record(z.string(), z.unknown()),
    failure_reason: z.string().max(500).nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    uploaded_at: nullableTimestampSchema,
    processing_started_at: nullableTimestampSchema,
    published_at: nullableTimestampSchema,
    failed_at: nullableTimestampSchema,
    deleted_at: nullableTimestampSchema,
  })
  .strict();

export const assetRowsSchema = z.array(assetRowSchema);

export const signedAssetUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "A URL assinada deve utilizar HTTPS.");

export const avatarFileSchema = z
  .instanceof(File)
  .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase()), {
    message: "O avatar deve ser JPEG, PNG ou WebP.",
  })
  .refine((file) => file.size > 0 && file.size <= 5 * 1024 * 1024, {
    message: "O avatar deve ter no máximo 5 MB.",
  })
  .refine((file) => file.name.length >= 1 && file.name.length <= 255 && !/[\\/]/.test(file.name), {
    message: "O nome do arquivo é inválido.",
  });

export type AssetPurpose = z.infer<typeof assetPurposeSchema>;
export type AssetState = z.infer<typeof assetStateSchema>;
export type AssetRow = z.infer<typeof assetRowSchema>;
