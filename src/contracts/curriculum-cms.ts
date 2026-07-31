import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";
import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const optionalDateTimeLocalSchema = z.string().refine(
  (value) => value === "" || !Number.isNaN(new Date(value).getTime()),
  "Data e hora inválidas.",
);

export const curriculumItemStatusSchema = z.enum(["draft", "published", "archived"]);
export const curriculumReleaseModeSchema = z.enum(["immediate", "scheduled", "drip", "after_prerequisites"]);
export const lessonContentKindSchema = z.enum(["text", "video", "audio", "mixed"]);
export const lessonCompletionModeSchema = z.enum(["manual", "media_progress", "reading_acknowledgement", "any_activity"]);
export const lessonMediaProviderSchema = z.enum(["private_asset", "youtube", "vimeo"]);

export const curriculumModuleRowSchema = z.object({
  id: uuidSchema,
  course_id: uuidSchema,
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().max(20_000).nullable(),
  ordem: z.number().int().nonnegative(),
  status: curriculumItemStatusSchema,
  obrigatorio: z.boolean(),
  release_mode: curriculumReleaseModeSchema,
  release_at: nullableTimestampSchema,
  drip_delay_days: z.number().int().min(0).max(3650).nullable(),
  preview_enabled: z.boolean(),
  version: z.number().int().positive(),
  duplicated_from_module_id: uuidSchema.nullable(),
  created_by_user_id: uuidSchema.nullable(),
  updated_by_user_id: uuidSchema.nullable(),
  archived_at: nullableTimestampSchema,
  deleted_at: nullableTimestampSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const curriculumLessonRowSchema = z.object({
  id: uuidSchema,
  modulo_id: uuidSchema,
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().max(20_000).nullable(),
  conteudo_texto: z.string().max(50_000).nullable(),
  ordem: z.number().int().nonnegative(),
  duracao: z.number().int().nonnegative().nullable(),
  status: curriculumItemStatusSchema,
  content_kind: lessonContentKindSchema,
  audio_asset_id: uuidSchema.nullable(),
  obrigatoria: z.boolean(),
  completion_mode: lessonCompletionModeSchema,
  completion_percent: z.number().int().min(1).max(100).nullable(),
  preview_enabled: z.boolean(),
  release_mode: curriculumReleaseModeSchema,
  release_at: nullableTimestampSchema,
  drip_delay_days: z.number().int().min(0).max(3650).nullable(),
  availability_starts_at: nullableTimestampSchema,
  availability_ends_at: nullableTimestampSchema,
  version: z.number().int().positive(),
  duplicated_from_lesson_id: uuidSchema.nullable(),
  created_by_user_id: uuidSchema.nullable(),
  updated_by_user_id: uuidSchema.nullable(),
  archived_at: nullableTimestampSchema,
  deleted_at: nullableTimestampSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const modulePrerequisiteRowSchema = z.object({
  module_id: uuidSchema,
  prerequisite_module_id: uuidSchema,
  created_by_user_id: uuidSchema,
  created_at: timestampSchema,
}).strict();

export const lessonPrerequisiteRowSchema = z.object({
  lesson_id: uuidSchema,
  prerequisite_lesson_id: uuidSchema,
  created_by_user_id: uuidSchema,
  created_at: timestampSchema,
}).strict();

export const lessonMediaRowSchema = z.object({
  id: uuidSchema,
  lesson_id: uuidSchema,
  provider: lessonMediaProviderSchema,
  asset_id: uuidSchema.nullable(),
  external_video_id: z.string().trim().min(1).max(255).nullable(),
  watermark_enabled: z.boolean(),
  is_active: z.boolean(),
  created_by_user_id: uuidSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).strict();

export const curriculumModuleRowsSchema = z.array(curriculumModuleRowSchema);
export const curriculumLessonRowsSchema = z.array(curriculumLessonRowSchema);
export const modulePrerequisiteRowsSchema = z.array(modulePrerequisiteRowSchema);
export const lessonPrerequisiteRowsSchema = z.array(lessonPrerequisiteRowSchema);
export const lessonMediaRowsSchema = z.array(lessonMediaRowSchema);

const releaseContract = <T extends { releaseMode: z.infer<typeof curriculumReleaseModeSchema>; releaseAt: string; dripDelayDays: string }>(
  values: T,
  context: z.RefinementCtx,
) => {
  if (values.releaseMode === "scheduled" && values.releaseAt === "") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["releaseAt"], message: "Informe a data de liberação." });
  }
  if (values.releaseMode === "drip") {
    const days = Number(values.dripDelayDays);
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["dripDelayDays"], message: "Informe de 0 a 3650 dias." });
    }
  }
};

export const moduleFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200),
  description: z.string().max(20_000),
  status: curriculumItemStatusSchema,
  required: z.boolean(),
  releaseMode: curriculumReleaseModeSchema,
  releaseAt: optionalDateTimeLocalSchema,
  dripDelayDays: z.string().regex(/^\d*$/, "Use somente números."),
  previewEnabled: z.boolean(),
  prerequisiteIds: z.array(uuidSchema).max(500),
}).superRefine(releaseContract);

export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(200),
  description: z.string().max(20_000),
  textContent: z.string().max(50_000),
  durationSeconds: z.string().regex(/^\d*$/, "Use somente números."),
  status: curriculumItemStatusSchema,
  contentKind: lessonContentKindSchema,
  required: z.boolean(),
  completionMode: lessonCompletionModeSchema,
  completionPercent: z.string().regex(/^\d*$/, "Use somente números."),
  previewEnabled: z.boolean(),
  releaseMode: curriculumReleaseModeSchema,
  releaseAt: optionalDateTimeLocalSchema,
  dripDelayDays: z.string().regex(/^\d*$/, "Use somente números."),
  availabilityStartsAt: optionalDateTimeLocalSchema,
  availabilityEndsAt: optionalDateTimeLocalSchema,
  prerequisiteIds: z.array(uuidSchema).max(2_000),
}).superRefine((values, context) => {
  releaseContract(values, context);
  if (values.completionMode === "media_progress") {
    const percent = Number(values.completionPercent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["completionPercent"], message: "Informe um percentual entre 1 e 100." });
    }
  }
  if ((values.contentKind === "text" || values.contentKind === "mixed") && values.textContent.trim() === "") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["textContent"], message: "Informe o conteúdo textual." });
  }
  if (values.availabilityStartsAt && values.availabilityEndsAt) {
    if (new Date(values.availabilityEndsAt).getTime() <= new Date(values.availabilityStartsAt).getTime()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["availabilityEndsAt"], message: "O término deve ser posterior ao início." });
    }
  }
});

export type CurriculumModuleRow = z.infer<typeof curriculumModuleRowSchema>;
export type CurriculumLessonRow = z.infer<typeof curriculumLessonRowSchema>;
export type ModulePrerequisiteRow = z.infer<typeof modulePrerequisiteRowSchema>;
export type LessonPrerequisiteRow = z.infer<typeof lessonPrerequisiteRowSchema>;
export type LessonMediaRow = z.infer<typeof lessonMediaRowSchema>;
export type ModuleFormValues = z.infer<typeof moduleFormSchema>;
export type LessonFormValues = z.infer<typeof lessonFormSchema>;

export const emptyModuleFormValues: ModuleFormValues = {
  title: "",
  description: "",
  status: "draft",
  required: true,
  releaseMode: "immediate",
  releaseAt: "",
  dripDelayDays: "",
  previewEnabled: false,
  prerequisiteIds: [],
};

export const emptyLessonFormValues: LessonFormValues = {
  title: "",
  description: "",
  textContent: "",
  durationSeconds: "",
  status: "draft",
  contentKind: "video",
  required: true,
  completionMode: "manual",
  completionPercent: "",
  previewEnabled: false,
  releaseMode: "immediate",
  releaseAt: "",
  dripDelayDays: "",
  availabilityStartsAt: "",
  availabilityEndsAt: "",
  prerequisiteIds: [],
};

const toDateTimeLocal = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => part.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoOrNull = (value: string): string | null => value === "" ? null : new Date(value).toISOString();
const textOrNull = (value: string): string | null => value.trim() === "" ? null : value.trim();

export const moduleToFormValues = (module: CurriculumModuleRow, prerequisiteIds: string[]): ModuleFormValues => ({
  title: module.titulo,
  description: module.descricao ?? "",
  status: module.status,
  required: module.obrigatorio,
  releaseMode: module.release_mode,
  releaseAt: toDateTimeLocal(module.release_at),
  dripDelayDays: module.drip_delay_days?.toString() ?? "",
  previewEnabled: module.preview_enabled,
  prerequisiteIds,
});

export const lessonToFormValues = (lesson: CurriculumLessonRow, prerequisiteIds: string[]): LessonFormValues => ({
  title: lesson.titulo,
  description: lesson.descricao ?? "",
  textContent: lesson.conteudo_texto ?? "",
  durationSeconds: lesson.duracao?.toString() ?? "",
  status: lesson.status,
  contentKind: lesson.content_kind,
  required: lesson.obrigatoria,
  completionMode: lesson.completion_mode,
  completionPercent: lesson.completion_percent?.toString() ?? "",
  previewEnabled: lesson.preview_enabled,
  releaseMode: lesson.release_mode,
  releaseAt: toDateTimeLocal(lesson.release_at),
  dripDelayDays: lesson.drip_delay_days?.toString() ?? "",
  availabilityStartsAt: toDateTimeLocal(lesson.availability_starts_at),
  availabilityEndsAt: toDateTimeLocal(lesson.availability_ends_at),
  prerequisiteIds,
});

export const moduleFormToPayload = (values: ModuleFormValues): Json => ({
  title: values.title.trim(),
  description: textOrNull(values.description),
  status: values.status,
  required: values.required,
  release_mode: values.releaseMode,
  release_at: values.releaseMode === "scheduled" ? toIsoOrNull(values.releaseAt) : null,
  drip_delay_days: values.releaseMode === "drip" ? Number(values.dripDelayDays) : null,
  preview_enabled: values.previewEnabled,
});

export const lessonFormToPayload = (values: LessonFormValues): Json => ({
  title: values.title.trim(),
  description: textOrNull(values.description),
  text_content: textOrNull(values.textContent),
  duration: values.durationSeconds === "" ? null : Number(values.durationSeconds),
  status: values.status,
  content_kind: values.contentKind,
  required: values.required,
  completion_mode: values.completionMode,
  completion_percent: values.completionMode === "media_progress" ? Number(values.completionPercent) : null,
  preview_enabled: values.previewEnabled,
  release_mode: values.releaseMode,
  release_at: values.releaseMode === "scheduled" ? toIsoOrNull(values.releaseAt) : null,
  drip_delay_days: values.releaseMode === "drip" ? Number(values.dripDelayDays) : null,
  availability_starts_at: toIsoOrNull(values.availabilityStartsAt),
  availability_ends_at: toIsoOrNull(values.availabilityEndsAt),
});
