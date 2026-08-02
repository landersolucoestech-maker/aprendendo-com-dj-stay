import { z } from "zod";

import { checkoutSubjectTypeSchema } from "@/contracts/checkout";
import { paymentOrderStatusSchema } from "@/contracts/payment-admin";

export const checkoutIntentIdSchema = z.string().uuid();

export const checkoutIntentStatusSchema = z.enum([
  "prepared",
  "provider_creating",
  "checkout_created",
  "provider_failed",
  "expired",
  "cancelled",
]);

export const paymentAttemptStatusSchema = z.enum([
  "checkout_created",
  "pending",
  "confirmed",
  "received",
  "failed",
  "expired",
  "cancelled",
  "refund_pending",
  "refunded",
  "chargeback_pending",
  "chargeback_dispute",
  "chargeback_won",
  "chargeback_lost",
]);

export const paymentBillingTypeSchema = z.enum([
  "unknown",
  "pix",
  "credit_card",
]);

export const paymentEntitlementStatusSchema = z.enum([
  "active",
  "suspended",
  "revoked",
]);

const timestampSchema = z.string().datetime({ offset: true });

export const checkoutReturnOrderSchema = z
  .object({
    id: z.string().uuid(),
    status: paymentOrderStatusSchema,
    payment_confirmed_at: timestampSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "paid" && value.payment_confirmed_at === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payment_confirmed_at"],
        message: "Pedido pago exige horário de confirmação.",
      });
    }
  });

export const checkoutReturnAttemptSchema = z
  .object({
    id: z.string().uuid(),
    status: paymentAttemptStatusSchema,
    billing_type: paymentBillingTypeSchema,
    provider_status: z.string().trim().min(1).max(100).nullable(),
    confirmed_at: timestampSchema.nullable(),
    received_at: timestampSchema.nullable(),
    failure_code: z.string().trim().min(1).max(100).nullable(),
    updated_at: timestampSchema,
  })
  .strict();

export const checkoutReturnEntitlementSchema = z
  .object({
    id: z.string().uuid(),
    status: paymentEntitlementStatusSchema,
    controls_access: z.boolean(),
    enrollment_id: z.string().uuid().nullable(),
    digital_product_access_id: z.string().uuid().nullable(),
    granted_at: timestampSchema,
    suspended_at: timestampSchema.nullable(),
    revoked_at: timestampSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "active" && (value.suspended_at || value.revoked_at)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "Entitlement ativo não pode conter suspensão ou revogação.",
      });
    }
    if (value.status === "suspended" && value.suspended_at === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["suspended_at"],
        message: "Entitlement suspenso exige horário de suspensão.",
      });
    }
    if (value.status === "revoked" && value.revoked_at === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revoked_at"],
        message: "Entitlement revogado exige horário de revogação.",
      });
    }
  });

const checkoutReturnNotFoundSchema = z
  .object({ found: z.literal(false) })
  .strict();

export const checkoutReturnFoundSchema = z
  .object({
    found: z.literal(true),
    checkout_intent_id: checkoutIntentIdSchema,
    intent_status: checkoutIntentStatusSchema,
    subject_type: checkoutSubjectTypeSchema,
    subject_id: z.string().uuid(),
    license_id: z.string().uuid().nullable(),
    title: z.string().trim().min(3).max(200),
    amount_cents: z.number().int().positive(),
    currency_code: z.literal("BRL"),
    expires_at: timestampSchema.nullable(),
    failure_code: z.string().trim().min(1).max(100).nullable(),
    failure_reason: z.string().trim().min(1).max(1000).nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    order: checkoutReturnOrderSchema.nullable(),
    attempt: checkoutReturnAttemptSchema.nullable(),
    entitlement: checkoutReturnEntitlementSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.subject_type === "course" && value.license_id !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["license_id"],
        message: "Retorno de curso não aceita licença digital.",
      });
    }
    if (value.subject_type === "digital_product" && value.license_id === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["license_id"],
        message: "Retorno de produto digital exige licença.",
      });
    }

    if (value.attempt !== null && value.order === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attempt"],
        message: "Tentativa de pagamento exige pedido associado.",
      });
    }
    if (value.entitlement !== null && value.order === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entitlement"],
        message: "Entitlement exige pedido associado.",
      });
    }

    if (value.entitlement !== null) {
      const courseEntitlementIsValid =
        value.subject_type === "course" &&
        value.entitlement.enrollment_id !== null &&
        value.entitlement.digital_product_access_id === null;
      const productEntitlementIsValid =
        value.subject_type === "digital_product" &&
        value.entitlement.enrollment_id === null &&
        value.entitlement.digital_product_access_id !== null;

      if (!courseEntitlementIsValid && !productEntitlementIsValid) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entitlement"],
          message: "Destino do entitlement diverge do tipo de compra.",
        });
      }
    }
  });

export const checkoutReturnSchema = z.union([
  checkoutReturnNotFoundSchema,
  checkoutReturnFoundSchema,
]);

export type CheckoutReturnFound = z.infer<typeof checkoutReturnFoundSchema>;
export type CheckoutReturn = z.infer<typeof checkoutReturnSchema>;
