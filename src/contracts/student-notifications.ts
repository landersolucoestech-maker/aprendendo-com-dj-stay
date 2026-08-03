import { z } from "zod";

const notificationTimestampSchema = z.string().datetime({ offset: true });
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

export const studentNotificationTypeSchema = z.enum([
  "support_reply",
  "payment_confirmed",
  "access_granted",
  "certificate_issued",
  "system",
]);

export const studentNotificationSchema = z
  .object({
    id: z.string().uuid(),
    type: studentNotificationTypeSchema,
    title: z.string().trim().min(3).max(160),
    message: z.string().trim().min(3).max(1000),
    action_path: internalActionPathSchema.nullable(),
    source_entity_type: z.string().trim().min(1).nullable(),
    source_entity_id: z.string().uuid().nullable(),
    read_at: notificationTimestampSchema.nullable(),
    created_at: notificationTimestampSchema,
  })
  .strict();

export const studentNotificationListSchema = z
  .object({
    total: z.number().int().nonnegative(),
    unread_count: z.number().int().nonnegative(),
    notifications: z.array(studentNotificationSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.unread_count > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unread_count"],
        message: "Notificações não lidas não podem exceder o total.",
      });
    }

    if (value.notifications.length > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notifications"],
        message: "A página não pode conter mais notificações que o total.",
      });
    }
  });

export const studentNotificationReadResultSchema = z
  .object({
    id: z.string().uuid(),
    read_at: notificationTimestampSchema,
  })
  .strict();

export const studentNotificationsReadAllResultSchema = z
  .object({
    updated: z.number().int().nonnegative(),
  })
  .strict();

export type StudentNotification = z.infer<typeof studentNotificationSchema>;
export type StudentNotificationList = z.infer<typeof studentNotificationListSchema>;
