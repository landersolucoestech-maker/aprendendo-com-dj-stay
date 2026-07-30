import { z } from "zod";

export const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const nonBlankTextSchema = z.string().trim().min(1);
const httpsUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => new URL(value).protocol === "https:", "A URL deve utilizar HTTPS.");

export const lessonIdSchema = uuidSchema;

export const lessonRowSchema = z
  .object({
    id: uuidSchema,
    modulo_id: uuidSchema,
    titulo: nonBlankTextSchema.max(200),
    descricao: z.string().nullable(),
    video: httpsUrlSchema.nullable(),
    ordem: z.number().int().nonnegative(),
    duracao: z.number().int().min(1).max(1440).nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const lessonsResponseSchema = z.array(
  lessonRowSchema.pick({
    id: true,
    modulo_id: true,
    titulo: true,
    descricao: true,
    video: true,
    ordem: true,
    duracao: true,
  }),
);

const moduleLessonSchema = lessonRowSchema.pick({
  id: true,
  titulo: true,
  descricao: true,
  video: true,
  ordem: true,
  duracao: true,
});

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

export const progressRowSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    aula_id: uuidSchema,
    completada: z.boolean(),
    progresso_percentual: z.number().int().min(0).max(100),
    tempo_assistido: z.number().int().nonnegative(),
    ultima_visualizacao: timestampSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const progressResponseSchema = z.array(progressRowSchema);

export const progressUpdateInputSchema = z
  .object({
    aulaId: uuidSchema,
    completada: z.boolean(),
    progressoPercentual: z.number().int().min(0).max(100),
    tempoAssistido: z.number().int().nonnegative(),
  })
  .strict();

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
  progressRowSchema.extend({
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
  }),
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

export type LessonRow = z.infer<typeof lessonRowSchema>;
export type ProgressRow = z.infer<typeof progressRowSchema>;
export type ProgressUpdateInput = z.infer<typeof progressUpdateInputSchema>;
export type UserProfileRow = z.infer<typeof userProfileSchema>;
export type ProfileMetadataInput = z.infer<typeof profileMetadataInputSchema>;
