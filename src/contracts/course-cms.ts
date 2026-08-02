import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const maximumCourseAmount = 9_999_999_999.99;
const courseTextItemSchema = z.string().trim().min(1).max(500);
const courseTextArraySchema = z.array(courseTextItemSchema).max(50);

export const courseStatusSchema = z.enum(["draft", "published", "archived"]);
export const courseLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "all_levels",
]);
export const courseReleaseModeSchema = z.enum([
  "immediate",
  "scheduled",
  "drip",
]);
export const courseCompletionModeSchema = z.enum([
  "all_required_lessons",
  "percentage",
  "manual",
]);

const isAfter = (end: string, start: string): boolean =>
  new Date(end).getTime() > new Date(start).getTime();

export const courseCmsRowSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: courseStatusSchema,
    access_duration_days: z.number().int().min(1).max(3650).nullable(),
    short_description: z.string().trim().min(1).max(500).nullable(),
    description: z.string().trim().min(1).max(20000).nullable(),
    category: z.string().trim().min(1).max(120).nullable(),
    language_code: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    level: courseLevelSchema,
    objectives: courseTextArraySchema,
    prerequisites: courseTextArraySchema,
    cover_asset_id: uuidSchema.nullable(),
    thumbnail_asset_id: uuidSchema.nullable(),
    price_amount: z.number().finite().min(0).max(maximumCourseAmount),
    currency_code: z.string().regex(/^[A-Z]{3}$/),
    promotional_price_amount: z
      .number()
      .finite()
      .min(0)
      .max(maximumCourseAmount)
      .nullable(),
    promotion_starts_at: nullableTimestampSchema,
    promotion_ends_at: nullableTimestampSchema,
    availability_starts_at: nullableTimestampSchema,
    availability_ends_at: nullableTimestampSchema,
    completion_mode: courseCompletionModeSchema,
    completion_required_percent: z.number().int().min(1).max(100),
    certificate_enabled: z.boolean(),
    certificate_min_completion_percent: z.number().int().min(1).max(100),
    release_mode: courseReleaseModeSchema,
    release_at: nullableTimestampSchema,
    drip_interval_days: z.number().int().min(1).max(365).nullable(),
    affiliate_eligible: z.boolean(),
    preview_enabled: z.boolean(),
    published_at: nullableTimestampSchema,
    unpublished_at: nullableTimestampSchema,
    archived_at: nullableTimestampSchema,
    deleted_at: nullableTimestampSchema,
    duplicated_from_course_id: uuidSchema.nullable(),
    created_by_user_id: uuidSchema.nullable(),
    updated_by_user_id: uuidSchema.nullable(),
    version: z.number().int().positive(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.promotional_price_amount !== null &&
      value.promotional_price_amount >= value.price_amount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotional_price_amount"],
        message: "Preço promocional deve ser menor que o preço normal.",
      });
    }

    if (
      value.promotion_ends_at !== null &&
      value.promotion_starts_at === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotion_starts_at"],
        message: "Fim de promoção exige horário inicial.",
      });
    }

    if (
      value.promotion_starts_at !== null &&
      value.promotion_ends_at !== null &&
      !isAfter(value.promotion_ends_at, value.promotion_starts_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotion_ends_at"],
        message: "Fim da promoção deve ser posterior ao início.",
      });
    }

    if (
      value.availability_starts_at !== null &&
      value.availability_ends_at !== null &&
      !isAfter(value.availability_ends_at, value.availability_starts_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availability_ends_at"],
        message: "Fim da disponibilidade deve ser posterior ao início.",
      });
    }

    const releaseContractIsValid =
      (value.release_mode === "immediate" &&
        value.release_at === null &&
        value.drip_interval_days === null) ||
      (value.release_mode === "scheduled" &&
        value.release_at !== null &&
        value.drip_interval_days === null) ||
      (value.release_mode === "drip" &&
        value.release_at === null &&
        value.drip_interval_days !== null);

    if (!releaseContractIsValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["release_mode"],
        message: "Modo de liberação diverge de data ou intervalo persistido.",
      });
    }

    if (value.status === "published" && value.published_at === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["published_at"],
        message: "Curso publicado exige horário de publicação.",
      });
    }

    if (value.status === "archived" && value.archived_at === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["archived_at"],
        message: "Curso arquivado exige horário de arquivamento.",
      });
    }

    if (value.deleted_at !== null && value.status !== "archived") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deleted_at"],
        message: "Curso excluído deve permanecer arquivado.",
      });
    }
  });

export const courseCmsRowsSchema = z.array(courseCmsRowSchema);

const optionalDateTimeLocalSchema = z.union([
  z.literal(""),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use data e hora completas.")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Data e hora inválidas.",
    ),
]);

const splitLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const validateTextLines = (
  value: string,
  path: "objectivesText" | "prerequisitesText",
  context: z.RefinementCtx,
): void => {
  const lines = splitLines(value);

  if (lines.length > 50) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: "Informe no máximo 50 itens.",
    });
  }

  if (lines.some((line) => line.length > 500)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: "Cada item deve conter no máximo 500 caracteres.",
    });
  }
};

export const courseFormSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título.").max(200),
    slug: z
      .string()
      .trim()
      .max(200)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use somente letras minúsculas, números e hífens.",
      ),
    shortDescription: z.string().trim().max(500),
    description: z.string().trim().max(20000),
    category: z.string().trim().max(120),
    languageCode: z
      .string()
      .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "Use o formato pt-BR ou en."),
    level: courseLevelSchema,
    objectivesText: z.string().max(26000),
    prerequisitesText: z.string().max(26000),
    coverAssetId: z.union([z.literal(""), uuidSchema]),
    thumbnailAssetId: z.union([z.literal(""), uuidSchema]),
    priceAmount: z.coerce.number().min(0).max(maximumCourseAmount),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    promotionalPriceAmount: z.union([
      z.literal(""),
      z.coerce.number().min(0).max(maximumCourseAmount),
    ]),
    promotionStartsAt: optionalDateTimeLocalSchema,
    promotionEndsAt: optionalDateTimeLocalSchema,
    availabilityStartsAt: optionalDateTimeLocalSchema,
    availabilityEndsAt: optionalDateTimeLocalSchema,
    accessDurationDays: z.union([
      z.literal(""),
      z.coerce.number().int().min(1).max(3650),
    ]),
    completionMode: courseCompletionModeSchema,
    completionRequiredPercent: z.coerce.number().int().min(1).max(100),
    certificateEnabled: z.boolean(),
    certificateMinCompletionPercent: z.coerce.number().int().min(1).max(100),
    releaseMode: courseReleaseModeSchema,
    releaseAt: optionalDateTimeLocalSchema,
    dripIntervalDays: z.union([
      z.literal(""),
      z.coerce.number().int().min(1).max(365),
    ]),
    affiliateEligible: z.boolean(),
    previewEnabled: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    validateTextLines(value.objectivesText, "objectivesText", context);
    validateTextLines(value.prerequisitesText, "prerequisitesText", context);

    if (
      value.promotionalPriceAmount !== "" &&
      value.promotionalPriceAmount >= value.priceAmount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotionalPriceAmount"],
        message: "O preço promocional deve ser menor que o preço normal.",
      });
    }

    if (value.promotionEndsAt !== "" && value.promotionStartsAt === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotionStartsAt"],
        message: "Informe o início da promoção.",
      });
    }

    if (
      value.promotionStartsAt !== "" &&
      value.promotionEndsAt !== "" &&
      !isAfter(value.promotionEndsAt, value.promotionStartsAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promotionEndsAt"],
        message: "O fim da promoção deve ser posterior ao início.",
      });
    }

    if (
      value.availabilityStartsAt !== "" &&
      value.availabilityEndsAt !== "" &&
      !isAfter(value.availabilityEndsAt, value.availabilityStartsAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availabilityEndsAt"],
        message: "O fim da disponibilidade deve ser posterior ao início.",
      });
    }

    if (value.releaseMode === "scheduled" && value.releaseAt === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["releaseAt"],
        message: "Informe a data da liberação.",
      });
    }

    if (value.releaseMode === "drip" && value.dripIntervalDays === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dripIntervalDays"],
        message: "Informe o intervalo da liberação gradual.",
      });
    }
  });

export type CourseCmsRow = z.infer<typeof courseCmsRowSchema>;
export type CourseFormValues = z.infer<typeof courseFormSchema>;

const dateTimeToIso = (value: string): string | null =>
  value === "" ? null : new Date(value).toISOString();

const isoToDateTimeLocal = (value: string | null): string => {
  if (value === null) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const emptyCourseFormValues: CourseFormValues = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  category: "",
  languageCode: "pt-BR",
  level: "all_levels",
  objectivesText: "",
  prerequisitesText: "",
  coverAssetId: "",
  thumbnailAssetId: "",
  priceAmount: 0,
  currencyCode: "BRL",
  promotionalPriceAmount: "",
  promotionStartsAt: "",
  promotionEndsAt: "",
  availabilityStartsAt: "",
  availabilityEndsAt: "",
  accessDurationDays: "",
  completionMode: "all_required_lessons",
  completionRequiredPercent: 100,
  certificateEnabled: false,
  certificateMinCompletionPercent: 100,
  releaseMode: "immediate",
  releaseAt: "",
  dripIntervalDays: "",
  affiliateEligible: false,
  previewEnabled: true,
};

export const courseToFormValues = (course: CourseCmsRow): CourseFormValues => {
  const value = courseCmsRowSchema.parse(course);

  return {
    title: value.title,
    slug: value.slug,
    shortDescription: value.short_description ?? "",
    description: value.description ?? "",
    category: value.category ?? "",
    languageCode: value.language_code,
    level: value.level,
    objectivesText: value.objectives.join("\n"),
    prerequisitesText: value.prerequisites.join("\n"),
    coverAssetId: value.cover_asset_id ?? "",
    thumbnailAssetId: value.thumbnail_asset_id ?? "",
    priceAmount: value.price_amount,
    currencyCode: value.currency_code,
    promotionalPriceAmount: value.promotional_price_amount ?? "",
    promotionStartsAt: isoToDateTimeLocal(value.promotion_starts_at),
    promotionEndsAt: isoToDateTimeLocal(value.promotion_ends_at),
    availabilityStartsAt: isoToDateTimeLocal(value.availability_starts_at),
    availabilityEndsAt: isoToDateTimeLocal(value.availability_ends_at),
    accessDurationDays: value.access_duration_days ?? "",
    completionMode: value.completion_mode,
    completionRequiredPercent: value.completion_required_percent,
    certificateEnabled: value.certificate_enabled,
    certificateMinCompletionPercent: value.certificate_min_completion_percent,
    releaseMode: value.release_mode,
    releaseAt: isoToDateTimeLocal(value.release_at),
    dripIntervalDays: value.drip_interval_days ?? "",
    affiliateEligible: value.affiliate_eligible,
    previewEnabled: value.preview_enabled,
  };
};

export const courseFormToPayload = (values: CourseFormValues) => {
  const value = courseFormSchema.parse(values);

  return {
    title: value.title.trim(),
    slug: value.slug.trim(),
    short_description: value.shortDescription.trim() || null,
    description: value.description.trim() || null,
    category: value.category.trim() || null,
    language_code: value.languageCode,
    level: value.level,
    objectives: splitLines(value.objectivesText),
    prerequisites: splitLines(value.prerequisitesText),
    cover_asset_id: value.coverAssetId || null,
    thumbnail_asset_id: value.thumbnailAssetId || null,
    price_amount: value.priceAmount,
    currency_code: value.currencyCode,
    promotional_price_amount:
      value.promotionalPriceAmount === ""
        ? null
        : value.promotionalPriceAmount,
    promotion_starts_at: dateTimeToIso(value.promotionStartsAt),
    promotion_ends_at: dateTimeToIso(value.promotionEndsAt),
    availability_starts_at: dateTimeToIso(value.availabilityStartsAt),
    availability_ends_at: dateTimeToIso(value.availabilityEndsAt),
    access_duration_days:
      value.accessDurationDays === "" ? null : value.accessDurationDays,
    completion_mode: value.completionMode,
    completion_required_percent: value.completionRequiredPercent,
    certificate_enabled: value.certificateEnabled,
    certificate_min_completion_percent: value.certificateMinCompletionPercent,
    release_mode: value.releaseMode,
    release_at:
      value.releaseMode === "scheduled"
        ? dateTimeToIso(value.releaseAt)
        : null,
    drip_interval_days:
      value.releaseMode === "drip" ? value.dripIntervalDays || null : null,
    affiliate_eligible: value.affiliateEligible,
    preview_enabled: value.previewEnabled,
  };
};
