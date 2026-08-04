import { describe, expect, it } from "vitest";

import { studentCourseAccessSchema } from "@/contracts/student-course-access";

const EMPTY_ACCESS = {
  total: 0,
  active_total: 0,
  active_enrollments: [],
  enrollments: [],
} as const;

describe("studentCourseAccessSchema", () => {
  it("aceita acesso vazio coerente", () => {
    expect(studentCourseAccessSchema.parse(EMPTY_ACCESS)).toEqual(EMPTY_ACCESS);
  });

  it("aceita páginas menores que os totais persistidos", () => {
    expect(
      studentCourseAccessSchema.safeParse({
        ...EMPTY_ACCESS,
        total: 25,
        active_total: 4,
      }).success,
    ).toBe(true);
  });

  it("rejeita total ativo acima do total geral", () => {
    expect(
      studentCourseAccessSchema.safeParse({
        ...EMPTY_ACCESS,
        total: 1,
        active_total: 2,
      }).success,
    ).toBe(false);
  });

  it("rejeita totais negativos e campos extras", () => {
    expect(
      studentCourseAccessSchema.safeParse({
        ...EMPTY_ACCESS,
        total: -1,
      }).success,
    ).toBe(false);
    expect(
      studentCourseAccessSchema.safeParse({
        ...EMPTY_ACCESS,
        page: 1,
      }).success,
    ).toBe(false);
  });
});
