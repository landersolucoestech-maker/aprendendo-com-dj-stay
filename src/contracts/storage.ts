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

export const assetEventTypeSchema = z.enum([
  "intent_created",
  "upload_confirmed",
  "processing_started",
  "published",
  "failed",
  "cleanup_requested",
  "object_removed",
  "associated",
]);

const assetTypePolicy = {
  avatar: {
    maxSizeBytes: 5_242_880,
    extensions: ["jpg", "jpeg", "png", "webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  image: {
    maxSizeBytes: 26_214_400,
    extensions: ["jpg", "jpeg", "png", "webp", "avif"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
  video: {
    maxSizeBytes: 5_368_709_120,
    extensions: ["mp4", "webm", "mov"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  audio: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["mp3", "wav", "flac", "ogg", "m4a", "aac"],
    mimeTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/ogg",
      "audio/mp4",
      "audio/aac",
    ],
  },
  document: {
    maxSizeBytes: 104_857_600,
    extensions: ["pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx"],
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  sample: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "wav", "flac", "aif", "aiff", "mp3"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/aiff",
      "audio/mpeg",
    ],
  },
  stem: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "wav", "flac", "aif", "aiff"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/aiff",
    ],
  },
  preset: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "adg", "adv", "vstpreset", "fxp", "fxb"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ],
  },
  project: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "als", "flp", "logicx", "ptx"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ],
  },
  archive: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "rar", "7z", "tar", "gz"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.rar",
      "application/x-7z-compressed",
      "application/x-tar",
      "application/gzip",
      "application/octet-stream",
    ],
  },
  template: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "als", "flp", "logicx", "ptx"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ],
  },
  support_file: {
    maxSizeBytes: 104_857_600,
    extensions: ["pdf", "txt", "jpg", "jpeg", "png", "webp", "zip"],
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/zip",
      "application/x-zip-compressed",
    ],
  },
  digital_product: {
    maxSizeBytes: 2_147_483_648,
    extensions: ["zip", "rar", "7z", "pdf", "wav", "flac", "mp3", "als", "flp", "logicx", "ptx"],
    mimeTypes: [
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.rar",
      "application/x-7z-compressed",
      "application/pdf",
      "application/octet-stream",
      "audio/wav",
      "audio/x-wav",
      "audio/flac",
      "audio/mpeg",
    ],
  },
} as const satisfies Record<
  z.infer<typeof assetPurposeSchema>,
  {
    maxSizeBytes: number;
    extensions: readonly string[];
    mimeTypes: readonly string[];
  }
>;

const includesText = (values: readonly string[], value: string): boolean =>
  values.includes(value);

const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const addIssue = (
  context: z.RefinementCtx,
  path: string,
  message: string,
): void => {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
};

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
    original_name: z
      .string()
      .min(1)
      .max(255)
      .refine((value) => !/[\\/]/.test(value) && !hasControlCharacter(value)),
    normalized_name: z.string().min(1).max(255).regex(/^[a-z0-9._-]+$/),
    extension: z.string().regex(/^[a-z0-9]{1,16}$/),
    mime_type: z
      .string()
      .min(3)
      .max(255)
      .regex(/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/),
    size_bytes: z.number().int().positive().max(5_368_709_120),
    checksum_sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    idempotency_key: z.string().regex(/^[A-Za-z0-9:_-]{16,128}$/),
    metadata: z.record(z.string(), z.unknown()),
    failure_reason: z.string().min(1).max(500).nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    uploaded_at: nullableTimestampSchema,
    processing_started_at: nullableTimestampSchema,
    published_at: nullableTimestampSchema,
    failed_at: nullableTimestampSchema,
    deleted_at: nullableTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const policy = assetTypePolicy[value.purpose];

    if (!includesText(policy.extensions, value.extension)) {
      addIssue(context, "extension", "A extensão não é permitida para o propósito do asset.");
    }
    if (!includesText(policy.mimeTypes, value.mime_type)) {
      addIssue(context, "mime_type", "O MIME não é permitido para o propósito do asset.");
    }
    if (value.size_bytes > policy.maxSizeBytes) {
      addIssue(context, "size_bytes", "O tamanho excede o limite do propósito do asset.");
    }
    if (
      value.object_path !==
      `v1/${value.owner_user_id}/${value.id}.${value.extension}`
    ) {
      addIssue(context, "object_path", "O caminho deve reproduzir owner, asset e extensão.");
    }
    if (
      value.purpose === "avatar" &&
      (value.lesson_id !== null || value.owner_user_id !== value.created_by_user_id)
    ) {
      addIssue(context, "purpose", "Avatar deve pertencer ao criador e não pode estar ligado a aula.");
    }
    if (value.deleted_at !== null && value.state !== "failed") {
      addIssue(context, "deleted_at", "Somente asset falho pode estar removido logicamente.");
    }

    const pendingIsValid =
      value.state === "pending" &&
      value.uploaded_at === null &&
      value.processing_started_at === null &&
      value.published_at === null &&
      value.failed_at === null &&
      value.failure_reason === null &&
      value.deleted_at === null;
    const uploadedIsValid =
      value.state === "uploaded" &&
      value.uploaded_at !== null &&
      value.processing_started_at === null &&
      value.published_at === null &&
      value.failed_at === null &&
      value.failure_reason === null &&
      value.deleted_at === null;
    const processingIsValid =
      value.state === "processing" &&
      value.uploaded_at !== null &&
      value.processing_started_at !== null &&
      value.published_at === null &&
      value.failed_at === null &&
      value.failure_reason === null &&
      value.deleted_at === null;
    const publishedIsValid =
      value.state === "published" &&
      value.uploaded_at !== null &&
      value.published_at !== null &&
      value.failed_at === null &&
      value.failure_reason === null &&
      value.deleted_at === null;
    const failedIsValid =
      value.state === "failed" &&
      value.failed_at !== null &&
      value.failure_reason !== null;

    if (
      !pendingIsValid &&
      !uploadedIsValid &&
      !processingIsValid &&
      !publishedIsValid &&
      !failedIsValid
    ) {
      addIssue(context, "state", "O lifecycle do asset está incoerente.");
    }
  });

export const assetRowsSchema = z.array(assetRowSchema);

export const assetEventSchema = z
  .object({
    id: uuidSchema,
    asset_id: uuidSchema,
    actor_user_id: uuidSchema.nullable(),
    event_type: assetEventTypeSchema,
    from_state: assetStateSchema.nullable(),
    to_state: assetStateSchema.nullable(),
    details: z.record(z.string(), z.unknown()),
    created_at: timestampSchema,
  })
  .strict();

export const assetEventsSchema = z.array(assetEventSchema);

export const assetAccessGrantSchema = z
  .object({
    asset_id: uuidSchema,
    user_id: uuidSchema,
    granted_by_user_id: uuidSchema,
    expires_at: nullableTimestampSchema,
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.expires_at !== null &&
      new Date(value.expires_at).getTime() <= new Date(value.created_at).getTime()
    ) {
      addIssue(context, "expires_at", "A expiração do grant deve ocorrer após a criação.");
    }
  });

export const assetAccessGrantsSchema = z.array(assetAccessGrantSchema);

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
  .refine(
    (file) =>
      file.name.length >= 1 &&
      file.name.length <= 255 &&
      !/[\\/]/.test(file.name) &&
      !hasControlCharacter(file.name),
    {
      message: "O nome do arquivo é inválido.",
    },
  );

export type AssetPurpose = z.infer<typeof assetPurposeSchema>;
export type AssetState = z.infer<typeof assetStateSchema>;
export type AssetEventType = z.infer<typeof assetEventTypeSchema>;
export type AssetRow = z.infer<typeof assetRowSchema>;
export type AssetEvent = z.infer<typeof assetEventSchema>;
export type AssetAccessGrant = z.infer<typeof assetAccessGrantSchema>;
