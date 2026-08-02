import { z } from "zod";

import { courseLevelSchema } from "@/contracts/course-cms";

const timestampSchema = z.string().datetime({ offset: true });
const moneySchema = z.number().finite().nonnegative();

export const publicCourseModuleSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(20_000).nullable(),
    position: z.number().int().nonnegative(),
    lesson_count: z.number().int().nonnegative(),
    duration_minutes: z.number().int().nonnegative(),
    preview_lesson_count: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.preview_lesson_count > value.lesson_count) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preview_lesson_count"],
        message: "Prévias não podem exceder as aulas publicadas do módulo.",
      });
    }
  });

export const publicCourseSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(200),
    short_description: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(20_000),
    category: z.string().trim().min(1).max(120),
    language_code: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    level: courseLevelSchema,
    objectives: z.array(z.string().trim().min(1).max(500)).max(50),
    prerequisites: z.array(z.string().trim().min(1).max(500)).max(50),
    price_amount: moneySchema,
    effective_price_amount: moneySchema,
    currency_code: z.string().regex(/^[A-Z]{3}$/),
    promotion_active: z.boolean(),
    access_duration_days: z.number().int().min(1).max(3650).nullable(),
    certificate_enabled: z.boolean(),
    published_at: timestampSchema,
    module_count: z.number().int().nonnegative(),
    lesson_count: z.number().int().nonnegative(),
    duration_minutes: z.number().int().nonnegative(),
    preview_lesson_count: z.number().int().nonnegative(),
    modules: z.array(publicCourseModuleSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.effective_price_amount > value.price_amount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effective_price_amount"],
        message: "Preço efetivo não pode superar o preço normal.",
      });
    }

    if (
      !value.promotion_active &&
      value.effective_price_amount !== value.price_amount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effective_price_amount"],
        message: "Sem promoção ativa, o preço efetivo deve ser o preço normal.",
      });
    }

    const moduleCount = value.modules.length;
    const lessonCount = value.modules.reduce(
      (total, moduleRecord) => total + moduleRecord.lesson_count,
      0,
    );
    const durationMinutes = value.modules.reduce(
      (total, moduleRecord) => total + moduleRecord.duration_minutes,
      0,
    );
    const previewLessonCount = value.modules.reduce(
      (total, moduleRecord) => total + moduleRecord.preview_lesson_count,
      0,
    );

    const derivedValues = [
      ["module_count", value.module_count, moduleCount],
      ["lesson_count", value.lesson_count, lessonCount],
      ["duration_minutes", value.duration_minutes, durationMinutes],
      ["preview_lesson_count", value.preview_lesson_count, previewLessonCount],
    ] as const;

    for (const [path, actual, expected] of derivedValues) {
      if (actual !== expected) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: "Total público diverge dos módulos persistidos.",
        });
      }
    }
  });

export const publicCourseCatalogSchema = z
  .object({ courses: z.array(publicCourseSchema) })
  .strict();

export type PublicCourseModule = z.infer<typeof publicCourseModuleSchema>;
export type PublicCourse = z.infer<typeof publicCourseSchema>;
export type PublicCourseCatalog = z.infer<typeof publicCourseCatalogSchema>;
