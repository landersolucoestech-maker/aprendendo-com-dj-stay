import { describe, expect, it } from "vitest";

import { checkoutCronHealthSchema } from "@/contracts/checkout-cron-health";

const healthyPayload = {
  job_name: "expire-due-checkout-intents",
  configured: true,
  active: true,
  schedule: "*/5 * * * *",
  health: "healthy",
  last_run_status: "succeeded",
  last_run_at: "2026-08-03T00:45:00.000+00:00",
  last_success_at: "2026-08-03T00:45:00.000+00:00",
  failed_runs_24h: 0,
  observed_at: "2026-08-03T00:46:00.000+00:00",
  runs: [
    {
      status: "succeeded",
      started_at: "2026-08-03T00:45:00.000+00:00",
      ended_at: "2026-08-03T00:45:00.095+00:00",
      duration_ms: 95,
      message: null,
    },
  ],
} as const;

describe("checkoutCronHealthSchema", () => {
  it("accepts a sanitized persisted health snapshot", () => {
    expect(checkoutCronHealthSchema.parse(healthyPayload)).toEqual(healthyPayload);
  });

  it("accepts an explicitly missing job without fabricated schedule", () => {
    expect(
      checkoutCronHealthSchema.parse({
        ...healthyPayload,
        configured: false,
        active: false,
        schedule: null,
        health: "missing",
        last_run_status: null,
        last_run_at: null,
        last_success_at: null,
        runs: [],
      }).health,
    ).toBe("missing");
  });

  it("rejects internal pg_cron metadata", () => {
    expect(() =>
      checkoutCronHealthSchema.parse({
        ...healthyPayload,
        command: "select private.expire_due_checkout_intents(100)",
      }),
    ).toThrow();
  });

  it("rejects incoherent missing and inactive states", () => {
    expect(() =>
      checkoutCronHealthSchema.parse({
        ...healthyPayload,
        configured: false,
        active: true,
        schedule: null,
        health: "missing",
      }),
    ).toThrow();

    expect(() =>
      checkoutCronHealthSchema.parse({
        ...healthyPayload,
        active: true,
        health: "inactive",
      }),
    ).toThrow();
  });

  it("rejects invalid timestamps and negative durations", () => {
    expect(() =>
      checkoutCronHealthSchema.parse({
        ...healthyPayload,
        observed_at: "03/08/2026 00:46",
      }),
    ).toThrow();

    expect(() =>
      checkoutCronHealthSchema.parse({
        ...healthyPayload,
        runs: [{ ...healthyPayload.runs[0], duration_ms: -1 }],
      }),
    ).toThrow();
  });
});
