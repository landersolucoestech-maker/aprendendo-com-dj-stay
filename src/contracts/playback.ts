import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const nullableWatermarkSchema = z.string().trim().min(1).max(120).nullable();

export const lessonMediaProviderSchema = z.enum(["private_asset", "youtube", "vimeo"]);
export const playbackTokenSchema = z.string().regex(/^[a-f0-9]{48}$/);
export const playbackFingerprintSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const playbackDenialReasonSchema = z.enum([
  "AUTH_SESSION_REQUIRED",
  "INVALID_FINGERPRINT",
  "MEDIA_NOT_AVAILABLE",
  "ACTIVE_ENROLLMENT_REQUIRED",
  "ROLE_NOT_ALLOWED",
  "PRIVATE_MEDIA_OBJECT_UNAVAILABLE",
  "INVALID_PLAYBACK_CREDENTIALS",
  "TOKEN_NOT_FOUND",
  "FINGERPRINT_MISMATCH",
  "TOKEN_REVOKED",
  "TOKEN_EXPIRED",
  "MEDIA_DISABLED",
  "ENROLLMENT_NOT_ACTIVE",
  "ADMIN_ROLE_REMOVED",
]);

export const playbackGatewayErrorCodeSchema = z.enum([
  ...playbackDenialReasonSchema.options,
  "ORIGIN_NOT_ALLOWED",
  "METHOD_NOT_ALLOWED",
  "PLAYBACK_RESOLUTION_FAILED",
  "PLAYBACK_DENIED",
  "PRIVATE_MEDIA_REQUIRED",
  "MEDIA_UNAVAILABLE",
  "PLAYBACK_GATEWAY_ERROR",
]);

export const playbackCredentialsSchema = z
  .object({
    token: playbackTokenSchema,
    fingerprint: playbackFingerprintSchema,
  })
  .strict();

const grantedPlaybackTokenSchema = z
  .object({
    granted: z.literal(true),
    reason: z.null(),
    token: playbackTokenSchema,
    expires_at: timestampSchema,
    provider: lessonMediaProviderSchema,
    watermark_text: nullableWatermarkSchema,
  })
  .strict();

const deniedPlaybackTokenSchema = z
  .object({
    granted: z.literal(false),
    reason: playbackDenialReasonSchema,
    token: z.null(),
    expires_at: z.null(),
    provider: z.null(),
    watermark_text: z.null(),
  })
  .strict();

export const playbackTokenResultSchema = z.discriminatedUnion("granted", [
  grantedPlaybackTokenSchema,
  deniedPlaybackTokenSchema,
]);

export const playbackTokenResponseSchema = z.array(playbackTokenResultSchema).length(1);

const privatePlaybackStreamUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.pathname.endsWith("/functions/v1/media-playback") &&
      playbackTokenSchema.safeParse(url.searchParams.get("token")).success &&
      playbackFingerprintSchema.safeParse(url.searchParams.get("fingerprint")).success
    );
  }, "A URL privada deve apontar para o gateway com token e fingerprint válidos.");

const youtubeEmbedUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.hostname === "www.youtube-nocookie.com" &&
      /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
    );
  }, "A URL do YouTube deve usar o domínio sem cookies e um vídeo válido.");

const vimeoEmbedUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.hostname === "player.vimeo.com" && /^\/video\/[0-9]{6,12}$/.test(url.pathname);
  }, "A URL do Vimeo deve usar o player oficial e um vídeo válido.");

const privateGatewayResponseSchema = z
  .object({
    granted: z.literal(true),
    provider: z.literal("private_asset"),
    embedUrl: z.null(),
    streamUrl: privatePlaybackStreamUrlSchema,
    watermarkText: nullableWatermarkSchema,
    expiresAt: timestampSchema,
  })
  .strict();

const youtubeGatewayResponseSchema = z
  .object({
    granted: z.literal(true),
    provider: z.literal("youtube"),
    embedUrl: youtubeEmbedUrlSchema,
    streamUrl: z.null(),
    watermarkText: nullableWatermarkSchema,
    expiresAt: timestampSchema,
  })
  .strict();

const vimeoGatewayResponseSchema = z
  .object({
    granted: z.literal(true),
    provider: z.literal("vimeo"),
    embedUrl: vimeoEmbedUrlSchema,
    streamUrl: z.null(),
    watermarkText: nullableWatermarkSchema,
    expiresAt: timestampSchema,
  })
  .strict();

export const playbackGatewayResponseSchema = z.discriminatedUnion("provider", [
  privateGatewayResponseSchema,
  youtubeGatewayResponseSchema,
  vimeoGatewayResponseSchema,
]);

export const playbackGatewayErrorSchema = z
  .object({
    error: playbackGatewayErrorCodeSchema,
  })
  .strict();

export type LessonMediaProvider = z.infer<typeof lessonMediaProviderSchema>;
export type PlaybackCredentials = z.infer<typeof playbackCredentialsSchema>;
export type PlaybackTokenResult = z.infer<typeof playbackTokenResultSchema>;
export type PlaybackGatewayResponse = z.infer<typeof playbackGatewayResponseSchema>;
