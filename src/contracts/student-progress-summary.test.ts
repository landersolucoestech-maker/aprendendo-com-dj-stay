import { describe, expect, it } from "vitest";

import { studentProgressSummarySchema } from "@/contracts/student-progress-summary";

describe("studentProgressSummarySchema", () => {
  it("aceita resumo acadêmico coerente", () => {
    expect(
      studentProgressSummarySchema.parse({
        started_lessons: 12,
        completed_lessons: 7,
        average_progress_percent: 64,
      }),
    ).toEqual({
      started_lessons: 12,
      completed_lessons: 7,
      average_progress_percent: 64,
    });
  });

  it("rejeita conclusões acima das aulas iniciadas", () => {
    expect(
      studentProgressSummarySchema.safeParse({
        started_lessons: 2,
        completed_lessons: 3,
        average_progress_percent: 80,
      }).success,
    ).toBe(false);
  });

  it("rejeita média fora do intervalo ou incoerente com resumo vazio", () => {
    expect(
      studentProgressSummarySchema.safeParse({
        started_lessons: 1,
        completed_lessons: 0,
        average_progress_percent: 101,
      }).success,
    ).toBe(false);
    expect(
      studentProgressSummarySchema.safeParse({
        started_lessons: 0,
        completed_lessons: 0,
        average_progress_percent: 1,
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentProgressSummarySchema.safeParse({
        started_lessons: 1,
        completed_lessons: 1,
        average_progress_percent: 100,
        rows: [],
      }).success,
    ).toBe(false);
  });
});
