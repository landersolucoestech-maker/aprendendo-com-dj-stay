import { describe, expect, it } from "vitest";

import {
  getActiveEnrollments,
  type EnrollmentWithCourse,
} from "@/contracts/course-access";

const NOW = Date.parse("2026-08-02T12:00:00.000Z");

const ACTIVE: EnrollmentWithCourse = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  course_id: "33333333-3333-4333-8333-333333333333",
  status: "active",
  source: "purchase",
  source_reference: "ORDER-2026-0001",
  payment_confirmed_at: "2026-08-01T12:00:00.000Z",
  starts_at: "2026-08-01T12:00:00.000Z",
  expires_at: "2026-08-03T12:00:00.000Z",
  status_reason: null,
  courses: {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Aprendendo com DJ Stay",
    slug: "aprendendo-com-dj-stay",
    status: "published",
  },
};

describe("getActiveEnrollments pure clock", () => {
  it("filtra usando o instante explícito sem ambiente Supabase", () => {
    const expired: EnrollmentWithCourse = {
      ...ACTIVE,
      id: "44444444-4444-4444-8444-444444444444",
      expires_at: "2026-08-02T12:00:00.000Z",
    };
    const future: EnrollmentWithCourse = {
      ...ACTIVE,
      id: "55555555-5555-4555-8555-555555555555",
      starts_at: "2026-08-03T12:00:00.000Z",
      expires_at: "2026-08-04T12:00:00.000Z",
    };

    expect(getActiveEnrollments([ACTIVE, expired, future], NOW)).toEqual([
      ACTIVE,
    ]);
  });
});
