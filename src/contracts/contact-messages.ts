import { z } from "zod";

export const contactMessageStatusSchema = z.enum([
  "new",
  "in_progress",
  "resolved",
  "spam",
]);

export const contactSubmissionInputSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
  idempotencyKey: z.string().uuid(),
});

export const contactSubmissionResultSchema = z.object({
  id: z.string().uuid(),
  reference_code: z.string().regex(/^CONTATO-[A-F0-9]{16}$/),
  status: contactMessageStatusSchema,
  submitted_at: z.string().datetime({ offset: true }),
  persisted: z.literal(true),
  duplicate: z.boolean(),
});

export const contactAdminMessageSchema = z.object({
  id: z.string().uuid(),
  reference_code: z.string().regex(/^CONTATO-[A-F0-9]{16}$/),
  user_id: z.string().uuid().nullable(),
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
  status: contactMessageStatusSchema,
  submitted_at: z.string().datetime({ offset: true }),
  handled_at: z.string().datetime({ offset: true }).nullable(),
  handled_by_user_id: z.string().uuid().nullable(),
  resolution_note: z.string().nullable(),
  event_count: z.number().int().positive(),
});

export const contactAdminDashboardSchema = z.object({
  summary: z.object({
    new: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    spam: z.number().int().nonnegative(),
  }),
  messages: z.array(contactAdminMessageSchema),
});

export const contactStatusUpdateResultSchema = z.object({
  id: z.string().uuid(),
  reference_code: z.string().regex(/^CONTATO-[A-F0-9]{16}$/),
  status: contactMessageStatusSchema,
  handled_at: z.string().datetime({ offset: true }).nullable(),
  duplicate: z.boolean(),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionInputSchema>;
export type ContactSubmissionResult = z.infer<typeof contactSubmissionResultSchema>;
export type ContactAdminDashboard = z.infer<typeof contactAdminDashboardSchema>;
export type ContactMessageStatus = z.infer<typeof contactMessageStatusSchema>;
