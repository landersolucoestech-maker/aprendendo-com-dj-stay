import { z } from "zod";

const supportTimestampSchema = z.string().datetime({ offset: true });
const supportReferenceCodeSchema = z.string().regex(/^SUP-[A-F0-9]{16}$/);

export const supportTicketStatusSchema = z.enum([
  "open",
  "awaiting_support",
  "awaiting_student",
  "resolved",
  "closed",
]);
export const supportTicketPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);
export const supportMessageAuthorRoleSchema = z.enum(["student", "support"]);

export const supportMessageSchema = z
  .object({
    id: z.string().uuid(),
    author_role: supportMessageAuthorRoleSchema,
    body: z.string().trim().min(2).max(5000),
    created_at: supportTimestampSchema,
  })
  .strict();

export const supportTicketSchema = z
  .object({
    id: z.string().uuid(),
    reference_code: supportReferenceCodeSchema,
    subject: z.string().trim().min(5).max(200),
    category: z.string().trim().min(2).max(80),
    priority: supportTicketPrioritySchema,
    status: supportTicketStatusSchema,
    last_message_at: supportTimestampSchema,
    created_at: supportTimestampSchema,
    updated_at: supportTimestampSchema,
    messages: z.array(supportMessageSchema),
  })
  .strict();

export const mySupportTicketsSchema = z
  .object({
    total: z.coerce.number().int().nonnegative(),
    tickets: z.array(supportTicketSchema),
  })
  .strict();

export const supportAdminTicketSchema = supportTicketSchema.extend({
  user_id: z.string().uuid(),
  customer_email: z.string().email().nullable(),
});

export const supportAdminDashboardSchema = z
  .object({
    summary: z
      .object({
        total: z.coerce.number().int().nonnegative(),
        awaiting_support: z.coerce.number().int().nonnegative(),
        awaiting_student: z.coerce.number().int().nonnegative(),
        urgent: z.coerce.number().int().nonnegative(),
      })
      .strict(),
    total: z.coerce.number().int().nonnegative(),
    tickets: z.array(supportAdminTicketSchema),
  })
  .strict();

export const supportMutationResultSchema = z
  .object({
    id: z.string().uuid(),
    ticket_id: z.string().uuid().optional(),
    reference_code: supportReferenceCodeSchema.optional(),
    status: supportTicketStatusSchema.optional(),
  })
  .strict();

export type SupportTicketStatus = z.infer<typeof supportTicketStatusSchema>;
export type SupportTicketPriority = z.infer<typeof supportTicketPrioritySchema>;
export type SupportMessage = z.infer<typeof supportMessageSchema>;
export type SupportTicket = z.infer<typeof supportTicketSchema>;
export type MySupportTickets = z.infer<typeof mySupportTicketsSchema>;
export type SupportAdminTicket = z.infer<typeof supportAdminTicketSchema>;
export type SupportAdminDashboard = z.infer<typeof supportAdminDashboardSchema>;
export type SupportMutationResult = z.infer<typeof supportMutationResultSchema>;
