import type { PublicCourseCatalog } from "@/contracts/public-course-catalog";

export const ciRuntimeSmokeCourseTitle = "Curso de validação do runtime";

export const ciRuntimeSmokeCatalog = {
  courses: [
    {
      slug: "curso-validacao-runtime",
      title: ciRuntimeSmokeCourseTitle,
      short_description:
        "Conteúdo sintético determinístico usado somente para validar o runtime público no CI.",
      description:
        "Este registro não representa uma oferta comercial e nunca é usado fora do smoke sintético de desenvolvimento.",
      category: "Validação técnica",
      language_code: "pt-BR",
      level: "beginner",
      objectives: ["Comprovar a renderização final do catálogo público sem rede externa."],
      prerequisites: [],
      price_amount: 100,
      effective_price_amount: 100,
      currency_code: "BRL",
      promotion_active: false,
      access_duration_days: 365,
      certificate_enabled: true,
      published_at: "2026-08-04T00:00:00.000Z",
      module_count: 1,
      lesson_count: 2,
      duration_minutes: 90,
      preview_lesson_count: 1,
      modules: [
        {
          title: "Módulo sintético de validação",
          description:
            "Estrutura mínima canônica para exercitar os totais derivados do contrato público.",
          position: 0,
          lesson_count: 2,
          duration_minutes: 90,
          preview_lesson_count: 1,
        },
      ],
    },
  ],
} satisfies PublicCourseCatalog;
