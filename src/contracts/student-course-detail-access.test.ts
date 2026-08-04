import { describe, expect, it } from "vitest";

import { studentCourseDetailAccessSchema } from "@/contracts/student-course-detail-access";

const validDetail = {
  id: "b1130000-0000-4000-8000-000000000201",
  user_id: "b1130000-0000-4000-8000-000000000001",
  course_id: "b1130000-0000-4000-8000-000000000101",
  status: "active" as const,
  source: "manual_grant" as const,
  source_reference: null,
  payment_confirmed_at: null,
  starts_at: "2026-08-01T10:00:00.000Z",
  expires_at: "2026-09-01T10:00:00.000Z",
  status_reason: null,
  courses: {
    id: "b1130000-0000-4000-8000-000000000101",
    title: "Curso Ativo B113",
    slug: "curso-ativo-b113",
    status: "published" as const,
  },
};

describe("studentCourseDetailAccessSchema", () => {
  it("aceita ausência de acesso ao curso", () => {
    expect(studentCourseDetailAccessSchema.parse(null)).toBeNull();
  });

  it("aceita matrícula ativa de curso publicado", () => {
    expect(studentCourseDetailAccessSchema.parse(validDetail)).toEqual(
      validDetail,
    );
  });

  it("rejeita matrícula sem estado ativo", () => {
    const result = studentCourseDetailAccessSchema.safeParse({
      ...validDetail,
      status: "revoked",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita curso sem estado publicado", () => {
    const result = studentCourseDetailAccessSchema.safeParse({
      ...validDetail,
      courses: { ...validDetail.courses, status: "archived" },
    });

    expect(result.success).toBe(false);
  });

  it("rejeita campos extras no read model", () => {
    const result = studentCourseDetailAccessSchema.safeParse({
      ...validDetail,
      created_at: "2026-08-04T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
