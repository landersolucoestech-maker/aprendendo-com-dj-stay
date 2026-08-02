import { z } from "zod";

const privacyTimestampSchema = z.string().datetime({ offset: true });
const privacyDescriptionSchema = z.string().trim().min(10).max(4000);
const privacyNotesSchema = z.string().trim().min(1).max(4000).nullable();

export const privacyRightsRequestTypeSchema = z.enum([
  "access_export",
  "correction",
  "deletion",
]);

export const privacyRightsRequestStatusSchema = z.enum([
  "submitted",
  "in_review",
  "completed",
  "rejected",
  "cancelled",
]);

export const privacyRightsRequestEventSchema = z
  .object({
    id: z.string().uuid(),
    actor_user_id: z.string().uuid().nullable().optional(),
    action: z.enum(["created", "cancelled", "status_changed"]),
    from_status: privacyRightsRequestStatusSchema.nullable(),
    to_status: privacyRightsRequestStatusSchema.nullable(),
    notes: privacyNotesSchema,
    created_at: privacyTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.action === "created" &&
      (value.from_status !== null || value.to_status !== "submitted")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to_status"],
        message:
          "Evento de criação deve iniciar sem status anterior e terminar como submitted.",
      });
    }

    if (
      value.action === "cancelled" &&
      (value.from_status !== "submitted" || value.to_status !== "cancelled")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to_status"],
        message:
          "Evento de cancelamento deve representar submitted → cancelled.",
      });
    }

    if (value.action === "status_changed") {
      const validFromStatus =
        value.from_status === "submitted" || value.from_status === "in_review";
      const validToStatus =
        value.to_status === "in_review" ||
        value.to_status === "completed" ||
        value.to_status === "rejected";

      if (
        !validFromStatus ||
        !validToStatus ||
        value.from_status === value.to_status
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["to_status"],
          message: "Mudança administrativa contém uma transição inválida.",
        });
      }

      if (value.to_status === "rejected" && value.notes === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["notes"],
          message: "Evento de rejeição exige justificativa.",
        });
      }
    }
  });

export const privacyRightsRequestSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid().optional(),
    user_name: z.string().trim().min(1).nullable().optional(),
    user_email: z.string().email().nullable().optional(),
    request_type: privacyRightsRequestTypeSchema,
    description: privacyDescriptionSchema,
    status: privacyRightsRequestStatusSchema,
    admin_notes: privacyNotesSchema,
    handled_by: z.string().uuid().nullable().optional(),
    handled_at: privacyTimestampSchema.nullable(),
    created_at: privacyTimestampSchema,
    updated_at: privacyTimestampSchema,
    events: z.array(privacyRightsRequestEventSchema).optional().default([]),
  })
  .strict()
  .superRefine((value, context) => {
    const isHandled = value.status === "completed" || value.status === "rejected";
    const hasHandledAt = value.handled_at !== null;

    if (isHandled !== hasHandledAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handled_at"],
        message: "Status final e horário de tratamento devem ser coerentes.",
      });
    }

    if (
      value.handled_by !== undefined &&
      (value.handled_by !== null) !== hasHandledAt
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handled_by"],
        message: "Responsável e horário de tratamento devem existir em conjunto.",
      });
    }

    if (value.status === "rejected" && value.admin_notes === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["admin_notes"],
        message: "Solicitação rejeitada exige justificativa administrativa.",
      });
    }
  });

export const privacyRightsRequestListSchema = z
  .object({
    total: z.number().int().nonnegative(),
    requests: z.array(privacyRightsRequestSchema),
  })
  .strict();

export const createPrivacyRightsRequestSchema = z
  .object({
    request_type: privacyRightsRequestTypeSchema,
    description: privacyDescriptionSchema,
  })
  .strict();

export const adminUpdatePrivacyRightsRequestSchema = z
  .object({
    request_id: z.string().uuid(),
    status: z.enum(["in_review", "completed", "rejected"]),
    admin_notes: privacyNotesSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "rejected" && !value.admin_notes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["admin_notes"],
        message: "A justificativa é obrigatória para rejeitar.",
      });
    }
  });

export type PrivacyRightsRequestType = z.infer<
  typeof privacyRightsRequestTypeSchema
>;
export type PrivacyRightsRequestStatus = z.infer<
  typeof privacyRightsRequestStatusSchema
>;
export type PrivacyRightsRequest = z.infer<typeof privacyRightsRequestSchema>;
export type CreatePrivacyRightsRequest = z.infer<
  typeof createPrivacyRightsRequestSchema
>;
export type AdminUpdatePrivacyRightsRequest = z.infer<
  typeof adminUpdatePrivacyRightsRequestSchema
>;
