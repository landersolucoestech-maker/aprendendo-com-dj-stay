import { describe, expect, it } from "vitest";

import { paymentAdminAnalyticsSchema } from "@/contracts/payment-analytics";
import { paymentOrderStatusSchema } from "@/contracts/payment-admin";

const validPayload = {
  period: {
    start_at: "2026-08-01T00:00:00.000+00:00",
    end_at: "2026-08-04T00:00:00.000+00:00",
    time_zone: "America/Sao_Paulo",
  },
  summary: {
    confirmed_orders: 5,
    unique_customers: 2,
    gross_revenue_cents: 75000,
    refunded_orders: 1,
    refunded_amount_cents: 10000,
    chargeback_lost_orders: 1,
    chargeback_lost_amount_cents: 20000,
    refund_pending_amount_cents: 30000,
    chargeback_pending_amount_cents: 0,
    net_after_reversals_cents: 45000,
    average_ticket_cents: 15000,
  },
  status_breakdown: paymentOrderStatusSchema.options.map((status) => ({
    status,
    order_count: status === "paid" ? 2 : 0,
    amount_cents: status === "paid" ? 15000 : 0,
  })),
  subject_breakdown: [
    {
      subject_type: "course",
      order_count: 4,
      gross_revenue_cents: 70000,
      reversed_amount_cents: 30000,
      net_after_reversals_cents: 40000,
    },
    {
      subject_type: "digital_product",
      order_count: 1,
      gross_revenue_cents: 5000,
      reversed_amount_cents: 0,
      net_after_reversals_cents: 5000,
    },
  ],
  top_offers: [
    {
      subject_type: "course",
      subject_id: "b9600000-0000-4000-8000-000000000402",
      title: "Curso B Atualizado",
      order_count: 2,
      gross_revenue_cents: 50000,
      reversed_amount_cents: 20000,
      net_after_reversals_cents: 30000,
    },
  ],
  daily: [
    {
      day: "2026-08-01",
      order_count: 2,
      gross_revenue_cents: 20000,
      reversed_amount_cents: 10000,
      net_after_reversals_cents: 10000,
    },
  ],
} as const;

describe("paymentAdminAnalyticsSchema", () => {
  it("accepts a coherent persisted financial snapshot", () => {
    expect(paymentAdminAnalyticsSchema.parse(validPayload)).toEqual(validPayload);
  });

  it("rejects net revenue that diverges from completed reversals", () => {
    expect(() =>
      paymentAdminAnalyticsSchema.parse({
        ...validPayload,
        summary: { ...validPayload.summary, net_after_reversals_cents: 74999 },
      }),
    ).toThrow();
  });

  it("rejects an average ticket that diverges from confirmed orders", () => {
    expect(() =>
      paymentAdminAnalyticsSchema.parse({
        ...validPayload,
        summary: { ...validPayload.summary, average_ticket_cents: 1 },
      }),
    ).toThrow();
  });

  it("rejects provider or customer identifiers", () => {
    expect(() =>
      paymentAdminAnalyticsSchema.parse({
        ...validPayload,
        provider_payment_id: "pay_123",
      }),
    ).toThrow();
  });

  it("rejects inverted periods and inconsistent breakdowns", () => {
    expect(() =>
      paymentAdminAnalyticsSchema.parse({
        ...validPayload,
        period: {
          ...validPayload.period,
          start_at: "2026-08-05T00:00:00.000+00:00",
        },
      }),
    ).toThrow();

    expect(() =>
      paymentAdminAnalyticsSchema.parse({
        ...validPayload,
        daily: [
          {
            ...validPayload.daily[0],
            net_after_reversals_cents: 20000,
          },
        ],
      }),
    ).toThrow();
  });
});
