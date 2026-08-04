import { describe, expect, it } from "vitest";

import { studentLibrarySummarySchema } from "@/contracts/student-library-summary";

describe("studentLibrarySummarySchema", () => {
  it("aceita total persistido não negativo", () => {
    expect(studentLibrarySummarySchema.parse({ total: 42 })).toEqual({
      total: 42,
    });
  });

  it("rejeita total negativo ou fracionário", () => {
    expect(studentLibrarySummarySchema.safeParse({ total: -1 }).success).toBe(
      false,
    );
    expect(studentLibrarySummarySchema.safeParse({ total: 1.5 }).success).toBe(
      false,
    );
  });

  it("rejeita campos extras", () => {
    expect(
      studentLibrarySummarySchema.safeParse({ total: 1, assets: [] }).success,
    ).toBe(false);
  });
});
