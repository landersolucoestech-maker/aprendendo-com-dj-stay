import { describe, expect, it } from "vitest";

import { publicCourseCatalogSchema } from "@/contracts/public-course-catalog";

const validCatalog = {
  courses: [
    {
      slug: "producao-musical",
      title: "Produção musical",
      short_description: "Aprenda com conteúdo prático.",
      description: "Formação estruturada com aulas e materiais publicados.",
      category: "Música",
      language_code: "pt-BR",
      level: "beginner",
      objectives: ["Produzir uma faixa completa"],
      prerequisites: ["Computador com acesso à internet"],
      price_amount: 297,
      effective_price_amount: 197,
      currency_code: "BRL",
      promotion_active: true,
      access_duration_days: 365,
      certificate_enabled: true,
      published_at: "2026-08-02T20:00:00+00:00",
      module_count: 1,
      lesson_count: 2,
      duration_minutes: 75,
      preview_lesson_count: 1,
      modules: [
        {
          title: "Fundamentos",
          description: "Primeiros passos.",
          position: 0,
          lesson_count: 2,
          duration_minutes: 75,
          preview_lesson_count: 1,
        },
      ],
    },
  ],
};

describe("publicCourseCatalogSchema", () => {
  it("accepts a catalog derived from published modules", () => {
    expect(publicCourseCatalogSchema.parse(validCatalog)).toEqual(validCatalog);
  });

  it("rejects totals that diverge from the module payload", () => {
    expect(() =>
      publicCourseCatalogSchema.parse({
        courses: [{ ...validCatalog.courses[0], lesson_count: 99 }],
      }),
    ).toThrow("Total público diverge dos módulos persistidos");
  });

  it("rejects a discounted price without an active promotion", () => {
    expect(() =>
      publicCourseCatalogSchema.parse({
        courses: [
          {
            ...validCatalog.courses[0],
            promotion_active: false,
          },
        ],
      }),
    ).toThrow("Sem promoção ativa");
  });

  it("rejects private or administrative fields", () => {
    expect(() =>
      publicCourseCatalogSchema.parse({
        courses: [
          {
            ...validCatalog.courses[0],
            cover_asset_id: "00000000-0000-4000-8000-000000000001",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects preview totals larger than published lessons", () => {
    expect(() =>
      publicCourseCatalogSchema.parse({
        courses: [
          {
            ...validCatalog.courses[0],
            preview_lesson_count: 3,
            modules: [
              {
                ...validCatalog.courses[0].modules[0],
                preview_lesson_count: 3,
              },
            ],
          },
        ],
      }),
    ).toThrow("Prévias não podem exceder");
  });
});
