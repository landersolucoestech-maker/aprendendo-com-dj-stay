import { describe, expect, it } from "vitest";

import { academicAdminAnalyticsSchema } from "@/contracts/academic-analytics";

const validPayload = {
  period: {
    start_at: "2026-07-03T00:00:00.000+00:00",
    end_at: "2026-08-03T00:00:00.000+00:00",
    time_zone: "America/Sao_Paulo",
    course_id: null,
    inactive_days: 30,
  },
  summary: {
    enrollments_started: 4,
    unique_students: 3,
    pending_enrollments: 0,
    active_enrollments: 3,
    suspended_enrollments: 1,
    revoked_enrollments: 0,
    completed_all_lessons: 1,
    active_without_recent_activity: 1,
    valid_certificates: 1,
    average_completion_percent: 38,
  },
  course_breakdown: [
    {
      course_id: "b9700000-0000-4000-8000-000000000201",
      course_title: "Curso A",
      enrollments_started: 2,
      unique_students: 2,
      active_enrollments: 2,
      completed_all_lessons: 1,
      active_without_recent_activity: 1,
      valid_certificates: 1,
      average_completion_percent: 75,
    },
  ],
  progress_distribution: [
    { bucket: "not_started", enrollment_count: 2 },
    { bucket: "started_1_24", enrollment_count: 0 },
    { bucket: "progress_25_49", enrollment_count: 0 },
    { bucket: "progress_50_74", enrollment_count: 1 },
    { bucket: "progress_75_99", enrollment_count: 0 },
    { bucket: "completed_100", enrollment_count: 1 },
  ],
  daily: [
    { day: "2026-08-01", enrollments_started: 4, unique_students: 3 },
  ],
} as const;

describe("academicAdminAnalyticsSchema", () => {
  it("accepts a coherent persisted academic snapshot", () => {
    expect(academicAdminAnalyticsSchema.parse(validPayload)).toEqual(validPayload);
  });

  it("rejects a status distribution that diverges from the cohort", () => {
    expect(() =>
      academicAdminAnalyticsSchema.parse({
        ...validPayload,
        summary: { ...validPayload.summary, active_enrollments: 2 },
      }),
    ).toThrow();
  });

  it("rejects inactivity greater than active enrollments", () => {
    expect(() =>
      academicAdminAnalyticsSchema.parse({
        ...validPayload,
        summary: {
          ...validPayload.summary,
          active_without_recent_activity: 4,
        },
      }),
    ).toThrow();
  });

  it("rejects progress distribution that diverges from the cohort", () => {
    expect(() =>
      academicAdminAnalyticsSchema.parse({
        ...validPayload,
        progress_distribution: validPayload.progress_distribution.map(
          (bucket, index) =>
            index === 0 ? { ...bucket, enrollment_count: 1 } : bucket,
        ),
      }),
    ).toThrow();
  });

  it("rejects personal or unsupported abandonment fields", () => {
    expect(() =>
      academicAdminAnalyticsSchema.parse({
        ...validPayload,
        student_email: "aluno@example.test",
      }),
    ).toThrow();
    expect(() =>
      academicAdminAnalyticsSchema.parse({
        ...validPayload,
        abandoned_enrollments: 1,
      }),
    ).toThrow();
  });
});
