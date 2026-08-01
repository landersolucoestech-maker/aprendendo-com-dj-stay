import { z } from "zod";

export const frontendErrorSourceSchema = z.enum([
  "route_boundary",
  "window_error",
  "unhandled_rejection",
]);

export const frontendErrorStatusSchema = z.enum([
  "open",
  "acknowledged",
  "resolved",
  "ignored",
]);

export const frontendErrorCaptureResultSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  persisted: z.literal(true),
  duplicate: z.boolean(),
  occurred_at: z.string().datetime({ offset: true }),
});

export const frontendErrorAdminEventSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  source: frontendErrorSourceSchema,
  route: z.string().min(1).max(500),
  error_name: z.string().min(1).max(150),
  error_message: z.string().min(1).max(2000),
  component_stack: z.string().max(8000).nullable(),
  release: z.string().min(1).max(150),
  status: frontendErrorStatusSchema,
  occurred_at: z.string().datetime({ offset: true }),
  acknowledged_at: z.string().datetime({ offset: true }).nullable(),
  resolved_at: z.string().datetime({ offset: true }).nullable(),
  handled_by_user_id: z.string().uuid().nullable(),
  resolution_note: z.string().max(2000).nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export const frontendErrorDashboardSchema = z.object({
  summary: z.object({
    open: z.number().int().nonnegative(),
    acknowledged: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    ignored: z.number().int().nonnegative(),
  }),
  events: z.array(frontendErrorAdminEventSchema),
});

export const frontendErrorStatusUpdateResultSchema = z.object({
  id: z.string().uuid(),
  status: frontendErrorStatusSchema,
  acknowledged_at: z.string().datetime({ offset: true }).nullable(),
  resolved_at: z.string().datetime({ offset: true }).nullable(),
  handled_by_user_id: z.string().uuid().nullable(),
  resolution_note: z.string().max(2000).nullable(),
});

export type FrontendErrorSource = z.infer<typeof frontendErrorSourceSchema>;
export type FrontendErrorStatus = z.infer<typeof frontendErrorStatusSchema>;
export type FrontendErrorDashboard = z.infer<typeof frontendErrorDashboardSchema>;
