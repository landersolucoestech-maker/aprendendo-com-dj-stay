import { describe, expect, it } from "vitest";

import {
  courseCmsRowSchema,
  courseCmsRowsSchema,
  courseFormSchema,
  courseFormToPayload,
  courseToFormValues,
  type CourseCmsRow,
  type CourseFormValues,
} from "./course-cms";

const COURSE_ID = "123e4567-e89b-42d3-a456-426614174000";
const ASSET_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const TIMESTAMP = "2026-08-02T10:00:00-03:00";
const LATER_TIMESTAMP = "2026-08-02T12:00:00-03:00";
const LOCAL_START = "2026-08-02T10:00";
const LOCAL_END = "2026-08-02T12:00";

const BASE_ROW: CourseCmsRow = {
  id: COURSE_ID,
  title: "Aprendendo com DJ Stay",
  slug: "aprendendo-com-dj-stay",
  status: "draft",
  access_duration_days: null,
  short_description: "Curso completo de produção musical.",
  description: "Descrição detalhada do curso.",
  category: "Produção musical",
  language_code: "pt-BR",
  level: "all_levels",
  objectives: ["Produzir uma faixa completa", "Organizar o projeto"],
  prerequisites: ["Computador compatível"],
  cover_asset_id: ASSET_ID,
  thumbnail_asset_id: null,
  price_amount: 199.9,
  currency_code: "BRL",
  promotional_price_amount: 149.9,
  promotion_starts_at: TIMESTAMP,
  promotion_ends_at: LATER_TIMESTAMP,
  availability_starts_at: TIMESTAMP,
  availability_ends_at: LATER_TIMESTAMP,
  completion_mode: "percentage",
  completion_required_percent: 80,
  certificate_enabled: true,
  certificate_min_completion_percent: 80,
  release_mode: "immediate",
  release_at: null,
  drip_interval_days: null,
  affiliate_eligible: true,
  preview_enabled: true,
  published_at: null,
  unpublished_at: null,
  archived_at: null,
  deleted_at: null,
  duplicated_from_course_id: null,
  created_by_user_id: USER_ID,
  updated_by_user_id: USER_ID,
  version: 1,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
};

const BASE_FORM: CourseFormValues = {
  title: "Aprendendo com DJ Stay",
  slug: "aprendendo-com-dj-stay",
  shortDescription: "Curso completo de produção musical.",
  description: "Descrição detalhada do curso.",
  category: "Produção musical",
  languageCode: "pt-BR",
  level: "all_levels",
  objectivesText: "Produzir uma faixa completa\nOrganizar o projeto",
  prerequisitesText: "Computador compatível",
  coverAssetId: ASSET_ID,
  thumbnailAssetId: "",
  priceAmount: 199.9,
  currencyCode: "BRL",
  promotionalPriceAmount: 149.9,
  promotionStartsAt: LOCAL_START,
  promotionEndsAt: LOCAL_END,
  availabilityStartsAt: LOCAL_START,
  availabilityEndsAt: LOCAL_END,
  accessDurationDays: "",
  completionMode: "percentage",
  completionRequiredPercent: 80,
  certificateEnabled: true,
  certificateMinCompletionPercent: 80,
  releaseMode: "immediate",
  releaseAt: "",
  dripIntervalDays: "",
  affiliateEligible: true,
  previewEnabled: true,
};

const expectSameInstant = (
  actual: string | null,
  expected: string | null,
): void => {
  expect(actual).not.toBeNull();
  expect(expected).not.toBeNull();
  expect(new Date(actual ?? "").getTime()).toBe(
    new Date(expected ?? "").getTime(),
  );
};

describe("courseCmsRowSchema", () => {
  it("aceita cursos imediato, agendado e gradual coerentes", () => {
    const scheduled = {
      ...BASE_ROW,
      release_mode: "scheduled",
      release_at: LATER_TIMESTAMP,
    } as const;
    const drip = {
      ...BASE_ROW,
      release_mode: "drip",
      drip_interval_days: 7,
    } as const;

    expect(courseCmsRowSchema.parse(BASE_ROW)).toEqual(BASE_ROW);
    expect(courseCmsRowSchema.parse(scheduled)).toEqual(scheduled);
    expect(courseCmsRowSchema.parse(drip)).toEqual(drip);
    expect(courseCmsRowsSchema.parse([BASE_ROW])).toEqual([BASE_ROW]);
  });

  it("normaliza textos persistidos", () => {
    const result = courseCmsRowSchema.parse({
      ...BASE_ROW,
      title: "  Curso válido  ",
      short_description: "  Descrição curta  ",
      objectives: ["  Objetivo válido  "],
    });

    expect(result.title).toBe("Curso válido");
    expect(result.short_description).toBe("Descrição curta");
    expect(result.objectives).toEqual(["Objetivo válido"]);
  });

  it("rejeita preço promocional maior ou igual ao normal", () => {
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        promotional_price_amount: BASE_ROW.price_amount,
      }).success,
    ).toBe(false);
  });

  it("rejeita fim de promoção sem início ou fora de ordem", () => {
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        promotion_starts_at: null,
      }).success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        promotion_starts_at: LATER_TIMESTAMP,
        promotion_ends_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("rejeita janela de disponibilidade fora de ordem", () => {
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        availability_starts_at: LATER_TIMESTAMP,
        availability_ends_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      release_mode: "immediate",
      release_at: TIMESTAMP,
      drip_interval_days: null,
    },
    {
      release_mode: "scheduled",
      release_at: null,
      drip_interval_days: null,
    },
    {
      release_mode: "scheduled",
      release_at: TIMESTAMP,
      drip_interval_days: 7,
    },
    {
      release_mode: "drip",
      release_at: null,
      drip_interval_days: null,
    },
    {
      release_mode: "drip",
      release_at: TIMESTAMP,
      drip_interval_days: 7,
    },
  ])("rejeita contrato de liberação inválido %#", (release) => {
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, ...release }).success,
    ).toBe(false);
  });

  it("rejeita curso publicado ou arquivado sem timestamp correspondente", () => {
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, status: "published" }).success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, status: "archived" }).success,
    ).toBe(false);
  });

  it("rejeita exclusão fora do estado arquivado", () => {
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, deleted_at: TIMESTAMP }).success,
    ).toBe(false);
  });

  it("aceita curso arquivado e excluído coerente", () => {
    const value = {
      ...BASE_ROW,
      status: "archived",
      archived_at: TIMESTAMP,
      deleted_at: LATER_TIMESTAMP,
    } as const;

    expect(courseCmsRowSchema.parse(value)).toEqual(value);
  });

  it("rejeita arrays pedagógicos acima dos limites", () => {
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        objectives: Array.from({ length: 51 }, (_, index) => `Objetivo ${index}`),
      }).success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        prerequisites: ["a".repeat(501)],
      }).success,
    ).toBe(false);
  });

  it("rejeita slug, moeda, preço, timestamp e campos extras inválidos", () => {
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, slug: "Slug Inválido" })
        .success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, currency_code: "brl" })
        .success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, price_amount: Infinity })
        .success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({
        ...BASE_ROW,
        created_at: "2026-08-02T10:00:00",
      }).success,
    ).toBe(false);
    expect(
      courseCmsRowSchema.safeParse({ ...BASE_ROW, internal_payload: {} }).success,
    ).toBe(false);
  });
});

describe("courseFormSchema", () => {
  it("aceita formulário imediato", () => {
    expect(courseFormSchema.parse(BASE_FORM)).toEqual(BASE_FORM);
  });

  it("coage números válidos provenientes dos inputs", () => {
    const result = courseFormSchema.parse({
      ...BASE_FORM,
      priceAmount: "199.9",
      promotionalPriceAmount: "149.9",
      accessDurationDays: "365",
      completionRequiredPercent: "80",
      certificateMinCompletionPercent: "80",
    });

    expect(result.priceAmount).toBe(199.9);
    expect(result.promotionalPriceAmount).toBe(149.9);
    expect(result.accessDurationDays).toBe(365);
  });

  it("rejeita datetime-local incompleto ou inválido", () => {
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        promotionStartsAt: "2026-8-2T10:00",
      }).success,
    ).toBe(false);
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        promotionStartsAt: "2026-99-99T99:99",
      }).success,
    ).toBe(false);
  });

  it("rejeita promoção inválida", () => {
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        promotionalPriceAmount: BASE_FORM.priceAmount,
      }).success,
    ).toBe(false);
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        promotionStartsAt: "",
      }).success,
    ).toBe(false);
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        promotionStartsAt: LOCAL_END,
        promotionEndsAt: LOCAL_START,
      }).success,
    ).toBe(false);
  });

  it("rejeita disponibilidade fora de ordem", () => {
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        availabilityStartsAt: LOCAL_END,
        availabilityEndsAt: LOCAL_START,
      }).success,
    ).toBe(false);
  });

  it("rejeita mais de 50 itens ou item acima de 500 caracteres", () => {
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        objectivesText: Array.from({ length: 51 }, (_, index) =>
          `Objetivo ${index}`,
        ).join("\n"),
      }).success,
    ).toBe(false);
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        prerequisitesText: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("exige data no modo agendado e intervalo no modo gradual", () => {
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        releaseMode: "scheduled",
        releaseAt: "",
      }).success,
    ).toBe(false);
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        releaseMode: "drip",
        dripIntervalDays: "",
      }).success,
    ).toBe(false);
  });

  it("aceita valores ocultos de outro modo porque o payload os remove", () => {
    expect(
      courseFormSchema.safeParse({
        ...BASE_FORM,
        releaseMode: "immediate",
        releaseAt: LOCAL_START,
        dripIntervalDays: 7,
      }).success,
    ).toBe(true);
  });

  it("rejeita campos extras", () => {
    expect(
      courseFormSchema.safeParse({ ...BASE_FORM, status: "published" }).success,
    ).toBe(false);
  });
});

describe("courseFormToPayload", () => {
  it("normaliza textos, listas, nulos, números e datas", () => {
    const payload = courseFormToPayload({
      ...BASE_FORM,
      title: "  Curso normalizado  ",
      slug: "  curso-normalizado  ",
      shortDescription: "   ",
      description: "  Descrição  ",
      category: "   ",
      objectivesText: " Objetivo A \n\n Objetivo B ",
      prerequisitesText: "  Pré-requisito  ",
      thumbnailAssetId: "",
      accessDurationDays: 365,
    });

    expect(payload.title).toBe("Curso normalizado");
    expect(payload.slug).toBe("curso-normalizado");
    expect(payload.short_description).toBeNull();
    expect(payload.description).toBe("Descrição");
    expect(payload.category).toBeNull();
    expect(payload.objectives).toEqual(["Objetivo A", "Objetivo B"]);
    expect(payload.prerequisites).toEqual(["Pré-requisito"]);
    expect(payload.thumbnail_asset_id).toBeNull();
    expect(payload.access_duration_days).toBe(365);
    expect(payload.promotion_starts_at).toBe(
      new Date(LOCAL_START).toISOString(),
    );
  });

  it("remove valores ocultos no modo imediato", () => {
    const payload = courseFormToPayload({
      ...BASE_FORM,
      releaseMode: "immediate",
      releaseAt: LOCAL_START,
      dripIntervalDays: 7,
    });

    expect(payload.release_at).toBeNull();
    expect(payload.drip_interval_days).toBeNull();
  });

  it("preserva somente a data no modo agendado", () => {
    const payload = courseFormToPayload({
      ...BASE_FORM,
      releaseMode: "scheduled",
      releaseAt: LOCAL_START,
      dripIntervalDays: 7,
    });

    expect(payload.release_at).toBe(new Date(LOCAL_START).toISOString());
    expect(payload.drip_interval_days).toBeNull();
  });

  it("preserva somente o intervalo no modo gradual", () => {
    const payload = courseFormToPayload({
      ...BASE_FORM,
      releaseMode: "drip",
      releaseAt: LOCAL_START,
      dripIntervalDays: 7,
    });

    expect(payload.release_at).toBeNull();
    expect(payload.drip_interval_days).toBe(7);
  });

  it("revalida o formulário antes de produzir payload", () => {
    expect(() =>
      courseFormToPayload({
        ...BASE_FORM,
        promotionalPriceAmount: 300,
      }),
    ).toThrow();
  });
});

describe("courseToFormValues", () => {
  it("converte registro completo em formulário e preserva instantes", () => {
    const scheduled: CourseCmsRow = {
      ...BASE_ROW,
      release_mode: "scheduled",
      release_at: LATER_TIMESTAMP,
    };
    const form = courseToFormValues(scheduled);
    const payload = courseFormToPayload(form);

    expect(form.objectivesText).toBe(
      "Produzir uma faixa completa\nOrganizar o projeto",
    );
    expect(form.thumbnailAssetId).toBe("");
    expectSameInstant(payload.promotion_starts_at, BASE_ROW.promotion_starts_at);
    expectSameInstant(payload.promotion_ends_at, BASE_ROW.promotion_ends_at);
    expectSameInstant(
      payload.availability_starts_at,
      BASE_ROW.availability_starts_at,
    );
    expectSameInstant(
      payload.availability_ends_at,
      BASE_ROW.availability_ends_at,
    );
    expectSameInstant(payload.release_at, scheduled.release_at);
  });

  it("revalida o registro antes de preencher o formulário", () => {
    expect(() =>
      courseToFormValues({
        ...BASE_ROW,
        release_mode: "scheduled",
        release_at: null,
      }),
    ).toThrow();
  });
});
