import { z } from "zod";

export const studentFavoriteSubjectTypeSchema = z.enum([
  "course",
  "digital_product",
]);

export const studentFavoriteSchema = z.object({
  id: z.string().uuid(),
  subject_type: studentFavoriteSubjectTypeSchema,
  subject_id: z.string().uuid(),
  title: z.string(),
  action_path: z.string(),
  created_at: z.string(),
});

export const studentFavoriteListSchema = z.object({
  total: z.number().int().nonnegative(),
  favorites: z.array(studentFavoriteSchema),
});

export const studentFavoriteToggleResultSchema = z.object({
  subject_type: studentFavoriteSubjectTypeSchema,
  subject_id: z.string().uuid(),
  is_favorite: z.boolean(),
});

export const studentFavoriteStatusSchema = z.boolean();

export type StudentFavoriteSubjectType = z.infer<
  typeof studentFavoriteSubjectTypeSchema
>;
export type StudentFavorite = z.infer<typeof studentFavoriteSchema>;
export type StudentFavoriteList = z.infer<typeof studentFavoriteListSchema>;
