import { z } from "zod";

export const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const nonBlankTextSchema = z.string().trim().min(1);
const progressPositionSchema = z.number().int().min(0).max(604_800);
const progressDurationSchema = z.number().int().min(1).max(604_800);
export const lessonIdSchema = uuidSchema;

export const lessonCompletionModeSchema = z.enum([
  "manual",
  "media_progress",
  "reading_acknowledgement",
  "any_activity",
]);

export const lessonContentKindSchema = z.enum(["text", "video", "audio", "mixed"]);

export const lessonProgressEventTypeSchema = z.enum([
  "heartbeat",
  "pause",
  "ended",
  "manual_complete",
  "reading_acknowledgement",
  "visibility_hidden",
]);

const addIssue = (
  context: z.RefinementCtx,
  path: string,
  message: string,
): void => {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
};

const lessonRowObjectSchema = z
  .object({
    id: uuidSchema,
    modulo_id: uuidSchema,
    titulo: nonBlankTextSchema.max(200),
    descricao: z.string().nullable(),
    ordem: z.number().int().nonnegative(),
    duracao: z.number().int().min(1).max(1440).nullable(),
    completion_mode: lessonCompletionModeSchema,
    completion_percent: z.number().int().min(1).max(100).nullable(),
    content_kind: lessonContentKindSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

const validateLessonCompletion = (
  value: {
    completion_mode: z.infer<typeof lessonCompletionModeSchema>;
    completion_percent: number | null;
  },
  context: z.RefinementCtx,
): void => {
  const valid =
    (value.completion_mode === "media_progress" &&
      value.completion_percent !== null) ||
    (value.completion_mode !== "media_progress" &&
      value.completion_percent === null);

  if (!valid) {
    addIssue(
      context,
      "completion_percent",
      "O percentual de conclusão deve acompanhar o modo da aula.",
    );
  }
};

export const lessonRowSchema = lessonRowObjectSchema.superRefine(
  validateLessonCompletion,
);

const lessonResponseItemSchema = lessonRowObjectSchema
  .pick({
    id: true,
    modulo_id: true,
    titulo: true,
    descricao: true,
    ordem: true,
    duracao: true,
    completion_mode: true,
    completion_percent: true,
    content_kind: true,
  })
  .strict()
  .superRefine(validateLessonCompletion);

export const lessonsResponseSchema = z.array(lessonResponseItemSchema);

const moduleLessonSchema = lessonRowObjectSchema
  .pick({
    id: true,
    titulo: true,
    descricao: true,
    ordem: true,
    duracao: true,
  })
  .strict();

export const modulesResponseSchema = z.array(
  z
    .object({
      id: uuidSchema,
      titulo: nonBlankTextSchema.max(200),
      descricao: z.string().nullable(),
      ordem: z.number().int().nonnegative(),
      aulas: z.array(moduleLessonSchema),
    })
    .strict(),
);

const progressRowObjectSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    aula_id: uuidSchema,
    completada: z.boolean(),
    progresso_percentual: z.number().int().min(0).max(100),
    tempo_assistido: z.number().int().nonnegative(),
    ultima_visualizacao: timestampSchema,
    revision: z.number().int().nonnegative(),
    last_event_id: uuidSchema.nullable(),
    last_event_received_at: timestampSchema.nullable(),
    last_client_instance_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

const validateProgressRow = (
  value: z.infer<typeof progressRowObjectSchema>,
  context: z.RefinementCtx,
): void => {
  if (value.completada && value.progresso_percentual !== 100) {
    addIssue(
      context,
      "progresso_percentual",
      "Uma aula concluída deve possuir progresso de 100%.",
    );
  }

  const eventFields = [
    value.last_event_id,
    value.last_event_received_at,
    value.last_client_instance_id,
  ];
  const populatedEventFields = eventFields.filter((field) => field !== null).length;
  const initialStateIsValid = value.revision === 0 && populatedEventFields === 0;
  const eventStateIsValid = value.revision > 0 && populatedEventFields === eventFields.length;

  if (!initialStateIsValid && !eventStateIsValid) {
    addIssue(
      context,
      "revision",
      "A revisão deve ser coerente com os dados do último evento.",
    );
  }
};

export const progressRowSchema = progressRowObjectSchema.superRefine(
  validateProgressRow,
);

export const progressResponseSchema = z.array(progressRowSchema);

export const lessonProgressEventInputSchema = z
  .object({
    lessonId: uuidSchema,
    eventId: uuidSchema,
    clientInstanceId: uuidSchema,
    eventSequence: z.number().int().positive(),
    eventType: lessonProgressEventTypeSchema,
    positionSeconds: progressPositionSchema,
    durationSeconds: progressDurationSchema,
    observedAt: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.positionSeconds > value.durationSeconds + 30) {
      addIssue(
        context,
        "positionSeconds",
        "A posição não pode exceder a duração em mais de 30 segundos.",
      );
    }
  });

export const lessonProgressStreamSchema = z
  .object({
    user_id: uuidSchema,
    aula_id: uuidSchema,
    client_instance_id: uuidSchema,
    auth_session_id: uuidSchema,
    last_event_sequence: z.number().int().positive(),
    last_event_id: uuidSchema,
    last_position_seconds: progressPositionSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const lessonProgressStreamsSchema = z.array(lessonProgressStreamSchema);

export const lessonProgressEventSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    aula_id: uuidSchema,
    client_instance_id: uuidSchema,
    auth_session_id: uuidSchema,
    event_sequence: z.number().int().positive(),
    event_type: lessonProgressEventTypeSchema,
    position_seconds: progressPositionSchema,
    duration_seconds: progressDurationSchema.nullable(),
    calculated_progress_percent: z.number().int().min(0).max(100),
    resulting_completed: z.boolean(),
    accepted: z.boolean(),
    ignored_reason: z.string().min(1).max(100).nullable(),
    resulting_revision: z.number().int().nonnegative(),
    observed_at: timestampSchema,
    received_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const ignoredContractIsValid =
      (value.accepted && value.ignored_reason === null) ||
      (!value.accepted && value.ignored_reason !== null);

    if (!ignoredContractIsValid) {
      addIssue(
        context,
        "ignored_reason",
        "A aceitação do evento deve ser coerente com o motivo de descarte.",
      );
    }

    if (
      value.duration_seconds !== null &&
      value.position_seconds > value.duration_seconds + 30
    ) {
      addIssue(
        context,
        "position_seconds",
        "A posição persistida não pode exceder a duração em mais de 30 segundos.",
      );
    }
  });

export const lessonProgressEventsSchema = z.array(lessonProgressEventSchema);

export const userProfileSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    avatar_asset_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const recentProgressResponseSchema = z.array(
  progressRowObjectSchema
    .extend({
      aulas: z
        .object({
          titulo: nonBlankTextSchema.max(200),
          modulo_id: uuidSchema,
          modulos: z
            .object({
              titulo: nonBlankTextSchema.max(200),
            })
            .strict(),
        })
        .strict(),
    })
    .strict()
    .superRefine(validateProgressRow),
);

const optionalHttpsUrlSchema = z.union([
  z.literal(""),
  z
    .string()
    .max(500)
    .url()
    .refine((value) => new URL(value).protocol === "https:", "A URL deve utilizar HTTPS."),
]);

export const profileMetadataInputSchema = z
  .object({
    name: nonBlankTextSchema.max(120),
    phone: z.string().trim().max(40),
    bio: z.string().trim().max(1000),
    instagram: optionalHttpsUrlSchema,
    youtube: optionalHttpsUrlSchema,
    website: optionalHttpsUrlSchema,
  })
  .strict();

export type LessonCompletionMode = z.infer<typeof lessonCompletionModeSchema>;
export type LessonContentKind = z.infer<typeof lessonContentKindSchema>;
export type LessonProgressEventType = z.infer<typeof lessonProgressEventTypeSchema>;
export type LessonRow = z.infer<typeof lessonRowSchema>;
export type ProgressRow = z.infer<typeof progressRowSchema>;
export type LessonProgressEventInput = z.infer<typeof lessonProgressEventInputSchema>;
export type LessonProgressStream = z.infer<typeof lessonProgressStreamSchema>;
export type LessonProgressEvent = z.infer<typeof lessonProgressEventSchema>;
export type UserProfileRow = z.infer<typeof userProfileSchema>;
export type ProfileMetadataInput = z.infer<typeof profileMetadataInputSchema>;
