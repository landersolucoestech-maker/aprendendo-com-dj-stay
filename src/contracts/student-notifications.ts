import { z } from "zod";

export const studentNotificationTypeSchema = z.enum([
  "support_reply",
  "payment_confirmed",
  "access_granted",
  "certificate_issued",
  "system",
]);

export const studentNotificationSchema = z.object({
  id: z.string().uuid(),
  type: studentNotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  action_path: z.string().nullable(),
  source_entity_type: z.string().nullable(),
  source_entity_id: z.string().uuid().nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export const studentNotificationListSchema = z.object({
  total: z.number().int().nonnegative(),
  unread_count: z.number().int().nonnegative(),
  notifications: z.array(studentNotificationSchema),
});

export const studentNotificationReadResultSchema = z.object({
  id: z.string().uuid(),
  read_at: z.string(),
});

export const studentNotificationsReadAllResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export type StudentNotification = z.infer<typeof studentNotificationSchema>;
export type StudentNotificationList = z.infer<typeof studentNotificationListSchema>;
