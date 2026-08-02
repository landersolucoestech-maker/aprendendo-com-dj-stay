import { describe, expect, it } from "vitest";

import { appRoleSchema, userRoleRowSchema } from "./authorization";

const VALID_USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const VALID_ROW = {
  user_id: VALID_USER_ID,
  role: "aluno",
  created_at: "2026-08-02T05:00:00Z",
  updated_at: "2026-08-02T02:00:00-03:00",
} as const;

describe("appRoleSchema", () => {
  it.each(["aluno", "afiliado", "administrador_proprietario"] as const)(
    "aceita o papel canônico %s",
    (role) => {
      expect(appRoleSchema.parse(role)).toBe(role);
    },
  );

  it.each(["instrutor", "ALUNO", ""])("rejeita o papel inválido %j", (role) => {
    expect(appRoleSchema.safeParse(role).success).toBe(false);
  });
});

describe("userRoleRowSchema", () => {
  it("aceita UUID, papel canônico e timestamps com timezone", () => {
    expect(userRoleRowSchema.parse(VALID_ROW)).toEqual(VALID_ROW);
  });

  it("rejeita user_id que não seja UUID", () => {
    expect(
      userRoleRowSchema.safeParse({ ...VALID_ROW, user_id: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("rejeita papel fora do enum", () => {
    expect(
      userRoleRowSchema.safeParse({ ...VALID_ROW, role: "instrutor" }).success,
    ).toBe(false);
  });

  it("rejeita timestamp sem timezone ou offset", () => {
    expect(
      userRoleRowSchema.safeParse({
        ...VALID_ROW,
        created_at: "2026-08-02T05:00:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos adicionais", () => {
    expect(
      userRoleRowSchema.safeParse({ ...VALID_ROW, extra_field: true }).success,
    ).toBe(false);
  });

  it("rejeita linha incompleta", () => {
    expect(
      userRoleRowSchema.safeParse({
        user_id: VALID_USER_ID,
        role: "aluno",
      }).success,
    ).toBe(false);
  });
});
