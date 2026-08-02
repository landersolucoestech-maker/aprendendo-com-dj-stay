import { describe, expect, it } from "vitest";

import {
  courseCheckoutResolutionSchema,
  courseCheckoutStartResultSchema,
} from "@/contracts/course-checkout";

const courseId = "b8900000-0000-4000-8000-000000000201";

describe("course checkout contracts", () => {
  it("accepts an eligible authenticated course resolution", () => {
    expect(
      courseCheckoutResolutionSchema.parse({
        course_id: courseId,
        slug: "curso-checkout-b89",
        title: "Curso Checkout B89",
        checkout_eligible: true,
        already_enrolled: false,
      }),
    ).toEqual({
      course_id: courseId,
      slug: "curso-checkout-b89",
      title: "Curso Checkout B89",
      checkout_eligible: true,
      already_enrolled: false,
    });
  });

  it("accepts the already enrolled state without exposing a subject id", () => {
    expect(
      courseCheckoutResolutionSchema.parse({
        course_id: null,
        slug: "curso-checkout-b89",
        title: "Curso Checkout B89",
        checkout_eligible: false,
        already_enrolled: true,
      }).course_id,
    ).toBeNull();
  });

  it("rejects an inconsistent eligibility state", () => {
    expect(() =>
      courseCheckoutResolutionSchema.parse({
        course_id: courseId,
        slug: "curso-checkout-b89",
        title: "Curso Checkout B89",
        checkout_eligible: false,
        already_enrolled: false,
      }),
    ).toThrow("Estado de elegibilidade");
  });

  it("accepts a completed hosted checkout result", () => {
    expect(
      courseCheckoutStartResultSchema.parse({
        status: "checkout_created",
        slug: "curso-checkout-b89",
        title: "Curso Checkout B89",
        checkoutIntentId: "b8900000-0000-4000-8000-000000000401",
        checkoutUrl: "https://sandbox.asaas.com/checkout/b89",
        expiresAt: "2026-08-02T23:30:00+00:00",
      }).status,
    ).toBe("checkout_created");
  });

  it("rejects private fields in the already enrolled result", () => {
    expect(() =>
      courseCheckoutStartResultSchema.parse({
        status: "already_enrolled",
        slug: "curso-checkout-b89",
        title: "Curso Checkout B89",
        course_id: courseId,
      }),
    ).toThrow();
  });
});
