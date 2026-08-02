import { describe, expect, it } from "vitest";

import {
  playbackCredentialsSchema,
  playbackFingerprintSchema,
  playbackGatewayErrorSchema,
  playbackGatewayResponseSchema,
  playbackTokenResponseSchema,
  playbackTokenSchema,
} from "@/contracts/playback";

const TOKEN = "a".repeat(48);
const FINGERPRINT = "b".repeat(64);
const EXPIRES_AT = "2026-08-02T15:45:00.000Z";
const WATERMARK = "ID 0123456789";

const GRANTED_TOKEN = {
  granted: true,
  reason: null,
  token: TOKEN,
  expires_at: EXPIRES_AT,
  provider: "private_asset",
  watermark_text: WATERMARK,
} as const;

const DENIED_TOKEN = {
  granted: false,
  reason: "ACTIVE_ENROLLMENT_REQUIRED",
  token: null,
  expires_at: null,
  provider: null,
  watermark_text: null,
} as const;

const PRIVATE_GATEWAY = {
  granted: true,
  provider: "private_asset",
  embedUrl: null,
  streamUrl: `https://project.supabase.co/functions/v1/media-playback?token=${TOKEN}&fingerprint=${FINGERPRINT}`,
  watermarkText: WATERMARK,
  expiresAt: EXPIRES_AT,
} as const;

const YOUTUBE_GATEWAY = {
  granted: true,
  provider: "youtube",
  embedUrl: "https://www.youtube-nocookie.com/embed/AbCdEf123_-?rel=0&modestbranding=1",
  streamUrl: null,
  watermarkText: null,
  expiresAt: EXPIRES_AT,
} as const;

const VIMEO_GATEWAY = {
  granted: true,
  provider: "vimeo",
  embedUrl: "https://player.vimeo.com/video/123456789?dnt=1&title=0",
  streamUrl: null,
  watermarkText: WATERMARK,
  expiresAt: EXPIRES_AT,
} as const;

describe("playback credentials", () => {
  it("aceita token e fingerprint hexadecimais canônicos", () => {
    expect(playbackTokenSchema.parse(TOKEN)).toBe(TOKEN);
    expect(playbackFingerprintSchema.parse(FINGERPRINT)).toBe(FINGERPRINT);
    expect(
      playbackCredentialsSchema.parse({ token: TOKEN, fingerprint: FINGERPRINT }),
    ).toEqual({ token: TOKEN, fingerprint: FINGERPRINT });
  });

  it("rejeita comprimentos, caixa alta e campos extras", () => {
    expect(playbackTokenSchema.safeParse("a".repeat(47)).success).toBe(false);
    expect(playbackTokenSchema.safeParse("A".repeat(48)).success).toBe(false);
    expect(playbackFingerprintSchema.safeParse("b".repeat(63)).success).toBe(false);
    expect(playbackFingerprintSchema.safeParse("B".repeat(64)).success).toBe(false);
    expect(
      playbackCredentialsSchema.safeParse({
        token: TOKEN,
        fingerprint: FINGERPRINT,
        lessonId: "extra",
      }).success,
    ).toBe(false);
  });
});

describe("playbackTokenResponseSchema", () => {
  it("aceita exatamente uma emissão concedida", () => {
    expect(playbackTokenResponseSchema.parse([GRANTED_TOKEN])).toEqual([GRANTED_TOKEN]);
  });

  it("aceita exatamente uma emissão negada", () => {
    expect(playbackTokenResponseSchema.parse([DENIED_TOKEN])).toEqual([DENIED_TOKEN]);
  });

  it("rejeita resposta vazia ou com múltiplas linhas", () => {
    expect(playbackTokenResponseSchema.safeParse([]).success).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([GRANTED_TOKEN, GRANTED_TOKEN]).success,
    ).toBe(false);
  });

  it("rejeita concessão sem token, provedor ou expiração", () => {
    expect(
      playbackTokenResponseSchema.safeParse([{ ...GRANTED_TOKEN, token: null }]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([{ ...GRANTED_TOKEN, provider: null }]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([{ ...GRANTED_TOKEN, expires_at: null }]).success,
    ).toBe(false);
  });

  it("rejeita concessão com motivo e negação com dados concedidos", () => {
    expect(
      playbackTokenResponseSchema.safeParse([
        { ...GRANTED_TOKEN, reason: "MEDIA_NOT_AVAILABLE" },
      ]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([{ ...DENIED_TOKEN, token: TOKEN }]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([
        { ...DENIED_TOKEN, provider: "private_asset" },
      ]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([{ ...DENIED_TOKEN, expires_at: EXPIRES_AT }])
        .success,
    ).toBe(false);
  });

  it("rejeita motivo livre, timestamp, watermark e campos extras", () => {
    expect(
      playbackTokenResponseSchema.safeParse([{ ...DENIED_TOKEN, reason: "CUSTOM" }]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([
        { ...GRANTED_TOKEN, expires_at: "2026-08-02" },
      ]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([
        { ...GRANTED_TOKEN, watermark_text: "x".repeat(121) },
      ]).success,
    ).toBe(false);
    expect(
      playbackTokenResponseSchema.safeParse([{ ...GRANTED_TOKEN, internal: true }]).success,
    ).toBe(false);
  });
});

describe("playbackGatewayResponseSchema", () => {
  it("aceita gateway privado com stream assinado pelo gateway", () => {
    expect(playbackGatewayResponseSchema.parse(PRIVATE_GATEWAY)).toEqual(PRIVATE_GATEWAY);
  });

  it("aceita embeds oficiais do YouTube e Vimeo", () => {
    expect(playbackGatewayResponseSchema.parse(YOUTUBE_GATEWAY)).toEqual(YOUTUBE_GATEWAY);
    expect(playbackGatewayResponseSchema.parse(VIMEO_GATEWAY)).toEqual(VIMEO_GATEWAY);
  });

  it("rejeita stream privado sem token ou fingerprint válidos", () => {
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...PRIVATE_GATEWAY,
        streamUrl: "https://project.supabase.co/functions/v1/media-playback",
      }).success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...PRIVATE_GATEWAY,
        streamUrl: `https://project.supabase.co/functions/v1/media-playback?token=${TOKEN}&fingerprint=invalid`,
      }).success,
    ).toBe(false);
  });

  it("rejeita URL ou canal incompatível com o provedor", () => {
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...PRIVATE_GATEWAY,
        embedUrl: YOUTUBE_GATEWAY.embedUrl,
      }).success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...YOUTUBE_GATEWAY,
        embedUrl: "https://www.youtube.com/embed/AbCdEf123_-",
      }).success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...VIMEO_GATEWAY,
        embedUrl: YOUTUBE_GATEWAY.embedUrl,
      }).success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...YOUTUBE_GATEWAY,
        streamUrl: PRIVATE_GATEWAY.streamUrl,
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamp, watermark vazio ou longo e campos extras", () => {
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...PRIVATE_GATEWAY,
        expiresAt: "2026-08-02",
      }).success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({ ...PRIVATE_GATEWAY, watermarkText: "" })
        .success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({
        ...PRIVATE_GATEWAY,
        watermarkText: "x".repeat(121),
      }).success,
    ).toBe(false);
    expect(
      playbackGatewayResponseSchema.safeParse({ ...PRIVATE_GATEWAY, internal: true }).success,
    ).toBe(false);
  });
});

describe("playbackGatewayErrorSchema", () => {
  it("aceita erros canônicos do gateway", () => {
    expect(playbackGatewayErrorSchema.parse({ error: "TOKEN_EXPIRED" })).toEqual({
      error: "TOKEN_EXPIRED",
    });
    expect(playbackGatewayErrorSchema.parse({ error: "MEDIA_UNAVAILABLE" })).toEqual({
      error: "MEDIA_UNAVAILABLE",
    });
  });

  it("rejeita erro livre e campos extras", () => {
    expect(playbackGatewayErrorSchema.safeParse({ error: "CUSTOM" }).success).toBe(false);
    expect(
      playbackGatewayErrorSchema.safeParse({ error: "TOKEN_EXPIRED", details: true }).success,
    ).toBe(false);
  });
});
