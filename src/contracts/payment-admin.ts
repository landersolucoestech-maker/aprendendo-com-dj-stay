import { z } from "zod";

import { checkoutSubjectTypeSchema } from "@/contracts/checkout";

export { checkoutSubjectTypeSchema };

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

export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/, {
  message: "O código monetário deve conter três letras maiúsculas.",
});

export type CheckoutSubjectType = z.infer<typeof checkoutSubjectTypeSchema>;

type SubjectLicenseValue = {
  readonly subject_type: CheckoutSubjectType;
  readonly license_id: string | null;
};

export const validatePaymentSubjectLicense = (
  value: SubjectLicenseValue,
  context: z.RefinementCtx,
): void => {
  if (value.subject_type === "course" && value.license_id !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["license_id"],
      message: "Pedido de curso não aceita licença de produto digital.",
    });
  }

  if (value.subject_type === "digital_product" && value.license_id === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["license_id"],
      message: "Pedido de produto digital exige uma licença.",
    });
  }
};

const paymentAttemptSchema = z
  .object({
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
  })
  .strict();

const paymentEntitlementSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["active", "suspended", "revoked"]),
    controls_access: z.boolean(),
    enrollment_id: z.string().uuid().nullable(),
    digital_product_access_id: z.string().uuid().nullable(),
    granted_at: z.string().datetime({ offset: true }),
    suspended_at: z.string().datetime({ offset: true }).nullable(),
    revoked_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export const paymentAdminOrderSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    customer_email: z.string().email().nullable(),
    subject_type: checkoutSubjectTypeSchema,
    subject_id: z.string().uuid(),
    license_id: z.string().uuid().nullable(),
    status: paymentOrderStatusSchema,
    amount_cents: z.number().int().nonnegative(),
    currency_code: currencyCodeSchema,
    title: z.string().min(1),
    payment_confirmed_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    affiliate_attribution_id: z.string().uuid().nullable(),
    latest_attempt: paymentAttemptSchema.nullable(),
    entitlement: paymentEntitlementSchema.nullable(),
  })
  .strict()
  .superRefine(validatePaymentSubjectLicense);

export const paymentAdminDashboardSchema = z
  .object({
    summary: z
      .object({
        total_orders: z.number().int().nonnegative(),
        pending_orders: z.number().int().nonnegative(),
        paid_orders: z.number().int().nonnegative(),
        refunded_orders: z.number().int().nonnegative(),
        chargeback_orders: z.number().int().nonnegative(),
        confirmed_amount_cents: z.number().int().nonnegative(),
        refunded_amount_cents: z.number().int().nonnegative(),
        chargeback_lost_amount_cents: z.number().int().nonnegative(),
      })
      .strict(),
    total: z.number().int().nonnegative(),
    orders: z.array(paymentAdminOrderSchema),
  })
  .strict();

export type PaymentOrderStatus = z.infer<typeof paymentOrderStatusSchema>;
export type PaymentAdminDashboard = z.infer<typeof paymentAdminDashboardSchema>;
