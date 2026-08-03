import { describe, expect, it } from "vitest";

import { studentPaymentHistorySchema } from "@/contracts/student-payments";

const ORDER = {
  id: "b1070000-0000-4000-8000-000000000001",
  subject_type: "course",
  subject_id: "b1070000-0000-4000-8000-000000000002",
  license_id: null,
  status: "paid",
  amount_cents: 15_000,
  currency_code: "BRL",
  title: "Curso B107",
  payment_confirmed_at: "2026-08-03T14:00:00-03:00",
  created_at: "2026-08-03T13:55:00-03:00",
  updated_at: "2026-08-03T14:00:00-03:00",
  latest_attempt: null,
  entitlement: null,
} as const;

const EMPTY_HISTORY = {
  summary: {
    total_orders: 0,
    pending_orders: 0,
    paid_orders: 0,
    refunded_orders: 0,
  },
  total: 0,
  orders: [],
} as const;

describe("studentPaymentHistorySchema pagination", () => {
  it("aceita histórico vazio coerente", () => {
    expect(studentPaymentHistorySchema.parse(EMPTY_HISTORY)).toEqual(EMPTY_HISTORY);
  });

  it("aceita página menor que o total persistido", () => {
    const history = {
      summary: {
        total_orders: 80,
        pending_orders: 10,
        paid_orders: 60,
        refunded_orders: 10,
      },
      total: 80,
      orders: [ORDER],
    } as const;

    expect(studentPaymentHistorySchema.parse(history)).toEqual(history);
  });

  it("rejeita total do resumo divergente", () => {
    expect(
      studentPaymentHistorySchema.safeParse({
        ...EMPTY_HISTORY,
        summary: { ...EMPTY_HISTORY.summary, total_orders: 2 },
        total: 1,
      }).success,
    ).toBe(false);
  });

  it("rejeita página maior que o total persistido", () => {
    expect(
      studentPaymentHistorySchema.safeParse({
        ...EMPTY_HISTORY,
        orders: [ORDER],
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras no histórico", () => {
    expect(
      studentPaymentHistorySchema.safeParse({
        ...EMPTY_HISTORY,
        cursor: "interno",
      }).success,
    ).toBe(false);
  });
});
