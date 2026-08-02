import { z } from "zod";

import type { Json } from "@/integrations/supabase/types";
import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const nullableTrimmedTextSchema = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable();

const dateTimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const isValidDateTimeLocal = (value: string): boolean => {
  if (!dateTimeLocalPattern.test(value)) return false;

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
};

const optionalDateTimeLocalSchema = z.string().refine(
  (value) => value === "" || isValidDateTimeLocal(value),
  "Data e hora inválidas.",
);

export const curriculumItemStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
]);
export const curriculumReleaseModeSchema = z.enum([
  "immediate",
  "scheduled",
  "drip",
  "after_prerequisites",
]);
export const lessonContentKindSchema = z.enum([
  "text",
  "video",
  "audio",
  "mixed",
]);
export const lessonCompletionModeSchema = z.enum([
  "manual",
  "media_progress",
  "reading_acknowledgement",
  "any_activity",
]);
export const lessonMediaProviderSchema = z.enum([
  "private_asset",
  "youtube",
  "vimeo",
]);

type PersistedReleaseContract = {
  readonly release_mode: z.infer<typeof curriculumReleaseModeSchema>;
  readonly release_at: string | null;
  readonly drip_delay_days: number | null;
};

const persistedReleaseContractIsValid = (
  value: PersistedReleaseContract,
): boolean => {
  if (value.release_mode === "immediate") {
    return value.release_at === null && value.drip_delay_days === null;
  }
  if (value.release_mode === "scheduled") {
    return value.release_at !== null && value.drip_delay_days === null;
  }
  if (value.release_mode === "drip") {
    return value.release_at === null && value.drip_delay_days !== null;
  }
  return value.release_at === null && value.drip_delay_days === null;
};

const validatePersistedRelease = (
  value: PersistedReleaseContract,
  context: z.RefinementCtx,
): void => {
  if (!persistedReleaseContractIsValid(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["release_mode"],
      message: "Contrato de liberação persistido inválido.",
    });
  }
};

const validateLifecycle = (
  value: {
    readonly status: z.infer<typeof curriculumItemStatusSchema>;
    readonly archived_at: string | null;
    readonly deleted_at: string | null;
  },
  context: z.RefinementCtx,
): void => {
  if (value.status === "archived" && value.archived_at === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["archived_at"],
      message: "Item arquivado exige horário de arquivamento.",
    });
  }

  if (value.deleted_at !== null && value.status !== "archived") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deleted_at"],
      message: "Item excluído deve permanecer arquivado.",
    });
  }
};

export const curriculumModuleRowSchema = z
  .object({
    id: uuidSchema,
    course_id: uuidSchema,
    titulo: z.string().trim().min(1).max(200),
    descricao: nullableTrimmedTextSchema(20_000),
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
  })
  .strict()
  .superRefine((value, context) => {
    validatePersistedRelease(value, context);
    validateLifecycle(value, context);
  });

export const curriculumLessonRowSchema = z
  .object({
    id: uuidSchema,
    modulo_id: uuidSchema,
    titulo: z.string().trim().min(1).max(200),
    descricao: nullableTrimmedTextSchema(20_000),
    conteudo_texto: nullableTrimmedTextSchema(50_000),
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
  })
  .strict()
  .superRefine((value, context) => {
    validatePersistedRelease(value, context);
    validateLifecycle(value, context);

    const requiresPercent = value.completion_mode === "media_progress";
    if (requiresPercent !== (value.completion_percent !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completion_percent"],
        message: "Percentual deve existir somente para progresso de mídia.",
      });
    }

    if (
      (value.content_kind === "text" || value.content_kind === "mixed") &&
      value.conteudo_texto === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conteudo_texto"],
        message: "Aula textual ou mista exige conteúdo textual.",
      });
    }

    if (
      value.availability_starts_at !== null &&
      value.availability_ends_at !== null &&
      Date.parse(value.availability_ends_at) <=
        Date.parse(value.availability_starts_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availability_ends_at"],
        message: "O término da disponibilidade deve ser posterior ao início.",
      });
    }
  });

export const modulePrerequisiteRowSchema = z
  .object({
    module_id: uuidSchema,
    prerequisite_module_id: uuidSchema,
    created_by_user_id: uuidSchema,
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.module_id === value.prerequisite_module_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prerequisite_module_id"],
        message: "Módulo não pode exigir a si próprio.",
      });
    }
  });

export const lessonPrerequisiteRowSchema = z
  .object({
    lesson_id: uuidSchema,
    prerequisite_lesson_id: uuidSchema,
    created_by_user_id: uuidSchema,
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.lesson_id === value.prerequisite_lesson_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prerequisite_lesson_id"],
        message: "Aula não pode exigir a si própria.",
      });
    }
  });

export const lessonMediaRowSchema = z
  .object({
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
  })
  .strict()
  .superRefine((value, context) => {
    const isPrivate = value.provider === "private_asset";
    const hasAsset = value.asset_id !== null;
    const hasExternalId = value.external_video_id !== null;

    if (isPrivate && (!hasAsset || hasExternalId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provider"],
        message: "Mídia privada exige asset e não aceita identificador externo.",
      });
    }

    if (!isPrivate && (hasAsset || !hasExternalId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provider"],
        message: "Mídia externa exige identificador e não aceita asset privado.",
      });
    }
  });

export const curriculumModuleRowsSchema = z.array(curriculumModuleRowSchema);
export const curriculumLessonRowsSchema = z.array(curriculumLessonRowSchema);
export const modulePrerequisiteRowsSchema = z.array(modulePrerequisiteRowSchema);
export const lessonPrerequisiteRowsSchema = z.array(lessonPrerequisiteRowSchema);
export const lessonMediaRowsSchema = z.array(lessonMediaRowSchema);

const prerequisiteIdsSchema = z.array(uuidSchema).max(2_000);

const validatePrerequisiteIds = (
  prerequisiteIds: readonly string[],
  entityId: string | undefined,
  context: z.RefinementCtx,
): void => {
  if (new Set(prerequisiteIds).size !== prerequisiteIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prerequisiteIds"],
      message: "Pré-requisitos duplicados não são permitidos.",
    });
  }

  if (entityId !== undefined && prerequisiteIds.includes(entityId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prerequisiteIds"],
      message: "Item não pode exigir a si próprio.",
    });
  }
};

type ReleaseFormValue = {
  readonly releaseMode: z.infer<typeof curriculumReleaseModeSchema>;
  readonly releaseAt: string;
  readonly dripDelayDays: string;
  readonly prerequisiteIds: readonly string[];
};

const validateReleaseForm = (
  value: ReleaseFormValue,
  context: z.RefinementCtx,
): void => {
  if (value.releaseMode === "scheduled" && value.releaseAt === "") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["releaseAt"],
      message: "Informe a data de liberação.",
    });
  }

  if (value.releaseMode === "drip") {
    const days = Number(value.dripDelayDays);
    if (!Number.isInteger(days) || days < 0 || days > 3650) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dripDelayDays"],
        message: "Informe de 0 a 3650 dias.",
      });
    }
  }

  if (
    value.releaseMode === "after_prerequisites" &&
    value.prerequisiteIds.length === 0
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prerequisiteIds"],
      message: "Liberação por pré-requisitos exige ao menos um item.",
    });
  }
};

export const moduleFormSchema = z
  .object({
    entityId: uuidSchema.optional(),
    title: z.string().trim().min(1, "Informe o título.").max(200),
    description: z.string().trim().max(20_000),
    status: curriculumItemStatusSchema,
    required: z.boolean(),
    releaseMode: curriculumReleaseModeSchema,
    releaseAt: optionalDateTimeLocalSchema,
    dripDelayDays: z.string().regex(/^\d*$/, "Use somente números."),
    previewEnabled: z.boolean(),
    prerequisiteIds: prerequisiteIdsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateReleaseForm(value, context);
    validatePrerequisiteIds(value.prerequisiteIds, value.entityId, context);
  });

export const lessonFormSchema = z
  .object({
    entityId: uuidSchema.optional(),
    title: z.string().trim().min(1, "Informe o título.").max(200),
    description: z.string().trim().max(20_000),
    textContent: z.string().trim().max(50_000),
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
    prerequisiteIds: prerequisiteIdsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateReleaseForm(value, context);
    validatePrerequisiteIds(value.prerequisiteIds, value.entityId, context);

    if (value.durationSeconds !== "") {
      const duration = Number(value.durationSeconds);
      if (!Number.isSafeInteger(duration) || duration < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["durationSeconds"],
          message: "A duração deve ser um inteiro não negativo.",
        });
      }
    }

    if (value.completionMode === "media_progress") {
      const percent = Number(value.completionPercent);
      if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["completionPercent"],
          message: "Informe um percentual entre 1 e 100.",
        });
      }
    }

    if (
      (value.contentKind === "text" || value.contentKind === "mixed") &&
      value.textContent.trim() === ""
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["textContent"],
        message: "Informe o conteúdo textual.",
      });
    }

    if (
      value.availabilityStartsAt !== "" &&
      value.availabilityEndsAt !== "" &&
      Date.parse(value.availabilityEndsAt) <=
        Date.parse(value.availabilityStartsAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availabilityEndsAt"],
        message: "O término deve ser posterior ao início.",
      });
    }
  });

const modulePayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: nullableTrimmedTextSchema(20_000),
    status: curriculumItemStatusSchema,
    required: z.boolean(),
    release_mode: curriculumReleaseModeSchema,
    release_at: nullableTimestampSchema,
    drip_delay_days: z.number().int().min(0).max(3650).nullable(),
    preview_enabled: z.boolean(),
  })
  .strict()
  .superRefine(validatePersistedRelease);

const lessonPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: nullableTrimmedTextSchema(20_000),
    text_content: nullableTrimmedTextSchema(50_000),
    duration: z.number().int().nonnegative().nullable(),
    status: curriculumItemStatusSchema,
    content_kind: lessonContentKindSchema,
    required: z.boolean(),
    completion_mode: lessonCompletionModeSchema,
    completion_percent: z.number().int().min(1).max(100).nullable(),
    preview_enabled: z.boolean(),
    release_mode: curriculumReleaseModeSchema,
    release_at: nullableTimestampSchema,
    drip_delay_days: z.number().int().min(0).max(3650).nullable(),
    availability_starts_at: nullableTimestampSchema,
    availability_ends_at: nullableTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validatePersistedRelease(value, context);

    if (
      (value.completion_mode === "media_progress") !==
      (value.completion_percent !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completion_percent"],
        message: "Percentual deve existir somente para progresso de mídia.",
      });
    }

    if (
      (value.content_kind === "text" || value.content_kind === "mixed") &&
      value.text_content === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text_content"],
        message: "Aula textual ou mista exige conteúdo textual.",
      });
    }

    if (
      value.availability_starts_at !== null &&
      value.availability_ends_at !== null &&
      Date.parse(value.availability_ends_at) <=
        Date.parse(value.availability_starts_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availability_ends_at"],
        message: "O término deve ser posterior ao início.",
      });
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
  if (value === null) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string): string | null =>
  value === "" ? null : new Date(value).toISOString();
const textOrNull = (value: string): string | null =>
  value.trim() === "" ? null : value.trim();

export const moduleToFormValues = (
  module: CurriculumModuleRow,
  prerequisiteIds: string[],
): ModuleFormValues => {
  const parsedModule = curriculumModuleRowSchema.parse(module);
  return moduleFormSchema.parse({
    entityId: parsedModule.id,
    title: parsedModule.titulo,
    description: parsedModule.descricao ?? "",
    status: parsedModule.status,
    required: parsedModule.obrigatorio,
    releaseMode: parsedModule.release_mode,
    releaseAt: toDateTimeLocal(parsedModule.release_at),
    dripDelayDays: parsedModule.drip_delay_days?.toString() ?? "",
    previewEnabled: parsedModule.preview_enabled,
    prerequisiteIds,
  });
};

export const lessonToFormValues = (
  lesson: CurriculumLessonRow,
  prerequisiteIds: string[],
): LessonFormValues => {
  const parsedLesson = curriculumLessonRowSchema.parse(lesson);
  return lessonFormSchema.parse({
    entityId: parsedLesson.id,
    title: parsedLesson.titulo,
    description: parsedLesson.descricao ?? "",
    textContent: parsedLesson.conteudo_texto ?? "",
    durationSeconds: parsedLesson.duracao?.toString() ?? "",
    status: parsedLesson.status,
    contentKind: parsedLesson.content_kind,
    required: parsedLesson.obrigatoria,
    completionMode: parsedLesson.completion_mode,
    completionPercent: parsedLesson.completion_percent?.toString() ?? "",
    previewEnabled: parsedLesson.preview_enabled,
    releaseMode: parsedLesson.release_mode,
    releaseAt: toDateTimeLocal(parsedLesson.release_at),
    dripDelayDays: parsedLesson.drip_delay_days?.toString() ?? "",
    availabilityStartsAt: toDateTimeLocal(parsedLesson.availability_starts_at),
    availabilityEndsAt: toDateTimeLocal(parsedLesson.availability_ends_at),
    prerequisiteIds,
  });
};

export const moduleFormToPayload = (values: ModuleFormValues): Json => {
  const parsed = moduleFormSchema.parse(values);
  return modulePayloadSchema.parse({
    title: parsed.title,
    description: textOrNull(parsed.description),
    status: parsed.status,
    required: parsed.required,
    release_mode: parsed.releaseMode,
    release_at:
      parsed.releaseMode === "scheduled"
        ? toIsoOrNull(parsed.releaseAt)
        : null,
    drip_delay_days:
      parsed.releaseMode === "drip" ? Number(parsed.dripDelayDays) : null,
    preview_enabled: parsed.previewEnabled,
  });
};

export const lessonFormToPayload = (values: LessonFormValues): Json => {
  const parsed = lessonFormSchema.parse(values);
  return lessonPayloadSchema.parse({
    title: parsed.title,
    description: textOrNull(parsed.description),
    text_content: textOrNull(parsed.textContent),
    duration:
      parsed.durationSeconds === "" ? null : Number(parsed.durationSeconds),
    status: parsed.status,
    content_kind: parsed.contentKind,
    required: parsed.required,
    completion_mode: parsed.completionMode,
    completion_percent:
      parsed.completionMode === "media_progress"
        ? Number(parsed.completionPercent)
        : null,
    preview_enabled: parsed.previewEnabled,
    release_mode: parsed.releaseMode,
    release_at:
      parsed.releaseMode === "scheduled"
        ? toIsoOrNull(parsed.releaseAt)
        : null,
    drip_delay_days:
      parsed.releaseMode === "drip" ? Number(parsed.dripDelayDays) : null,
    availability_starts_at: toIsoOrNull(parsed.availabilityStartsAt),
    availability_ends_at: toIsoOrNull(parsed.availabilityEndsAt),
  });
};
