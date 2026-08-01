import { z } from "zod";

export const paymentOrderStatusSchema = z.enum([
  "checkout_pending",
  "payment_pending",
  "paid",
  "cancelled",
  "expired",
  "refund_pending",
  "refunded",
  "chargeback_pending",
  "chargeback_won",
  "chargeback_lost",
]);

export const checkoutSubjectTypeSchema = z.enum(["course", "digital_product"]);

const paymentAttemptSchema = z.object({
  id: z.string().uuid(),
  status: z.string().min(1),
  billing_type: z.string().min(1),
  provider: z.string().min(1),
  provider_status: z.string().nullable(),
  provider_payment_id: z.string().nullable(),
  confirmed_at: z.string().datetime({ offset: true }).nullable(),
  received_at: z.string().datetime({ offset: true }).nullable(),
  failure_code: z.string().nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

const paymentEntitlementSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "suspended", "revoked"]),
  controls_access: z.boolean(),
  enrollment_id: z.string().uuid().nullable(),
  digital_product_access_id: z.string().uuid().nullable(),
  granted_at: z.string().datetime({ offset: true }),
  suspended_at: z.string().datetime({ offset: true }).nullable(),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
});

export const paymentAdminOrderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  customer_email: z.string().email().nullable(),
  subject_type: checkoutSubjectTypeSchema,
  subject_id: z.string().uuid(),
  license_id: z.string().uuid().nullable(),
  status: paymentOrderStatusSchema,
  amount_cents: z.number().int().nonnegative(),
  currency_code: z.string().length(3),
  title: z.string().min(1),
  payment_confirmed_at: z.string().datetime({ offset: true }).nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  affiliate_attribution_id: z.string().uuid().nullable(),
  latest_attempt: paymentAttemptSchema.nullable(),
  entitlement: paymentEntitlementSchema.nullable(),
});

export const paymentAdminDashboardSchema = z.object({
  summary: z.object({
    total_orders: z.number().int().nonnegative(),
    pending_orders: z.number().int().nonnegative(),
    paid_orders: z.number().int().nonnegative(),
    refunded_orders: z.number().int().nonnegative(),
    chargeback_orders: z.number().int().nonnegative(),
    confirmed_amount_cents: z.number().int().nonnegative(),
    refunded_amount_cents: z.number().int().nonnegative(),
    chargeback_lost_amount_cents: z.number().int().nonnegative(),
  }),
  total: z.number().int().nonnegative(),
  orders: z.array(paymentAdminOrderSchema),
});

export type PaymentOrderStatus = z.infer<typeof paymentOrderStatusSchema>;
export type CheckoutSubjectType = z.infer<typeof checkoutSubjectTypeSchema>;
export type PaymentAdminDashboard = z.infer<typeof paymentAdminDashboardSchema>;
