import { describe, expect, it } from "vitest";

import { moduleFormSchema } from "@/contracts/curriculum-cms";

const scheduledModule = {
  title: "Fundamentos",
  description: "",
  status: "draft",
  required: true,
  releaseMode: "scheduled",
  releaseAt: "2028-02-29T10:00",
  dripDelayDays: "",
  previewEnabled: false,
  prerequisiteIds: [],
} as const;

describe("curriculum datetime-local", () => {
  it("aceita uma data válida em ano bissexto", () => {
    expect(moduleFormSchema.safeParse(scheduledModule).success).toBe(true);
  });

  it("rejeita dias e meses inexistentes no calendário", () => {
    expect(
      moduleFormSchema.safeParse({
        ...scheduledModule,
        releaseAt: "2026-02-29T10:00",
      }).success,
    ).toBe(false);

    expect(
      moduleFormSchema.safeParse({
        ...scheduledModule,
        releaseAt: "2026-13-01T10:00",
      }).success,
    ).toBe(false);
  });
});
