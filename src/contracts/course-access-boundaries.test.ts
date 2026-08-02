import { describe, expect, it } from "vitest";

import { enrollmentWithCourseSchema } from "@/contracts/course-access";

const BASE = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  course_id: "33333333-3333-4333-8333-333333333333",
  status: "active",
  source: "purchase",
  source_reference: "12345678",
  payment_confirmed_at: "2026-08-01T12:00:00.000Z",
  starts_at: "2026-08-01T12:00:00.000Z",
  expires_at: null,
  status_reason: null,
  courses: {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Aprendendo com DJ Stay",
    slug: "aprendendo-com-dj-stay",
    status: "published",
  },
} as const;

describe("enrollment source reference boundaries", () => {
  it("aceita referências com 8 e 200 caracteres", () => {
    expect(enrollmentWithCourseSchema.safeParse(BASE).success).toBe(true);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...BASE,
        source_reference: "x".repeat(200),
      }).success,
    ).toBe(true);
  });

  it("rejeita referências com 7 e 201 caracteres", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...BASE,
        source_reference: "x".repeat(7),
      }).success,
    ).toBe(false);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...BASE,
        source_reference: "x".repeat(201),
      }).success,
    ).toBe(false);
  });
});
