import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { DataContractError } from "@/contracts/contract-error";

import { getUserMetadataProfile } from "./user-metadata";

const createUser = (overrides: Partial<User> = {}): User => ({
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-08-02T03:00:00.000Z",
  ...overrides,
});

describe("getUserMetadataProfile", () => {
  it("prioriza full_name e normaliza campos textuais", () => {
    const profile = getUserMetadataProfile(
      createUser({
        email: "email@example.com",
        user_metadata: {
          full_name: "  Nome Principal  ",
          name: "Nome Secundário",
          phone: "  +55 31 99999-9999  ",
          bio: "  Biografia  ",
        },
      }),
    );

    expect(profile).toEqual({
      fullName: "Nome Principal",
      phone: "+55 31 99999-9999",
      bio: "Biografia",
      instagram: "",
      youtube: "",
      website: "",
    });
  });

  it.each([
    [{ name: "Nome Alternativo" }, "pessoa@example.com", "Nome Alternativo"],
    [{}, "pessoa@example.com", "pessoa"],
    [{}, undefined, "Aluno"],
  ] as const)(
    "aplica a cadeia de fallback do nome",
    (userMetadata, email, expected) => {
      const profile = getUserMetadataProfile(
        createUser({
          user_metadata: userMetadata,
          ...(email === undefined ? {} : { email }),
        }),
      );

      expect(profile.fullName).toBe(expected);
    },
  );

  it("aceita URLs HTTPS completas e preserva campos desconhecidos sem expô-los", () => {
    const profile = getUserMetadataProfile(
      createUser({
        user_metadata: {
          instagram: "  https://instagram.com/exemplo  ",
          youtube: "https://youtube.com/@exemplo",
          website: "https://example.com/perfil",
          role: "admin",
        },
      }),
    );

    expect(profile).toEqual({
      fullName: "Aluno",
      phone: "",
      bio: "",
      instagram: "https://instagram.com/exemplo",
      youtube: "https://youtube.com/@exemplo",
      website: "https://example.com/perfil",
    });
    expect(profile).not.toHaveProperty("role");
  });

  it.each([
    ["http://example.com"],
    ["javascript:alert(1)"],
    ["example.com/perfil"],
    ["ftp://example.com/arquivo"],
  ])("rejeita URL não HTTPS: %s", (website) => {
    expect(() =>
      getUserMetadataProfile(
        createUser({
          user_metadata: { website },
        }),
      ),
    ).toThrow(DataContractError);
  });

  it("rejeita textos acima dos limites e expõe contexto e issues", () => {
    try {
      getUserMetadataProfile(
        createUser({
          user_metadata: {
            full_name: "x".repeat(121),
            bio: "y".repeat(1001),
          },
        }),
      );
      throw new Error("A validação deveria falhar.");
    } catch (error) {
      expect(error).toBeInstanceOf(DataContractError);
      const contractError = error as DataContractError;
      expect(contractError.context).toBe("metadados do usuário autenticado");
      expect(contractError.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["full_name", "bio"]),
      );
    }
  });

  it("rejeita metadados que não sejam objeto", () => {
    expect(() =>
      getUserMetadataProfile(
        createUser({
          user_metadata: null as unknown as User["user_metadata"],
        }),
      ),
    ).toThrowError("Contrato de dados inválido em metadados do usuário autenticado.");
  });
});
