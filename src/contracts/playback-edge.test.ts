import { describe, expect, it } from "vitest";

import { parsePlaybackResolution } from "../../supabase/functions/_shared/playback-contract";

const EXPIRES_AT = "2026-08-02T15:45:00.000Z";
const WATERMARK = "ID 0123456789";

const PRIVATE_RESOLUTION = {
  granted: true,
  reason: null,
  provider: "private_asset",
  bucket_id: "lesson-media",
  object_path: "owner/lesson/video.mp4",
  embed_url: null,
  mime_type: "video/mp4",
  watermark_text: WATERMARK,
  expires_at: EXPIRES_AT,
} as const;

const YOUTUBE_RESOLUTION = {
  granted: true,
  reason: null,
  provider: "youtube",
  bucket_id: null,
  object_path: null,
  embed_url: "https://www.youtube-nocookie.com/embed/AbCdEf123_-?rel=0",
  mime_type: null,
  watermark_text: null,
  expires_at: EXPIRES_AT,
} as const;

const VIMEO_RESOLUTION = {
  granted: true,
  reason: null,
  provider: "vimeo",
  bucket_id: null,
  object_path: null,
  embed_url: "https://player.vimeo.com/video/123456789?dnt=1",
  mime_type: null,
  watermark_text: WATERMARK,
  expires_at: EXPIRES_AT,
} as const;

const DENIED_RESOLUTION = {
  granted: false,
  reason: "TOKEN_REVOKED",
  provider: null,
  bucket_id: null,
  object_path: null,
  embed_url: null,
  mime_type: null,
  watermark_text: WATERMARK,
  expires_at: EXPIRES_AT,
} as const;

describe("parsePlaybackResolution", () => {
  it("aceita resolução privada completa", () => {
    expect(parsePlaybackResolution(PRIVATE_RESOLUTION)).toEqual(PRIVATE_RESOLUTION);
  });

  it("aceita resoluções externas oficiais", () => {
    expect(parsePlaybackResolution(YOUTUBE_RESOLUTION)).toEqual(YOUTUBE_RESOLUTION);
    expect(parsePlaybackResolution(VIMEO_RESOLUTION)).toEqual(VIMEO_RESOLUTION);
  });

  it("aceita negação canônica com metadados residuais permitidos", () => {
    expect(parsePlaybackResolution(DENIED_RESOLUTION)).toEqual(DENIED_RESOLUTION);
    expect(
      parsePlaybackResolution({
        ...DENIED_RESOLUTION,
        reason: "TOKEN_NOT_FOUND",
        watermark_text: null,
        expires_at: null,
      }),
    ).not.toBeNull();
  });

  it("rejeita objeto incompleto, array e campo extra", () => {
    expect(parsePlaybackResolution(null)).toBeNull();
    expect(parsePlaybackResolution([])).toBeNull();
    expect(parsePlaybackResolution({ ...PRIVATE_RESOLUTION, mime_type: undefined })).toBeNull();
    expect(parsePlaybackResolution({ ...PRIVATE_RESOLUTION, internal: true })).toBeNull();
  });

  it("rejeita concessão com motivo ou expiração inválida", () => {
    expect(
      parsePlaybackResolution({ ...PRIVATE_RESOLUTION, reason: "MEDIA_DISABLED" }),
    ).toBeNull();
    expect(
      parsePlaybackResolution({ ...PRIVATE_RESOLUTION, expires_at: "2026-08-02" }),
    ).toBeNull();
  });

  it("rejeita mídia privada sem bucket, objeto ou MIME", () => {
    expect(parsePlaybackResolution({ ...PRIVATE_RESOLUTION, bucket_id: null })).toBeNull();
    expect(parsePlaybackResolution({ ...PRIVATE_RESOLUTION, object_path: null })).toBeNull();
    expect(parsePlaybackResolution({ ...PRIVATE_RESOLUTION, mime_type: null })).toBeNull();
    expect(
      parsePlaybackResolution({
        ...PRIVATE_RESOLUTION,
        embed_url: YOUTUBE_RESOLUTION.embed_url,
      }),
    ).toBeNull();
  });

  it("rejeita provedor externo com armazenamento privado ou embed incompatível", () => {
    expect(
      parsePlaybackResolution({ ...YOUTUBE_RESOLUTION, bucket_id: "lesson-media" }),
    ).toBeNull();
    expect(
      parsePlaybackResolution({
        ...YOUTUBE_RESOLUTION,
        embed_url: "https://www.youtube.com/embed/AbCdEf123_-",
      }),
    ).toBeNull();
    expect(
      parsePlaybackResolution({
        ...VIMEO_RESOLUTION,
        embed_url: YOUTUBE_RESOLUTION.embed_url,
      }),
    ).toBeNull();
  });

  it("rejeita negação com motivo livre ou dados de mídia", () => {
    expect(
      parsePlaybackResolution({ ...DENIED_RESOLUTION, reason: "CUSTOM" }),
    ).toBeNull();
    expect(
      parsePlaybackResolution({ ...DENIED_RESOLUTION, provider: "private_asset" }),
    ).toBeNull();
    expect(
      parsePlaybackResolution({ ...DENIED_RESOLUTION, object_path: "video.mp4" }),
    ).toBeNull();
  });

  it("rejeita watermark vazio ou acima do limite", () => {
    expect(
      parsePlaybackResolution({ ...PRIVATE_RESOLUTION, watermark_text: "" }),
    ).toBeNull();
    expect(
      parsePlaybackResolution({ ...PRIVATE_RESOLUTION, watermark_text: "x".repeat(121) }),
    ).toBeNull();
  });
});
