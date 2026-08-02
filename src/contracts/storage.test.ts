import { describe, expect, it } from "vitest";

import {
  assetAccessGrantSchema,
  assetAccessGrantsSchema,
  assetEventSchema,
  assetEventsSchema,
  assetRowSchema,
  assetRowsSchema,
  avatarFileSchema,
  signedAssetUrlSchema,
} from "@/contracts/storage";

const ASSET_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const CREATOR_ID = OWNER_ID;
const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const EVENT_ID = "66666666-6666-4666-8666-666666666666";
const TIMESTAMP = "2026-08-02T10:00:00.000Z";
const LATER_TIMESTAMP = "2026-08-03T10:00:00.000Z";

const makePendingAsset = (overrides: Record<string, unknown> = {}) => ({
  id: ASSET_ID,
  owner_user_id: OWNER_ID,
  created_by_user_id: CREATOR_ID,
  lesson_id: null,
  purpose: "avatar",
  state: "pending",
  bucket_id: "private-assets",
  object_path: `v1/${OWNER_ID}/${ASSET_ID}.png`,
  original_name: "avatar.png",
  normalized_name: "avatar.png",
  extension: "png",
  mime_type: "image/png",
  size_bytes: 1_024,
  checksum_sha256: null,
  idempotency_key: "avatar:1234567890",
  metadata: {},
  failure_reason: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  uploaded_at: null,
  processing_started_at: null,
  published_at: null,
  failed_at: null,
  deleted_at: null,
  ...overrides,
});

const purposeCases = [
  ["avatar", "png", "image/png", 5_242_880],
  ["image", "avif", "image/avif", 26_214_400],
  ["video", "mp4", "video/mp4", 5_368_709_120],
  ["audio", "flac", "audio/flac", 2_147_483_648],
  ["document", "pdf", "application/pdf", 104_857_600],
  ["sample", "wav", "audio/wav", 2_147_483_648],
  ["preset", "adg", "application/octet-stream", 2_147_483_648],
  ["stem", "aiff", "audio/aiff", 2_147_483_648],
  ["project", "als", "application/octet-stream", 2_147_483_648],
  ["archive", "7z", "application/x-7z-compressed", 2_147_483_648],
  ["template", "flp", "application/octet-stream", 2_147_483_648],
  ["support_file", "txt", "text/plain", 104_857_600],
  ["digital_product", "zip", "application/zip", 2_147_483_648],
] as const;

describe("assetRowSchema", () => {
  it("aceita todos os propósitos com extensão, MIME e limite próprios", () => {
    for (const [purpose, extension, mime_type, size_bytes] of purposeCases) {
      const asset = makePendingAsset({
        purpose,
        lesson_id: purpose === "avatar" ? null : LESSON_ID,
        extension,
        mime_type,
        size_bytes,
        original_name: `arquivo.${extension}`,
        normalized_name: `arquivo.${extension}`,
        object_path: `v1/${OWNER_ID}/${ASSET_ID}.${extension}`,
        idempotency_key: `asset:${purpose}:1234567890`,
      });
      expect(assetRowSchema.safeParse(asset).success).toBe(true);
    }
  });

  it("rejeita extensão e MIME incompatíveis com o propósito", () => {
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ extension: "pdf", original_name: "avatar.pdf" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ mime_type: "application/pdf" }),
      ).success,
    ).toBe(false);
  });

  it("rejeita tamanho acima do limite específico mesmo abaixo do máximo global", () => {
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ size_bytes: 5_242_881 }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({
          purpose: "document",
          lesson_id: LESSON_ID,
          extension: "pdf",
          mime_type: "application/pdf",
          original_name: "manual.pdf",
          normalized_name: "manual.pdf",
          object_path: `v1/${OWNER_ID}/${ASSET_ID}.pdf`,
          size_bytes: 104_857_601,
        }),
      ).success,
    ).toBe(false);
  });

  it("rejeita caminho que não reproduz owner, id e extensão", () => {
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({
          object_path: `v1/${USER_ID}/${ASSET_ID}.png`,
        }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({
          object_path: `v1/${OWNER_ID}/${USER_ID}.png`,
        }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({
          object_path: `v1/${OWNER_ID}/${ASSET_ID}.jpg`,
        }),
      ).success,
    ).toBe(false);
  });

  it("rejeita avatar ligado a aula ou criado para outro proprietário", () => {
    expect(
      assetRowSchema.safeParse(makePendingAsset({ lesson_id: LESSON_ID })).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ created_by_user_id: ADMIN_ID }),
      ).success,
    ).toBe(false);
  });

  it("aceita lifecycle pending, uploaded, processing e published coerentes", () => {
    const pending = makePendingAsset();
    const uploaded = makePendingAsset({
      state: "uploaded",
      uploaded_at: TIMESTAMP,
    });
    const processing = makePendingAsset({
      state: "processing",
      uploaded_at: TIMESTAMP,
      processing_started_at: LATER_TIMESTAMP,
    });
    const published = makePendingAsset({
      state: "published",
      uploaded_at: TIMESTAMP,
      published_at: LATER_TIMESTAMP,
    });
    const publishedAfterProcessing = makePendingAsset({
      state: "published",
      uploaded_at: TIMESTAMP,
      processing_started_at: TIMESTAMP,
      published_at: LATER_TIMESTAMP,
    });

    for (const asset of [
      pending,
      uploaded,
      processing,
      published,
      publishedAfterProcessing,
    ]) {
      expect(assetRowSchema.safeParse(asset).success).toBe(true);
    }
    expect(assetRowsSchema.parse([pending])).toEqual([pending]);
  });

  it("aceita falha em qualquer etapa anterior e avatar substituído", () => {
    const failedPending = makePendingAsset({
      state: "failed",
      failed_at: LATER_TIMESTAMP,
      failure_reason: "OBJECT_NOT_FOUND",
    });
    const failedUploaded = makePendingAsset({
      state: "failed",
      uploaded_at: TIMESTAMP,
      failed_at: LATER_TIMESTAMP,
      failure_reason: "CLIENT_UPLOAD_FAILED",
    });
    const replacedAvatar = makePendingAsset({
      state: "failed",
      uploaded_at: TIMESTAMP,
      published_at: TIMESTAMP,
      failed_at: LATER_TIMESTAMP,
      failure_reason: "REPLACED_BY_NEW_AVATAR",
    });
    const removed = makePendingAsset({
      state: "failed",
      failed_at: TIMESTAMP,
      failure_reason: "OBJECT_REMOVED",
      deleted_at: LATER_TIMESTAMP,
    });

    for (const asset of [failedPending, failedUploaded, replacedAvatar, removed]) {
      expect(assetRowSchema.safeParse(asset).success).toBe(true);
    }
  });

  it("rejeita timestamps, motivo e remoção incompatíveis com o estado", () => {
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ uploaded_at: TIMESTAMP }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ state: "uploaded", uploaded_at: null }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({
          state: "published",
          uploaded_at: TIMESTAMP,
          published_at: null,
        }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ state: "failed", failed_at: TIMESTAMP }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ deleted_at: TIMESTAMP }),
      ).success,
    ).toBe(false);
  });

  it("rejeita nome, MIME, idempotência, checksum e metadata inválidos", () => {
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ original_name: "../avatar.png" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ normalized_name: "Avatar PNG" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ mime_type: "Image/PNG" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ idempotency_key: "curta" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ checksum_sha256: "ABC" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(makePendingAsset({ metadata: [] })).success,
    ).toBe(false);
  });

  it("rejeita UUIDs, bucket, timestamps e campos extras inválidos", () => {
    expect(
      assetRowSchema.safeParse(makePendingAsset({ id: "asset" })).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ bucket_id: "public-assets" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(
        makePendingAsset({ created_at: "2026-08-02" }),
      ).success,
    ).toBe(false);
    expect(
      assetRowSchema.safeParse(makePendingAsset({ internal: true })).success,
    ).toBe(false);
  });
});

describe("assetEventSchema", () => {
  const event = {
    id: EVENT_ID,
    asset_id: ASSET_ID,
    actor_user_id: OWNER_ID,
    event_type: "upload_confirmed",
    from_state: "pending",
    to_state: "uploaded",
    details: { storage_object_id: USER_ID },
    created_at: TIMESTAMP,
  } as const;

  it("aceita evento canônico e coleção de eventos", () => {
    expect(assetEventSchema.parse(event)).toEqual(event);
    expect(assetEventsSchema.parse([event])).toEqual([event]);
  });

  it("aceita evento inicial sem estado anterior e ator nulo", () => {
    expect(
      assetEventSchema.safeParse({
        ...event,
        actor_user_id: null,
        event_type: "intent_created",
        from_state: null,
        to_state: "pending",
      }).success,
    ).toBe(true);
  });

  it("rejeita tipo livre, details não objeto e campos extras", () => {
    expect(
      assetEventSchema.safeParse({ ...event, event_type: "custom" }).success,
    ).toBe(false);
    expect(
      assetEventSchema.safeParse({ ...event, details: [] }).success,
    ).toBe(false);
    expect(
      assetEventSchema.safeParse({ ...event, internal: true }).success,
    ).toBe(false);
  });
});

describe("assetAccessGrantSchema", () => {
  const grant = {
    asset_id: ASSET_ID,
    user_id: USER_ID,
    granted_by_user_id: ADMIN_ID,
    expires_at: LATER_TIMESTAMP,
    created_at: TIMESTAMP,
  } as const;

  it("aceita grant permanente, temporário e coleção", () => {
    expect(assetAccessGrantSchema.parse(grant)).toEqual(grant);
    expect(
      assetAccessGrantSchema.safeParse({ ...grant, expires_at: null }).success,
    ).toBe(true);
    expect(assetAccessGrantsSchema.parse([grant])).toEqual([grant]);
  });

  it("rejeita expiração anterior ou igual à criação", () => {
    expect(
      assetAccessGrantSchema.safeParse({
        ...grant,
        expires_at: TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      assetAccessGrantSchema.safeParse({
        ...grant,
        expires_at: "2026-08-01T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejeita UUID, timestamp e campos extras inválidos", () => {
    expect(
      assetAccessGrantSchema.safeParse({ ...grant, user_id: "usuario" }).success,
    ).toBe(false);
    expect(
      assetAccessGrantSchema.safeParse({ ...grant, created_at: "2026-08-02" }).success,
    ).toBe(false);
    expect(
      assetAccessGrantSchema.safeParse({ ...grant, hidden: true }).success,
    ).toBe(false);
  });
});

describe("signedAssetUrlSchema", () => {
  it("aceita somente URL HTTPS válida", () => {
    expect(
      signedAssetUrlSchema.parse(
        "https://storage.example.com/private/object?token=abc",
      ),
    ).toBe("https://storage.example.com/private/object?token=abc");
    expect(
      signedAssetUrlSchema.safeParse("http://storage.example.com/object").success,
    ).toBe(false);
    expect(signedAssetUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
  });
});

describe("avatarFileSchema", () => {
  it("aceita JPEG, PNG e WebP não vazios", () => {
    for (const [name, type] of [
      ["avatar.jpg", "image/jpeg"],
      ["avatar.png", "image/png"],
      ["avatar.webp", "image/webp"],
    ] as const) {
      const file = new File([new Uint8Array([1])], name, { type });
      expect(avatarFileSchema.safeParse(file).success).toBe(true);
    }
  });

  it("rejeita tipo, arquivo vazio, tamanho e nome inválidos", () => {
    expect(
      avatarFileSchema.safeParse(
        new File([new Uint8Array([1])], "avatar.gif", { type: "image/gif" }),
      ).success,
    ).toBe(false);
    expect(
      avatarFileSchema.safeParse(
        new File([], "avatar.png", { type: "image/png" }),
      ).success,
    ).toBe(false);
    expect(
      avatarFileSchema.safeParse(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "avatar.png", {
          type: "image/png",
        }),
      ).success,
    ).toBe(false);
    expect(
      avatarFileSchema.safeParse(
        new File([new Uint8Array([1])], "../avatar.png", {
          type: "image/png",
        }),
      ).success,
    ).toBe(false);
  });
});
