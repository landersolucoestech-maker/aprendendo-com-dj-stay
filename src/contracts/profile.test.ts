import { describe, expect, it } from "vitest";

import {
  profileMetadataInputSchema as learningProfileMetadataInputSchema,
  userProfileSchema as learningUserProfileSchema,
} from "@/contracts/learning";
import {
  authUserMetadataSchema,
  profileMetadataInputSchema,
  profileOptionalHttpsUrlSchema,
  userProfileSchema,
} from "@/contracts/profile";

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const CREATED_AT = "2026-08-02T15:00:00.000Z";
const UPDATED_AT = "2026-08-02T16:00:00.000Z";

const PROFILE_ROW = {
  id: PROFILE_ID,
  user_id: USER_ID,
  avatar_asset_id: ASSET_ID,
  created_at: CREATED_AT,
  updated_at: UPDATED_AT,
} as const;

const METADATA_INPUT = {
  name: "  Nome do Aluno  ",
  phone: "  +55 31 99999-9999  ",
  bio: "  Biografia pública  ",
  instagram: "  https://instagram.com/aluno  ",
  youtube: " https://youtube.com/@aluno ",
  website: "  https://example.com/perfil  ",
} as const;

describe("userProfileSchema", () => {
  it("aceita perfil persistido estrito com avatar", () => {
    expect(userProfileSchema.parse(PROFILE_ROW)).toEqual(PROFILE_ROW);
  });

  it("aceita perfil sem avatar", () => {
    const withoutAvatar = { ...PROFILE_ROW, avatar_asset_id: null };
    expect(userProfileSchema.parse(withoutAvatar)).toEqual(withoutAvatar);
  });

  it("rejeita UUIDs, timestamps e campos extras", () => {
    expect(userProfileSchema.safeParse({ ...PROFILE_ROW, id: "perfil" }).success).toBe(false);
    expect(userProfileSchema.safeParse({ ...PROFILE_ROW, user_id: "usuario" }).success).toBe(false);
    expect(
      userProfileSchema.safeParse({ ...PROFILE_ROW, avatar_asset_id: "avatar" }).success,
    ).toBe(false);
    expect(
      userProfileSchema.safeParse({ ...PROFILE_ROW, created_at: "2026-08-02" }).success,
    ).toBe(false);
    expect(userProfileSchema.safeParse({ ...PROFILE_ROW, internal: true }).success).toBe(false);
  });
});

describe("profileMetadataInputSchema", () => {
  it("normaliza nome, textos e URLs antes da gravação", () => {
    expect(profileMetadataInputSchema.parse(METADATA_INPUT)).toEqual({
      name: "Nome do Aluno",
      phone: "+55 31 99999-9999",
      bio: "Biografia pública",
      instagram: "https://instagram.com/aluno",
      youtube: "https://youtube.com/@aluno",
      website: "https://example.com/perfil",
    });
  });

  it("aceita campos opcionais vazios após trim", () => {
    expect(
      profileMetadataInputSchema.parse({
        name: "Aluno",
        phone: "   ",
        bio: "   ",
        instagram: "   ",
        youtube: "",
        website: "  ",
      }),
    ).toEqual({
      name: "Aluno",
      phone: "",
      bio: "",
      instagram: "",
      youtube: "",
      website: "",
    });
  });

  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "example.com/perfil",
    "ftp://example.com/arquivo",
  ])("rejeita URL não HTTPS ou incompleta: %s", (website) => {
    expect(
      profileMetadataInputSchema.safeParse({
        ...METADATA_INPUT,
        website,
      }).success,
    ).toBe(false);
  });

  it("rejeita nome vazio, limites excedidos e campos extras", () => {
    expect(
      profileMetadataInputSchema.safeParse({ ...METADATA_INPUT, name: "   " }).success,
    ).toBe(false);
    expect(
      profileMetadataInputSchema.safeParse({ ...METADATA_INPUT, name: "x".repeat(121) })
        .success,
    ).toBe(false);
    expect(
      profileMetadataInputSchema.safeParse({ ...METADATA_INPUT, phone: "x".repeat(41) })
        .success,
    ).toBe(false);
    expect(
      profileMetadataInputSchema.safeParse({ ...METADATA_INPUT, bio: "x".repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      profileMetadataInputSchema.safeParse({
        ...METADATA_INPUT,
        website: `https://example.com/${"x".repeat(500)}`,
      }).success,
    ).toBe(false);
    expect(
      profileMetadataInputSchema.safeParse({ ...METADATA_INPUT, role: "admin" }).success,
    ).toBe(false);
  });
});

describe("authUserMetadataSchema", () => {
  it("reutiliza normalização e preserva metadados desconhecidos", () => {
    expect(
      authUserMetadataSchema.parse({
        full_name: "  Nome Principal  ",
        phone: "  +55 31 99999-9999  ",
        website: "  https://example.com  ",
        role: "aluno",
      }),
    ).toEqual({
      full_name: "Nome Principal",
      phone: "+55 31 99999-9999",
      website: "https://example.com",
      role: "aluno",
    });
  });

  it("aceita ausência dos campos públicos e rejeita valores incompatíveis", () => {
    expect(authUserMetadataSchema.parse({ role: "aluno" })).toEqual({ role: "aluno" });
    expect(authUserMetadataSchema.safeParse(null).success).toBe(false);
    expect(
      authUserMetadataSchema.safeParse({ website: "http://example.com" }).success,
    ).toBe(false);
    expect(
      authUserMetadataSchema.safeParse({ full_name: "x".repeat(121) }).success,
    ).toBe(false);
  });
});

describe("compatibilidade pública por learning.ts", () => {
  it("reexporta as mesmas instâncias canônicas", () => {
    expect(learningProfileMetadataInputSchema).toBe(profileMetadataInputSchema);
    expect(learningUserProfileSchema).toBe(userProfileSchema);
  });

  it("mantém o validador HTTPS reutilizável", () => {
    expect(profileOptionalHttpsUrlSchema.parse("  https://example.com  ")).toBe(
      "https://example.com",
    );
    expect(profileOptionalHttpsUrlSchema.parse("   ")).toBe("");
  });
});
