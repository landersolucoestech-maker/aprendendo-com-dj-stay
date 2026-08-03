import { z } from "zod";

import { checkoutSubjectTypeSchema } from "@/contracts/checkout";

const favoriteTimestampSchema = z.string().datetime({ offset: true });
const internalActionPathSchema = z.string().refine(
  (value) =>
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\"),
  {
    message:
      "O caminho de ação deve ser interno, iniciar com uma barra simples e não conter barra invertida.",
  },
);

export const studentFavoriteSubjectTypeSchema = checkoutSubjectTypeSchema;

export const studentFavoriteSchema = z
  .object({
    id: z.string().uuid(),
    subject_type: studentFavoriteSubjectTypeSchema,
    subject_id: z.string().uuid(),
    title: z.string().trim().min(1),
    action_path: internalActionPathSchema,
    created_at: favoriteTimestampSchema,
  })
  .strict();

export const studentFavoriteListSchema = z
  .object({
    total: z.number().int().nonnegative(),
    favorites: z.array(studentFavoriteSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.favorites.length > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["favorites"],
        message: "A página não pode conter mais favoritos que o total.",
      });
    }
  });

export const studentFavoriteToggleResultSchema = z
  .object({
    subject_type: studentFavoriteSubjectTypeSchema,
    subject_id: z.string().uuid(),
    is_favorite: z.boolean(),
  })
  .strict();

export const studentFavoriteStatusSchema = z.boolean();

export type StudentFavoriteSubjectType = z.infer<
  typeof studentFavoriteSubjectTypeSchema
>;
export type StudentFavorite = z.infer<typeof studentFavoriteSchema>;
export type StudentFavoriteList = z.infer<typeof studentFavoriteListSchema>;
