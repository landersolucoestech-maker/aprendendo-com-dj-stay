import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
export const lessonMediaProviderSchema = z.enum(["private_asset", "youtube", "vimeo"]);

export const playbackTokenResponseSchema = z.array(
  z
    .object({
      granted: z.boolean(),
      reason: z.string().nullable(),
      token: z.string().regex(/^[a-f0-9]{48}$/).nullable(),
      expires_at: timestampSchema.nullable(),
      provider: lessonMediaProviderSchema.nullable(),
      watermark_text: z.string().max(120).nullable(),
    })
    .strict(),
);

export const playbackGatewayResponseSchema = z
  .object({
    granted: z.literal(true),
    provider: lessonMediaProviderSchema,
    embedUrl: z.string().url().nullable(),
    streamUrl: z.string().url().nullable(),
    watermarkText: z.string().max(120).nullable(),
    expiresAt: timestampSchema,
  })
  .strict();

export type LessonMediaProvider = z.infer<typeof lessonMediaProviderSchema>;
export type PlaybackGatewayResponse = z.infer<typeof playbackGatewayResponseSchema>;
