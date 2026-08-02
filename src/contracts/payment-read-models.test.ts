import { describe, expect, it } from "vitest";

import { checkoutSubjectTypeSchema as canonicalSubjectTypeSchema } from "./checkout";
import {
  checkoutSubjectTypeSchema,
  currencyCodeSchema,
  paymentAdminDashboardSchema,
  paymentAdminOrderSchema,
  paymentOrderStatusSchema,
} from "./payment-admin";
import {
  studentPaymentHistorySchema,
  studentPaymentOrderSchema,
} from "./student-payments";

const ORDER_ID = "123e4567-e89b-42d3-a456-426614174000";
const USER_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const SUBJECT_ID = "550e8400-e29b-41d4-a716-446655440000";
const LICENSE_ID = "9b2c4d6e-8f10-4a12-b345-6789abcdef01";
const ATTEMPT_ID = "8a6b4c2d-1e3f-4a5b-9c7d-0123456789ab";
const ENTITLEMENT_ID = "62b59f98-5d90-4d7f-8f40-9364c1bd74a1";
const ENROLLMENT_ID = "f2c7602c-9ad0-41fa-a6d6-f482ebceb6c1";
const TIMESTAMP = "2026-08-02T06:30:00-03:00";

const ADMIN_COURSE_ORDER = {
  id: ORDER_ID,
  user_id: USER_ID,
  customer_email: "aluno@example.com",
  subject_type: "course",
  subject_id: SUBJECT_ID,
  license_id: null,
  status: "paid",
  amount_cents: 19900,
  currency_code: "BRL",
  title: "Aprendendo com DJ Stay",
  payment_confirmed_at: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  affiliate_attribution_id: null,
  latest_attempt: {
    id: ATTEMPT_ID,
    status: "received",
    billing_type: "PIX",
    provider: "asaas",
    provider_status: "RECEIVED",
    provider_payment_id: "pay_123",
    confirmed_at: TIMESTAMP,
    received_at: TIMESTAMP,
    failure_code: null,
    updated_at: TIMESTAMP,
  },
  entitlement: {
    id: ENTITLEMENT_ID,
    status: "active",
    controls_access: true,
    enrollment_id: ENROLLMENT_ID,
    digital_product_access_id: null,
    granted_at: TIMESTAMP,
    suspended_at: null,
    revoked_at: null,
  },
} as const;

const ADMIN_DIGITAL_PRODUCT_ORDER = {
  ...ADMIN_COURSE_ORDER,
  subject_type: "digital_product",
  license_id: LICENSE_ID,
  entitlement: {
    ...ADMIN_COURSE_ORDER.entitlement,
    enrollment_id: null,
    digital_product_access_id: ENROLLMENT_ID,
  },
} as const;

const ADMIN_DASHBOARD = {
  summary: {
    total_orders: 1,
    pending_orders: 0,
    paid_orders: 1,
    refunded_orders: 0,
    chargeback_orders: 0,
    confirmed_amount_cents: 19900,
    refunded_amount_cents: 0,
    chargeback_lost_amount_cents: 0,
  },
  total: 1,
  orders: [ADMIN_COURSE_ORDER],
} as const;

const STUDENT_COURSE_ORDER = {
  id: ORDER_ID,
  subject_type: "course",
  subject_id: SUBJECT_ID,
  license_id: null,
  status: "paid",
  amount_cents: 19900,
  currency_code: "BRL",
  title: "Aprendendo com DJ Stay",
  payment_confirmed_at: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  latest_attempt: {
    status: "received",
    billing_type: "PIX",
    provider: "asaas",
    provider_status: "RECEIVED",
    confirmed_at: TIMESTAMP,
    received_at: TIMESTAMP,
    failure_code: null,
    updated_at: TIMESTAMP,
  },
  entitlement: {
    status: "active",
    controls_access: true,
    granted_at: TIMESTAMP,
    suspended_at: null,
    revoked_at: null,
  },
} as const;

const STUDENT_HISTORY = {
  summary: {
    total_orders: 1,
    pending_orders: 0,
    paid_orders: 1,
    refunded_orders: 0,
  },
  total: 1,
  orders: [STUDENT_COURSE_ORDER],
} as const;

const PAYMENT_STATUSES = [
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
] as const;

describe("primitivas financeiras compartilhadas", () => {
  it("reexporta a mesma definição canônica de tipo de checkout", () => {
    expect(checkoutSubjectTypeSchema).toBe(canonicalSubjectTypeSchema);
  });

  it.each(PAYMENT_STATUSES)("aceita o status canônico %s", (status) => {
    expect(paymentOrderStatusSchema.parse(status)).toBe(status);
  });

  it.each(["processing", "PAID", ""])("rejeita o status inválido %j", (status) => {
    expect(paymentOrderStatusSchema.safeParse(status).success).toBe(false);
  });

  it.each(["BRL", "USD", "EUR"])("aceita moeda ISO maiúscula %s", (currency) => {
    expect(currencyCodeSchema.parse(currency)).toBe(currency);
  });

  it.each(["brl", "B1L", "BR", "BRLL", " R$"])(
    "rejeita código monetário inválido %j",
    (currency) => {
      expect(currencyCodeSchema.safeParse(currency).success).toBe(false);
    },
  );
});

describe("paymentAdminOrderSchema", () => {
  it("aceita pedido de curso completo", () => {
    expect(paymentAdminOrderSchema.parse(ADMIN_COURSE_ORDER)).toEqual(
      ADMIN_COURSE_ORDER,
    );
  });

  it("aceita produto digital com licença", () => {
    expect(paymentAdminOrderSchema.parse(ADMIN_DIGITAL_PRODUCT_ORDER)).toEqual(
      ADMIN_DIGITAL_PRODUCT_ORDER,
    );
  });

  it("rejeita licença em pedido de curso", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        license_id: LICENSE_ID,
      }).success,
    ).toBe(false);
  });

  it("rejeita produto digital sem licença", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_DIGITAL_PRODUCT_ORDER,
        license_id: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita valor negativo", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        amount_cents: -1,
      }).success,
    ).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        customer_email: "invalid-email",
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamp sem timezone", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        created_at: "2026-08-02T06:30:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita campo adicional no pedido", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        provider_payload: {},
      }).success,
    ).toBe(false);
  });

  it("rejeita campo adicional na tentativa aninhada", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        latest_attempt: {
          ...ADMIN_COURSE_ORDER.latest_attempt,
          raw_payload: {},
        },
      }).success,
    ).toBe(false);
  });

  it("rejeita campo adicional no entitlement aninhado", () => {
    expect(
      paymentAdminOrderSchema.safeParse({
        ...ADMIN_COURSE_ORDER,
        entitlement: {
          ...ADMIN_COURSE_ORDER.entitlement,
          internal_note: "não expor",
        },
      }).success,
    ).toBe(false);
  });
});

describe("paymentAdminDashboardSchema", () => {
  it("aceita dashboard administrativo completo", () => {
    expect(paymentAdminDashboardSchema.parse(ADMIN_DASHBOARD)).toEqual(
      ADMIN_DASHBOARD,
    );
  });

  it("rejeita campo adicional no resumo", () => {
    expect(
      paymentAdminDashboardSchema.safeParse({
        ...ADMIN_DASHBOARD,
        summary: {
          ...ADMIN_DASHBOARD.summary,
          gross_margin: 1,
        },
      }).success,
    ).toBe(false);
  });

  it("rejeita campo adicional na raiz", () => {
    expect(
      paymentAdminDashboardSchema.safeParse({
        ...ADMIN_DASHBOARD,
        debug: true,
      }).success,
    ).toBe(false);
  });
});

describe("studentPaymentOrderSchema", () => {
  it("aceita pedido financeiro do aluno", () => {
    expect(studentPaymentOrderSchema.parse(STUDENT_COURSE_ORDER)).toEqual(
      STUDENT_COURSE_ORDER,
    );
  });

  it("rejeita produto digital sem licença", () => {
    expect(
      studentPaymentOrderSchema.safeParse({
        ...STUDENT_COURSE_ORDER,
        subject_type: "digital_product",
      }).success,
    ).toBe(false);
  });

  it("rejeita moeda em minúsculas", () => {
    expect(
      studentPaymentOrderSchema.safeParse({
        ...STUDENT_COURSE_ORDER,
        currency_code: "brl",
      }).success,
    ).toBe(false);
  });

  it("rejeita campo adicional na tentativa", () => {
    expect(
      studentPaymentOrderSchema.safeParse({
        ...STUDENT_COURSE_ORDER,
        latest_attempt: {
          ...STUDENT_COURSE_ORDER.latest_attempt,
          provider_payment_id: "não expor",
        },
      }).success,
    ).toBe(false);
  });
});

describe("studentPaymentHistorySchema", () => {
  it("aceita histórico financeiro completo", () => {
    expect(studentPaymentHistorySchema.parse(STUDENT_HISTORY)).toEqual(
      STUDENT_HISTORY,
    );
  });

  it("rejeita campo administrativo adicional", () => {
    expect(
      studentPaymentHistorySchema.safeParse({
        ...STUDENT_HISTORY,
        internal_total: 1,
      }).success,
    ).toBe(false);
  });

  it("rejeita contagem negativa no resumo", () => {
    expect(
      studentPaymentHistorySchema.safeParse({
        ...STUDENT_HISTORY,
        summary: {
          ...STUDENT_HISTORY.summary,
          total_orders: -1,
        },
      }).success,
    ).toBe(false);
  });
});
