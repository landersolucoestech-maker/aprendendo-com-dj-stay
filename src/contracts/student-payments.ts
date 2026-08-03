import { z } from "zod";

import {
  checkoutSubjectTypeSchema,
  currencyCodeSchema,
  paymentOrderStatusSchema,
  validatePaymentSubjectLicense,
} from "@/contracts/payment-admin";

const studentPaymentAttemptSchema = z
  .object({
    status: z.string().min(1),
    billing_type: z.string().min(1),
    provider: z.string().min(1),
    provider_status: z.string().nullable(),
    confirmed_at: z.string().datetime({ offset: true }).nullable(),
    received_at: z.string().datetime({ offset: true }).nullable(),
    failure_code: z.string().nullable(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

const studentPaymentEntitlementSchema = z
  .object({
    status: z.enum(["active", "suspended", "revoked"]),
    controls_access: z.boolean(),
    granted_at: z.string().datetime({ offset: true }),
    suspended_at: z.string().datetime({ offset: true }).nullable(),
    revoked_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export const studentPaymentOrderSchema = z
  .object({
    id: z.string().uuid(),
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
    latest_attempt: studentPaymentAttemptSchema.nullable(),
    entitlement: studentPaymentEntitlementSchema.nullable(),
  })
  .strict()
  .superRefine(validatePaymentSubjectLicense);

export const studentPaymentHistorySchema = z
  .object({
    summary: z
      .object({
        total_orders: z.number().int().nonnegative(),
        pending_orders: z.number().int().nonnegative(),
        paid_orders: z.number().int().nonnegative(),
        refunded_orders: z.number().int().nonnegative(),
      })
      .strict(),
    total: z.number().int().nonnegative(),
    orders: z.array(studentPaymentOrderSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.summary.total_orders !== value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["summary", "total_orders"],
        message: "O total do resumo deve corresponder ao total paginado.",
      });
    }

    if (value.orders.length > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orders"],
        message: "A página não pode conter mais pedidos que o total.",
      });
    }
  });

export type StudentPaymentHistory = z.infer<typeof studentPaymentHistorySchema>;
export type StudentPaymentOrder = z.infer<typeof studentPaymentOrderSchema>;
