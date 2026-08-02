export const PLAYBACK_PROVIDERS = ["private_asset", "youtube", "vimeo"] as const;
export type PlaybackProvider = (typeof PLAYBACK_PROVIDERS)[number];

export const PLAYBACK_DENIAL_REASONS = [
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
] as const;
export type PlaybackDenialReason = (typeof PLAYBACK_DENIAL_REASONS)[number];

export interface PlaybackResolution {
  readonly granted: boolean;
  readonly reason: PlaybackDenialReason | null;
  readonly provider: PlaybackProvider | null;
  readonly bucket_id: string | null;
  readonly object_path: string | null;
  readonly embed_url: string | null;
  readonly mime_type: string | null;
  readonly watermark_text: string | null;
  readonly expires_at: string | null;
}

const RESOLUTION_KEYS = [
  "granted",
  "reason",
  "provider",
  "bucket_id",
  "object_path",
  "embed_url",
  "mime_type",
  "watermark_text",
  "expires_at",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value).sort();
  return (
    keys.length === RESOLUTION_KEYS.length &&
    RESOLUTION_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
};

const isProvider = (value: unknown): value is PlaybackProvider =>
  typeof value === "string" && PLAYBACK_PROVIDERS.some((provider) => provider === value);

const isDenialReason = (value: unknown): value is PlaybackDenialReason =>
  typeof value === "string" && PLAYBACK_DENIAL_REASONS.some((reason) => reason === value);

const isBoundedString = (value: unknown, maximum: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maximum;

const isNullableBoundedString = (value: unknown, maximum: number): value is string | null =>
  value === null || isBoundedString(value, maximum);

const isTimestamp = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  Number.isFinite(Date.parse(value));

const isNullableTimestamp = (value: unknown): value is string | null =>
  value === null || isTimestamp(value);

const isYoutubeEmbedUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.youtube-nocookie.com" &&
      /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname)
    );
  } catch {
    return false;
  }
};

const isVimeoEmbedUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "player.vimeo.com" &&
      /^\/video\/[0-9]{6,12}$/.test(url.pathname)
    );
  } catch {
    return false;
  }
};

export const parsePlaybackResolution = (value: unknown): PlaybackResolution | null => {
  if (!isRecord(value) || !hasExactKeys(value) || typeof value.granted !== "boolean") {
    return null;
  }

  if (
    !isNullableBoundedString(value.watermark_text, 120) ||
    !isNullableTimestamp(value.expires_at)
  ) {
    return null;
  }

  if (!value.granted) {
    if (
      !isDenialReason(value.reason) ||
      value.provider !== null ||
      value.bucket_id !== null ||
      value.object_path !== null ||
      value.embed_url !== null ||
      value.mime_type !== null
    ) {
      return null;
    }

    return {
      granted: false,
      reason: value.reason,
      provider: null,
      bucket_id: null,
      object_path: null,
      embed_url: null,
      mime_type: null,
      watermark_text: value.watermark_text,
      expires_at: value.expires_at,
    };
  }

  if (value.reason !== null || !isProvider(value.provider) || !isTimestamp(value.expires_at)) {
    return null;
  }

  if (value.provider === "private_asset") {
    if (
      !isBoundedString(value.bucket_id, 100) ||
      !isBoundedString(value.object_path, 1024) ||
      !isBoundedString(value.mime_type, 255) ||
      value.embed_url !== null
    ) {
      return null;
    }
  } else {
    const embedUrlIsValid =
      value.provider === "youtube"
        ? isYoutubeEmbedUrl(value.embed_url)
        : isVimeoEmbedUrl(value.embed_url);
    if (
      !embedUrlIsValid ||
      value.bucket_id !== null ||
      value.object_path !== null ||
      value.mime_type !== null
    ) {
      return null;
    }
  }

  return {
    granted: true,
    reason: null,
    provider: value.provider,
    bucket_id: value.bucket_id as string | null,
    object_path: value.object_path as string | null,
    embed_url: value.embed_url as string | null,
    mime_type: value.mime_type as string | null,
    watermark_text: value.watermark_text,
    expires_at: value.expires_at,
  };
};
