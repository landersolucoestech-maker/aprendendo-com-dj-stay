import { describe, expect, it } from "vitest";

import { checkoutReturnSchema } from "@/contracts/checkout-return";

const intentId = "b9000000-0000-4000-8000-000000000301";
const subjectId = "b9000000-0000-4000-8000-000000000201";
const orderId = "b9000000-0000-4000-8000-000000000401";
const attemptId = "b9000000-0000-4000-8000-000000000501";
const entitlementId = "b9000000-0000-4000-8000-000000000601";
const enrollmentId = "b9000000-0000-4000-8000-000000000701";
const timestamp = "2026-08-02T22:00:00+00:00";

const paidCourseReturn = {
  found: true,
  checkout_intent_id: intentId,
  intent_status: "checkout_created",
  subject_type: "course",
  subject_id: subjectId,
  license_id: null,
  title: "Curso exato B90",
  amount_cents: 19990,
  currency_code: "BRL",
  expires_at: "2026-08-02T22:30:00+00:00",
  failure_code: null,
  failure_reason: null,
  created_at: timestamp,
  updated_at: timestamp,
  order: {
    id: orderId,
    status: "paid",
    payment_confirmed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  },
  attempt: {
    id: attemptId,
    status: "confirmed",
    billing_type: "pix",
    provider_status: "CONFIRMED",
    confirmed_at: timestamp,
    received_at: null,
    failure_code: null,
    updated_at: timestamp,
  },
  entitlement: {
    id: entitlementId,
    status: "active",
    controls_access: true,
    enrollment_id: enrollmentId,
    digital_product_access_id: null,
    granted_at: timestamp,
    suspended_at: null,
    revoked_at: null,
  },
} as const;

describe("checkoutReturnSchema", () => {
  it("accepts an exact paid course return", () => {
    expect(checkoutReturnSchema.parse(paidCourseReturn)).toEqual(paidCourseReturn);
  });

  it("accepts a non-leaking not-found result", () => {
    expect(checkoutReturnSchema.parse({ found: false })).toEqual({ found: false });
  });

  it("rejects a paid order without confirmation time", () => {
    expect(() =>
      checkoutReturnSchema.parse({
        ...paidCourseReturn,
        order: { ...paidCourseReturn.order, payment_confirmed_at: null },
      }),
    ).toThrow("Pedido pago exige horário de confirmação");
  });

  it("rejects an entitlement for the wrong subject type", () => {
    expect(() =>
      checkoutReturnSchema.parse({
        ...paidCourseReturn,
        entitlement: {
          ...paidCourseReturn.entitlement,
          enrollment_id: null,
          digital_product_access_id: enrollmentId,
        },
      }),
    ).toThrow("Destino do entitlement diverge");
  });

  it("rejects raw provider fields", () => {
    expect(() =>
      checkoutReturnSchema.parse({
        ...paidCourseReturn,
        provider_checkout_url: "https://sandbox.asaas.com/checkout/private",
      }),
    ).toThrow();
  });
});
