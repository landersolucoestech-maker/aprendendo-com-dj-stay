import { describe, expect, it } from "vitest";

import {
  disableLessonMediaInputSchema,
  externalLessonMediaInputSchema,
  lessonMediaRowSchema,
  privateLessonMediaInputSchema,
  vimeoVideoIdSchema,
  youtubeVideoIdSchema,
} from "@/contracts/curriculum-cms";

const MEDIA_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const TIMESTAMP = "2026-08-02T15:00:00.000Z";
const YOUTUBE_ID = "AbCdEf123_-";
const VIMEO_ID = "123456789";

const BASE_MEDIA = {
  id: MEDIA_ID,
  lesson_id: LESSON_ID,
  watermark_enabled: true,
  is_active: true,
  created_by_user_id: USER_ID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

describe("identificadores persistidos de mídia", () => {
  it("aceita identificador canônico do YouTube e Vimeo", () => {
    expect(youtubeVideoIdSchema.parse(YOUTUBE_ID)).toBe(YOUTUBE_ID);
    expect(vimeoVideoIdSchema.parse(VIMEO_ID)).toBe(VIMEO_ID);
  });

  it("rejeita tamanho, caracteres e formato incompatíveis", () => {
    expect(youtubeVideoIdSchema.safeParse("video-123").success).toBe(false);
    expect(youtubeVideoIdSchema.safeParse("a".repeat(12)).success).toBe(false);
    expect(youtubeVideoIdSchema.safeParse("AbCdEf12!_-").success).toBe(false);
    expect(vimeoVideoIdSchema.safeParse("12345").success).toBe(false);
    expect(vimeoVideoIdSchema.safeParse("1".repeat(13)).success).toBe(false);
    expect(vimeoVideoIdSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("lessonMediaRowSchema", () => {
  it("aceita mídia privada, YouTube e Vimeo coerentes", () => {
    expect(
      lessonMediaRowSchema.parse({
        ...BASE_MEDIA,
        provider: "private_asset",
        asset_id: ASSET_ID,
        external_video_id: null,
      }).provider,
    ).toBe("private_asset");
    expect(
      lessonMediaRowSchema.parse({
        ...BASE_MEDIA,
        provider: "youtube",
        asset_id: null,
        external_video_id: YOUTUBE_ID,
      }).external_video_id,
    ).toBe(YOUTUBE_ID);
    expect(
      lessonMediaRowSchema.parse({
        ...BASE_MEDIA,
        provider: "vimeo",
        asset_id: null,
        external_video_id: VIMEO_ID,
      }).external_video_id,
    ).toBe(VIMEO_ID);
  });

  it("rejeita identificador externo incompatível com o provedor", () => {
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "youtube",
        asset_id: null,
        external_video_id: "video-123",
      }).success,
    ).toBe(false);
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "vimeo",
        asset_id: null,
        external_video_id: YOUTUBE_ID,
      }).success,
    ).toBe(false);
  });

  it("preserva coerência entre asset privado e identificador externo", () => {
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "private_asset",
        asset_id: null,
        external_video_id: null,
      }).success,
    ).toBe(false);
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "private_asset",
        asset_id: ASSET_ID,
        external_video_id: YOUTUBE_ID,
      }).success,
    ).toBe(false);
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "youtube",
        asset_id: ASSET_ID,
        external_video_id: YOUTUBE_ID,
      }).success,
    ).toBe(false);
  });

  it("rejeita UUID, timestamp e campos extras", () => {
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        id: "media",
        provider: "youtube",
        asset_id: null,
        external_video_id: YOUTUBE_ID,
      }).success,
    ).toBe(false);
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "youtube",
        asset_id: null,
        external_video_id: YOUTUBE_ID,
        created_at: "2026-08-02",
      }).success,
    ).toBe(false);
    expect(
      lessonMediaRowSchema.safeParse({
        ...BASE_MEDIA,
        provider: "youtube",
        asset_id: null,
        external_video_id: YOUTUBE_ID,
        internal: true,
      }).success,
    ).toBe(false);
  });
});

describe("externalLessonMediaInputSchema", () => {
  it.each([
    "https://www.youtube.com/watch?v=AbCdEf123_-",
    "https://m.youtube.com/watch?feature=share&v=AbCdEf123_-",
    "https://youtu.be/AbCdEf123_-",
    "https://www.youtube.com/embed/AbCdEf123_-",
    "https://youtube-nocookie.com/shorts/AbCdEf123_-",
  ])("aceita URL suportada do YouTube: %s", (sourceUrl) => {
    expect(
      externalLessonMediaInputSchema.parse({
        lessonId: LESSON_ID,
        provider: "youtube",
        sourceUrl,
        watermarkEnabled: true,
      }).sourceUrl,
    ).toBe(sourceUrl);
  });

  it.each([
    "https://vimeo.com/123456789",
    "https://www.vimeo.com/123456789?share=copy",
    "https://player.vimeo.com/video/123456789",
  ])("aceita URL suportada do Vimeo: %s", (sourceUrl) => {
    expect(
      externalLessonMediaInputSchema.parse({
        lessonId: LESSON_ID,
        provider: "vimeo",
        sourceUrl,
        watermarkEnabled: false,
      }).sourceUrl,
    ).toBe(sourceUrl);
  });

  it("rejeita provedor incompatível com a URL", () => {
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        provider: "youtube",
        sourceUrl: "https://vimeo.com/123456789",
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        provider: "vimeo",
        sourceUrl: "https://youtu.be/AbCdEf123_-",
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
  });

  it("rejeita HTTP, identificador inválido, limite, UUID e campos extras", () => {
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        provider: "youtube",
        sourceUrl: "http://youtu.be/AbCdEf123_-",
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        provider: "youtube",
        sourceUrl: "https://youtu.be/video-123",
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        provider: "youtube",
        sourceUrl: `https://youtu.be/${YOUTUBE_ID}?${"x".repeat(1000)}`,
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: "aula",
        provider: "youtube",
        sourceUrl: "https://youtu.be/AbCdEf123_-",
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      externalLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        provider: "youtube",
        sourceUrl: "https://youtu.be/AbCdEf123_-",
        watermarkEnabled: true,
        internal: true,
      }).success,
    ).toBe(false);
  });
});

describe("mídia privada e desativação", () => {
  it("aceita entrada privada e desativação canônicas", () => {
    expect(
      privateLessonMediaInputSchema.parse({
        lessonId: LESSON_ID,
        assetId: ASSET_ID,
        watermarkEnabled: true,
      }),
    ).toEqual({ lessonId: LESSON_ID, assetId: ASSET_ID, watermarkEnabled: true });
    expect(disableLessonMediaInputSchema.parse({ lessonId: LESSON_ID })).toEqual({
      lessonId: LESSON_ID,
    });
  });

  it("rejeita UUIDs inválidos e campos extras", () => {
    expect(
      privateLessonMediaInputSchema.safeParse({
        lessonId: "aula",
        assetId: ASSET_ID,
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      privateLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        assetId: "asset",
        watermarkEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      privateLessonMediaInputSchema.safeParse({
        lessonId: LESSON_ID,
        assetId: ASSET_ID,
        watermarkEnabled: true,
        internal: true,
      }).success,
    ).toBe(false);
    expect(
      disableLessonMediaInputSchema.safeParse({ lessonId: "aula" }).success,
    ).toBe(false);
    expect(
      disableLessonMediaInputSchema.safeParse({ lessonId: LESSON_ID, internal: true })
        .success,
    ).toBe(false);
  });
});
