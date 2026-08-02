import { describe, expect, it } from "vitest";

import { privacyRightsRequestEventSchema } from "./privacy-rights-requests";

const EVENT_ID = "123e4567-e89b-42d3-a456-426614174000";
const TIMESTAMP = "2026-08-02T06:50:00-03:00";

const STATUS_CHANGED_EVENT = {
  id: EVENT_ID,
  action: "status_changed",
  from_status: "submitted",
  to_status: "in_review",
  notes: null,
  created_at: TIMESTAMP,
} as const;

describe("transições administrativas de privacidade", () => {
  it("aceita submitted para rejected com justificativa", () => {
    const event = {
      ...STATUS_CHANGED_EVENT,
      to_status: "rejected",
      notes: "Identidade do solicitante não confirmada.",
    } as const;

    expect(privacyRightsRequestEventSchema.parse(event)).toEqual(event);
  });

  it("aceita in_review para completed", () => {
    const event = {
      ...STATUS_CHANGED_EVENT,
      from_status: "in_review",
      to_status: "completed",
    } as const;

    expect(privacyRightsRequestEventSchema.parse(event)).toEqual(event);
  });

  it.each([
    { from_status: "cancelled", to_status: "submitted" },
    { from_status: "completed", to_status: "in_review" },
    { from_status: "rejected", to_status: "completed" },
    { from_status: "in_review", to_status: "submitted" },
    { from_status: "submitted", to_status: "cancelled" },
  ] as const)("rejeita transição administrativa impossível %#", (transition) => {
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...STATUS_CHANGED_EVENT,
        ...transition,
      }).success,
    ).toBe(false);
  });

  it("rejeita evento de rejeição sem justificativa", () => {
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...STATUS_CHANGED_EVENT,
        to_status: "rejected",
        notes: null,
      }).success,
    ).toBe(false);
  });
});
