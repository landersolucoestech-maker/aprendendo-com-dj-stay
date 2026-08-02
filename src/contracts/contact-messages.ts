import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";

export const contactMessageStatusSchema = z.enum([
  "new",
  "in_progress",
  "resolved",
  "spam",
]);

export const contactMessageEventTypeSchema = z.enum([
  "submitted",
  "status_changed",
  "resolved",
  "marked_spam",
]);

const timestampSchema = z.string().datetime({ offset: true });
const referenceCodeSchema = z.string().regex(/^CONTATO-[A-F0-9]{16}$/);
const contactNameSchema = z.string().trim().min(2).max(150);
const contactEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5)
  .max(320)
  .email();
const contactSubjectSchema = z.string().trim().min(3).max(200);
const contactBodySchema = z.string().trim().min(10).max(5_000);
const resolutionNoteSchema = z.string().trim().min(3).max(2_000);

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

const validateHandledState = (
  value: {
    status: z.infer<typeof contactMessageStatusSchema>;
    handled_at: string | null;
    handled_by_user_id?: string | null;
    resolution_note?: string | null;
  },
  context: z.RefinementCtx,
): void => {
  const openIsValid =
    (value.status === "new" || value.status === "in_progress") &&
    value.handled_at === null &&
    (value.handled_by_user_id === undefined ||
      value.handled_by_user_id === null) &&
    (value.resolution_note === undefined || value.resolution_note === null);
  const finalIsValid =
    (value.status === "resolved" || value.status === "spam") &&
    value.handled_at !== null &&
    (value.handled_by_user_id === undefined ||
      value.handled_by_user_id !== null) &&
    (value.resolution_note === undefined || value.resolution_note !== null);

  if (!openIsValid && !finalIsValid) {
    addIssue(
      context,
      "status",
      "O estado de tratamento da solicitação está incoerente.",
    );
  }
};

export const contactSubmissionInputSchema = z
  .object({
    name: contactNameSchema,
    email: contactEmailSchema,
    subject: contactSubjectSchema,
    message: contactBodySchema,
    idempotencyKey: uuidSchema,
  })
  .strict();

export const contactSubmissionResultSchema = z
  .object({
    id: uuidSchema,
    reference_code: referenceCodeSchema,
    status: contactMessageStatusSchema,
    submitted_at: timestampSchema,
    persisted: z.literal(true),
    duplicate: z.boolean(),
  })
  .strict();

export const contactAdminMessageSchema = z
  .object({
    id: uuidSchema,
    reference_code: referenceCodeSchema,
    user_id: uuidSchema.nullable(),
    name: contactNameSchema,
    email: contactEmailSchema,
    subject: contactSubjectSchema,
    message: contactBodySchema,
    status: contactMessageStatusSchema,
    submitted_at: timestampSchema,
    handled_at: timestampSchema.nullable(),
    handled_by_user_id: uuidSchema.nullable(),
    resolution_note: resolutionNoteSchema.nullable(),
    event_count: z.number().int().positive(),
  })
  .strict()
  .superRefine(validateHandledState);

export const contactAdminDashboardSchema = z
  .object({
    summary: z
      .object({
        new: z.number().int().nonnegative(),
        in_progress: z.number().int().nonnegative(),
        resolved: z.number().int().nonnegative(),
        spam: z.number().int().nonnegative(),
      })
      .strict(),
    messages: z.array(contactAdminMessageSchema),
  })
  .strict();

export const contactStatusUpdateInputSchema = z.discriminatedUnion("status", [
  z
    .object({
      contactMessageId: uuidSchema,
      status: z.literal("new"),
      note: z.null().optional(),
    })
    .strict(),
  z
    .object({
      contactMessageId: uuidSchema,
      status: z.literal("in_progress"),
      note: z.null().optional(),
    })
    .strict(),
  z
    .object({
      contactMessageId: uuidSchema,
      status: z.literal("resolved"),
      note: resolutionNoteSchema,
    })
    .strict(),
  z
    .object({
      contactMessageId: uuidSchema,
      status: z.literal("spam"),
      note: resolutionNoteSchema,
    })
    .strict(),
]);

export const contactStatusUpdateResultSchema = z
  .object({
    id: uuidSchema,
    reference_code: referenceCodeSchema,
    status: contactMessageStatusSchema,
    handled_at: timestampSchema.nullable(),
    duplicate: z.boolean(),
  })
  .strict()
  .superRefine(validateHandledState);

export const contactMessageEventSchema = z
  .object({
    id: uuidSchema,
    contact_message_id: uuidSchema,
    event_type: contactMessageEventTypeSchema,
    from_status: contactMessageStatusSchema.nullable(),
    to_status: contactMessageStatusSchema,
    actor_user_id: uuidSchema.nullable(),
    details: z.record(z.string(), z.unknown()),
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const submittedIsValid =
      value.event_type === "submitted" &&
      value.from_status === null &&
      value.to_status === "new";
    const resolvedIsValid =
      value.event_type === "resolved" &&
      value.from_status !== null &&
      value.from_status !== "resolved" &&
      value.to_status === "resolved";
    const spamIsValid =
      value.event_type === "marked_spam" &&
      value.from_status !== null &&
      value.from_status !== "spam" &&
      value.to_status === "spam";
    const changedIsValid =
      value.event_type === "status_changed" &&
      value.from_status !== null &&
      value.from_status !== value.to_status &&
      (value.to_status === "new" || value.to_status === "in_progress");

    if (
      !submittedIsValid &&
      !resolvedIsValid &&
      !spamIsValid &&
      !changedIsValid
    ) {
      addIssue(
        context,
        "event_type",
        "A transição do evento de contato está incoerente.",
      );
    }
  });

export const contactMessageEventsSchema = z.array(contactMessageEventSchema);

export type ContactSubmissionInput = z.infer<typeof contactSubmissionInputSchema>;
export type ContactSubmissionResult = z.infer<typeof contactSubmissionResultSchema>;
export type ContactAdminDashboard = z.infer<typeof contactAdminDashboardSchema>;
export type ContactMessageStatus = z.infer<typeof contactMessageStatusSchema>;
export type ContactStatusUpdateInput = z.infer<typeof contactStatusUpdateInputSchema>;
export type ContactMessageEvent = z.infer<typeof contactMessageEventSchema>;
