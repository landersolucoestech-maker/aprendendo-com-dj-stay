import { describe, expect, it } from "vitest";

import type { CheckoutReturnFound } from "@/contracts/checkout-return";
import {
  classifyCheckoutReturn,
  shouldPollCheckoutReturn,
} from "@/lib/checkout-return";

const timestamp = "2026-08-02T22:00:00+00:00";
const baseCheckout: CheckoutReturnFound = {
  found: true,
  checkout_intent_id: "b9000000-0000-4000-8000-000000000301",
  intent_status: "checkout_created",
  subject_type: "course",
  subject_id: "b9000000-0000-4000-8000-000000000201",
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
    id: "b9000000-0000-4000-8000-000000000401",
    status: "payment_pending",
    payment_confirmed_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  },
  attempt: {
    id: "b9000000-0000-4000-8000-000000000501",
    status: "pending",
    billing_type: "pix",
    provider_status: "PENDING",
    confirmed_at: null,
    received_at: null,
    failure_code: null,
    updated_at: timestamp,
  },
  entitlement: null,
};

describe("checkout return state", () => {
  it("polls while payment is pending", () => {
    expect(classifyCheckoutReturn(baseCheckout)).toBe("pending");
    expect(shouldPollCheckoutReturn(baseCheckout)).toBe(true);
  });

  it("keeps polling after payment until access is active", () => {
    const checkout: CheckoutReturnFound = {
      ...baseCheckout,
      order: {
        ...baseCheckout.order!,
        status: "paid",
        payment_confirmed_at: timestamp,
      },
    };
    expect(classifyCheckoutReturn(checkout)).toBe("finalizing_access");
    expect(shouldPollCheckoutReturn(checkout)).toBe(true);
  });

  it("reports success only for active controlling entitlement", () => {
    const checkout: CheckoutReturnFound = {
      ...baseCheckout,
      order: {
        ...baseCheckout.order!,
        status: "paid",
        payment_confirmed_at: timestamp,
      },
      entitlement: {
        id: "b9000000-0000-4000-8000-000000000601",
        status: "active",
        controls_access: true,
        enrollment_id: "b9000000-0000-4000-8000-000000000701",
        digital_product_access_id: null,
        granted_at: timestamp,
        suspended_at: null,
        revoked_at: null,
      },
    };
    expect(classifyCheckoutReturn(checkout)).toBe("success");
    expect(shouldPollCheckoutReturn(checkout)).toBe(false);
  });

  it("prioritizes refund and chargeback states", () => {
    expect(
      classifyCheckoutReturn({
        ...baseCheckout,
        order: { ...baseCheckout.order!, status: "refunded" },
      }),
    ).toBe("refunded");
    expect(
      classifyCheckoutReturn({
        ...baseCheckout,
        order: { ...baseCheckout.order!, status: "chargeback_pending" },
      }),
    ).toBe("chargeback_pending");
  });

  it("reports revoked access instead of success", () => {
    expect(
      classifyCheckoutReturn({
        ...baseCheckout,
        order: {
          ...baseCheckout.order!,
          status: "paid",
          payment_confirmed_at: timestamp,
        },
        entitlement: {
          id: "b9000000-0000-4000-8000-000000000601",
          status: "revoked",
          controls_access: true,
          enrollment_id: "b9000000-0000-4000-8000-000000000701",
          digital_product_access_id: null,
          granted_at: timestamp,
          suspended_at: null,
          revoked_at: timestamp,
        },
      }),
    ).toBe("access_revoked");
  });
});
