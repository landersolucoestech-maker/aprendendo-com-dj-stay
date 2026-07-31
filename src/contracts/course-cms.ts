import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();

export const courseStatusSchema = z.enum(["draft", "published", "archived"]);
export const courseLevelSchema = z.enum(["beginner", "intermediate", "advanced", "all_levels"]);
export const courseReleaseModeSchema = z.enum(["immediate", "scheduled", "drip"]);
export const courseCompletionModeSchema = z.enum(["all_required_lessons", "percentage", "manual"]);

export const courseCmsRowSchema = z.object({
  id: uuidSchema,
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  status: courseStatusSchema,
  access_duration_days: z.number().int().min(1).max(3650).nullable(),
  short_description: z.string().trim().min(1).max(500).nullable(),
  description: z.string().trim().min(1).max(20000).nullable(),
  category: z.string().trim().min(1).max(120).nullable(),
  language_code: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  level: courseLevelSchema,
  objectives: z.array(z.string().trim().min(1).max(500)).max(50),
  prerequisites: z.array(z.string().trim().min(1).max(500)).max(50),
  cover_asset_id: uuidSchema.nullable(),
  thumbnail_asset_id: uuidSchema.nullable(),
  price_amount: z.number().nonnegative(),
  currency_code: z.string().regex(/^[A-Z]{3}$/),
  promotional_price_amount: z.number().nonnegative().nullable(),
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
}).strict();

export const courseCmsRowsSchema = z.array(courseCmsRowSchema);

const optionalDateTimeLocalSchema = z.string().refine(
  (value) => value === "" || !Number.isNaN(new Date(value).getTime()),
  "Data e hora inválidas.",
);

export const courseFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use somente letras minúsculas, números e hífens."),
  shortDescription: z.string().trim().max(500),
  description: z.string().trim().max(20000),
  category: z.string().trim().max(120),
  languageCode: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, "Use o formato pt-BR ou en."),
  level: courseLevelSchema,
  objectivesText: z.string().max(26000),
  prerequisitesText: z.string().max(26000),
  coverAssetId: z.union([z.literal(""), uuidSchema]),
  thumbnailAssetId: z.union([z.literal(""), uuidSchema]),
  priceAmount: z.coerce.number().min(0).max(9999999999),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  promotionalPriceAmount: z.union([z.literal(""), z.coerce.number().min(0).max(9999999999)]),
  promotionStartsAt: optionalDateTimeLocalSchema,
  promotionEndsAt: optionalDateTimeLocalSchema,
  availabilityStartsAt: optionalDateTimeLocalSchema,
  availabilityEndsAt: optionalDateTimeLocalSchema,
  accessDurationDays: z.union([z.literal(""), z.coerce.number().int().min(1).max(3650)]),
  completionMode: courseCompletionModeSchema,
  completionRequiredPercent: z.coerce.number().int().min(1).max(100),
  certificateEnabled: z.boolean(),
  certificateMinCompletionPercent: z.coerce.number().int().min(1).max(100),
  releaseMode: courseReleaseModeSchema,
  releaseAt: optionalDateTimeLocalSchema,
  dripIntervalDays: z.union([z.literal(""), z.coerce.number().int().min(1).max(365)]),
  affiliateEligible: z.boolean(),
  previewEnabled: z.boolean(),
}).superRefine((value, context) => {
  if (value.promotionalPriceAmount !== "" && value.promotionalPriceAmount >= value.priceAmount) {
    context.addIssue({ code: "custom", path: ["promotionalPriceAmount"], message: "O preço promocional deve ser menor que o preço normal." });
  }
  if (value.promotionEndsAt !== "" && value.promotionStartsAt === "") {
    context.addIssue({ code: "custom", path: ["promotionStartsAt"], message: "Informe o início da promoção." });
  }
  if (value.releaseMode === "scheduled" && value.releaseAt === "") {
    context.addIssue({ code: "custom", path: ["releaseAt"], message: "Informe a data da liberação." });
  }
  if (value.releaseMode === "drip" && value.dripIntervalDays === "") {
    context.addIssue({ code: "custom", path: ["dripIntervalDays"], message: "Informe o intervalo da liberação gradual." });
  }
});

export type CourseCmsRow = z.infer<typeof courseCmsRowSchema>;
export type CourseFormValues = z.infer<typeof courseFormSchema>;

const splitLines = (value: string): string[] => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const dateTimeToIso = (value: string): string | null => value === "" ? null : new Date(value).toISOString();
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

export const courseToFormValues = (course: CourseCmsRow): CourseFormValues => ({
  title: course.title,
  slug: course.slug,
  shortDescription: course.short_description ?? "",
  description: course.description ?? "",
  category: course.category ?? "",
  languageCode: course.language_code,
  level: course.level,
  objectivesText: course.objectives.join("\n"),
  prerequisitesText: course.prerequisites.join("\n"),
  coverAssetId: course.cover_asset_id ?? "",
  thumbnailAssetId: course.thumbnail_asset_id ?? "",
  priceAmount: course.price_amount,
  currencyCode: course.currency_code,
  promotionalPriceAmount: course.promotional_price_amount ?? "",
  promotionStartsAt: isoToDateTimeLocal(course.promotion_starts_at),
  promotionEndsAt: isoToDateTimeLocal(course.promotion_ends_at),
  availabilityStartsAt: isoToDateTimeLocal(course.availability_starts_at),
  availabilityEndsAt: isoToDateTimeLocal(course.availability_ends_at),
  accessDurationDays: course.access_duration_days ?? "",
  completionMode: course.completion_mode,
  completionRequiredPercent: course.completion_required_percent,
  certificateEnabled: course.certificate_enabled,
  certificateMinCompletionPercent: course.certificate_min_completion_percent,
  releaseMode: course.release_mode,
  releaseAt: isoToDateTimeLocal(course.release_at),
  dripIntervalDays: course.drip_interval_days ?? "",
  affiliateEligible: course.affiliate_eligible,
  previewEnabled: course.preview_enabled,
});

export const courseFormToPayload = (values: CourseFormValues) => ({
  title: values.title.trim(),
  slug: values.slug.trim(),
  short_description: values.shortDescription.trim() || null,
  description: values.description.trim() || null,
  category: values.category.trim() || null,
  language_code: values.languageCode,
  level: values.level,
  objectives: splitLines(values.objectivesText),
  prerequisites: splitLines(values.prerequisitesText),
  cover_asset_id: values.coverAssetId || null,
  thumbnail_asset_id: values.thumbnailAssetId || null,
  price_amount: values.priceAmount,
  currency_code: values.currencyCode,
  promotional_price_amount: values.promotionalPriceAmount === "" ? null : values.promotionalPriceAmount,
  promotion_starts_at: dateTimeToIso(values.promotionStartsAt),
  promotion_ends_at: dateTimeToIso(values.promotionEndsAt),
  availability_starts_at: dateTimeToIso(values.availabilityStartsAt),
  availability_ends_at: dateTimeToIso(values.availabilityEndsAt),
  access_duration_days: values.accessDurationDays === "" ? null : values.accessDurationDays,
  completion_mode: values.completionMode,
  completion_required_percent: values.completionRequiredPercent,
  certificate_enabled: values.certificateEnabled,
  certificate_min_completion_percent: values.certificateMinCompletionPercent,
  release_mode: values.releaseMode,
  release_at: values.releaseMode === "scheduled" ? dateTimeToIso(values.releaseAt) : null,
  drip_interval_days: values.releaseMode === "drip" ? values.dripIntervalDays || null : null,
  affiliate_eligible: values.affiliateEligible,
  preview_enabled: values.previewEnabled,
});
