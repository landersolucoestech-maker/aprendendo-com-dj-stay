import { z } from "zod";

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

export const privacyRightsRequestEventSchema = z.object({
  id: z.string().uuid(),
  actor_user_id: z.string().uuid().nullable().optional(),
  action: z.enum(["created", "cancelled", "status_changed"]),
  from_status: privacyRightsRequestStatusSchema.nullable(),
  to_status: privacyRightsRequestStatusSchema.nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
});

export const privacyRightsRequestSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  user_name: z.string().nullable().optional(),
  user_email: z.string().email().optional(),
  request_type: privacyRightsRequestTypeSchema,
  description: z.string(),
  status: privacyRightsRequestStatusSchema,
  admin_notes: z.string().nullable(),
  handled_by: z.string().uuid().nullable().optional(),
  handled_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  events: z.array(privacyRightsRequestEventSchema).optional().default([]),
});

export const privacyRightsRequestListSchema = z.object({
  total: z.number().int().nonnegative(),
  requests: z.array(privacyRightsRequestSchema),
});

export const createPrivacyRightsRequestSchema = z.object({
  request_type: privacyRightsRequestTypeSchema,
  description: z.string().trim().min(10).max(4000),
});

export const adminUpdatePrivacyRightsRequestSchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["in_review", "completed", "rejected"]),
  admin_notes: z.string().trim().min(1).max(4000).nullable(),
}).superRefine((value, context) => {
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
