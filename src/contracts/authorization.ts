import { z } from "zod";

export const appRoleSchema = z.enum([
  "aluno",
  "afiliado",
  "administrador_proprietario",
]);

export const userRoleRowSchema = z
  .object({
    user_id: z.string().uuid(),
    role: appRoleSchema,
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

export type AppRole = z.infer<typeof appRoleSchema>;
export type UserRoleRow = z.infer<typeof userRoleRowSchema>;
