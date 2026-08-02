import { describe, expect, it } from "vitest";

import {
  studentFavoriteListSchema,
  studentFavoriteSchema,
  studentFavoriteStatusSchema,
  studentFavoriteSubjectTypeSchema,
  studentFavoriteToggleResultSchema,
} from "./student-favorites";

const FAVORITE_ID = "123e4567-e89b-42d3-a456-426614174000";
const SUBJECT_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const TIMESTAMP = "2026-08-02T06:45:00-03:00";

const FAVORITE = {
  id: FAVORITE_ID,
  subject_type: "course",
  subject_id: SUBJECT_ID,
  title: "Aprendendo com DJ Stay",
  action_path: `/aluno/cursos/${SUBJECT_ID}`,
  created_at: TIMESTAMP,
} as const;

describe("studentFavoriteSubjectTypeSchema", () => {
  it.each(["course", "digital_product"] as const)(
    "aceita o tipo canônico %s",
    (type) => {
      expect(studentFavoriteSubjectTypeSchema.parse(type)).toBe(type);
    },
  );

  it.each(["product", "COURSE", ""])("rejeita o tipo inválido %j", (type) => {
    expect(studentFavoriteSubjectTypeSchema.safeParse(type).success).toBe(false);
  });
});

describe("studentFavoriteSchema", () => {
  it("aceita favorito de curso completo", () => {
    expect(studentFavoriteSchema.parse(FAVORITE)).toEqual(FAVORITE);
  });

  it("aceita favorito de produto digital", () => {
    const value = {
      ...FAVORITE,
      subject_type: "digital_product",
      action_path: "/marketplace",
    } as const;
    expect(studentFavoriteSchema.parse(value)).toEqual(value);
  });

  it("normaliza espaços externos do título", () => {
    const result = studentFavoriteSchema.parse({
      ...FAVORITE,
      title: "  Curso favorito  ",
    });
    expect(result.title).toBe("Curso favorito");
  });

  it.each(["", " ", "   "])("rejeita título vazio %j", (title) => {
    expect(studentFavoriteSchema.safeParse({ ...FAVORITE, title }).success).toBe(
      false,
    );
  });

  it.each([
    "https://example.com",
    "//example.com/path",
    "aluno/cursos/123",
    "mailto:suporte@example.com",
    "/\\example.com",
    "/aluno\\cursos",
  ])("rejeita caminho de ação inseguro %j", (action_path) => {
    expect(
      studentFavoriteSchema.safeParse({ ...FAVORITE, action_path }).success,
    ).toBe(false);
  });

  it("rejeita timestamp sem timezone", () => {
    expect(
      studentFavoriteSchema.safeParse({
        ...FAVORITE,
        created_at: "2026-08-02T06:45:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita UUIDs inválidos", () => {
    expect(
      studentFavoriteSchema.safeParse({
        ...FAVORITE,
        id: "favorito-invalido",
      }).success,
    ).toBe(false);
    expect(
      studentFavoriteSchema.safeParse({
        ...FAVORITE,
        subject_id: "item-invalido",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentFavoriteSchema.safeParse({
        ...FAVORITE,
        user_id: SUBJECT_ID,
      }).success,
    ).toBe(false);
  });
});

describe("studentFavoriteListSchema", () => {
  it("aceita lista completa", () => {
    const list = { total: 1, favorites: [FAVORITE] };
    expect(studentFavoriteListSchema.parse(list)).toEqual(list);
  });

  it("aceita lista vazia", () => {
    expect(
      studentFavoriteListSchema.parse({ total: 0, favorites: [] }),
    ).toEqual({ total: 0, favorites: [] });
  });

  it("rejeita total negativo ou fracionário", () => {
    expect(
      studentFavoriteListSchema.safeParse({ total: -1, favorites: [] }).success,
    ).toBe(false);
    expect(
      studentFavoriteListSchema.safeParse({ total: 0.5, favorites: [] }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentFavoriteListSchema.safeParse({
        total: 1,
        favorites: [FAVORITE],
        cursor: "interno",
      }).success,
    ).toBe(false);
  });
});

describe("studentFavoriteToggleResultSchema", () => {
  it.each([true, false])("aceita resultado booleano %s", (is_favorite) => {
    const value = {
      subject_type: "course",
      subject_id: SUBJECT_ID,
      is_favorite,
    } as const;
    expect(studentFavoriteToggleResultSchema.parse(value)).toEqual(value);
  });

  it("rejeita UUID inválido e campo extra", () => {
    expect(
      studentFavoriteToggleResultSchema.safeParse({
        subject_type: "course",
        subject_id: "item-invalido",
        is_favorite: true,
      }).success,
    ).toBe(false);
    expect(
      studentFavoriteToggleResultSchema.safeParse({
        subject_type: "course",
        subject_id: SUBJECT_ID,
        is_favorite: true,
        favorite_id: FAVORITE_ID,
      }).success,
    ).toBe(false);
  });
});

describe("studentFavoriteStatusSchema", () => {
  it.each([true, false])("aceita status booleano %s", (status) => {
    expect(studentFavoriteStatusSchema.parse(status)).toBe(status);
  });

  it.each([1, 0, "true", null])("rejeita status não booleano %j", (status) => {
    expect(studentFavoriteStatusSchema.safeParse(status).success).toBe(false);
  });
});
