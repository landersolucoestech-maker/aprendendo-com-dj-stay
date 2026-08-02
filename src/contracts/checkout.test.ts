import { describe, expect, it } from "vitest";

import {
  checkoutSubjectTypeSchema,
  hostedCheckoutInputSchema,
  hostedCheckoutResultSchema,
} from "./checkout";

const SUBJECT_ID = "123e4567-e89b-42d3-a456-426614174000";
const LICENSE_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const IDEMPOTENCY_KEY = "550e8400-e29b-41d4-a716-446655440000";
const CHECKOUT_INTENT_ID = "9b2c4d6e-8f10-4a12-b345-6789abcdef01";

const COURSE_INPUT = {
  subjectType: "course",
  subjectId: SUBJECT_ID,
  licenseId: null,
  idempotencyKey: IDEMPOTENCY_KEY,
} as const;

const DIGITAL_PRODUCT_INPUT = {
  subjectType: "digital_product",
  subjectId: SUBJECT_ID,
  licenseId: LICENSE_ID,
  idempotencyKey: IDEMPOTENCY_KEY,
} as const;

const VALID_RESULT = {
  checkoutIntentId: CHECKOUT_INTENT_ID,
  checkoutUrl: "https://checkout.example.com/session/abc",
  expiresAt: "2026-08-02T06:30:00-03:00",
  status: "checkout_created",
} as const;

describe("checkoutSubjectTypeSchema", () => {
  it.each(["course", "digital_product"] as const)(
    "aceita o tipo canônico %s",
    (subjectType) => {
      expect(checkoutSubjectTypeSchema.parse(subjectType)).toBe(subjectType);
    },
  );

  it.each(["subscription", "COURSE", ""])(
    "rejeita o tipo inválido %j",
    (subjectType) => {
      expect(checkoutSubjectTypeSchema.safeParse(subjectType).success).toBe(false);
    },
  );
});

describe("hostedCheckoutInputSchema", () => {
  it("aceita curso sem licença", () => {
    expect(hostedCheckoutInputSchema.parse(COURSE_INPUT)).toEqual(COURSE_INPUT);
  });

  it("aceita produto digital com licença", () => {
    expect(hostedCheckoutInputSchema.parse(DIGITAL_PRODUCT_INPUT)).toEqual(
      DIGITAL_PRODUCT_INPUT,
    );
  });

  it("rejeita licença em checkout de curso", () => {
    expect(
      hostedCheckoutInputSchema.safeParse({
        ...COURSE_INPUT,
        licenseId: LICENSE_ID,
      }).success,
    ).toBe(false);
  });

  it("rejeita produto digital sem licença", () => {
    expect(
      hostedCheckoutInputSchema.safeParse({
        ...DIGITAL_PRODUCT_INPUT,
        licenseId: null,
      }).success,
    ).toBe(false);
  });

  it.each(["subjectId", "licenseId", "idempotencyKey"] as const)(
    "rejeita UUID inválido em %s",
    (field) => {
      expect(
        hostedCheckoutInputSchema.safeParse({
          ...DIGITAL_PRODUCT_INPUT,
          [field]: "not-a-uuid",
        }).success,
      ).toBe(false);
    },
  );

  it("rejeita campos adicionais", () => {
    expect(
      hostedCheckoutInputSchema.safeParse({
        ...COURSE_INPUT,
        amount: 1,
      }).success,
    ).toBe(false);
  });
});

describe("hostedCheckoutResultSchema", () => {
  it("aceita resposta HTTPS com UUID, status canônico e expiração com offset", () => {
    expect(hostedCheckoutResultSchema.parse(VALID_RESULT)).toEqual(VALID_RESULT);
  });

  it("rejeita URL de checkout sem HTTPS", () => {
    expect(
      hostedCheckoutResultSchema.safeParse({
        ...VALID_RESULT,
        checkoutUrl: "http://checkout.example.com/session/abc",
      }).success,
    ).toBe(false);
  });

  it("rejeita expiração sem timezone ou offset", () => {
    expect(
      hostedCheckoutResultSchema.safeParse({
        ...VALID_RESULT,
        expiresAt: "2026-08-02T06:30:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita status inesperado", () => {
    expect(
      hostedCheckoutResultSchema.safeParse({
        ...VALID_RESULT,
        status: "paid",
      }).success,
    ).toBe(false);
  });

  it("rejeita identificador de intenção inválido", () => {
    expect(
      hostedCheckoutResultSchema.safeParse({
        ...VALID_RESULT,
        checkoutIntentId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos adicionais do provider", () => {
    expect(
      hostedCheckoutResultSchema.safeParse({
        ...VALID_RESULT,
        providerPayload: true,
      }).success,
    ).toBe(false);
  });
});
