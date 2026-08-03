import { describe, expect, it } from "vitest";

import { paginatedAffiliatePortalSchema } from "@/contracts/affiliate-portal-pagination";

const EMPTY_PORTAL = {
  profile: null,
  summary: {
    clicks: 0,
    conversions: 0,
    gross_sales_cents: 0,
    available_cents: 0,
    held_cents: 0,
    paid_cents: 0,
    reversed_cents: 0,
  },
  totals: {
    offers: 0,
    links: 0,
    commissions: 0,
    payouts: 0,
    events: 0,
  },
  offers: [],
  links: [],
  commissions: [],
  payouts: [],
  events: [],
} as const;

const EVENT = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  event_type: "link_created",
  details: { source: "test" },
  created_at: "2026-08-03T10:00:00-03:00",
} as const;

describe("paginatedAffiliatePortalSchema", () => {
  it("aceita páginas vazias com totais coerentes", () => {
    expect(paginatedAffiliatePortalSchema.parse(EMPTY_PORTAL)).toEqual(
      EMPTY_PORTAL,
    );
  });

  it("aceita totais maiores que as páginas carregadas", () => {
    expect(
      paginatedAffiliatePortalSchema.safeParse({
        ...EMPTY_PORTAL,
        totals: {
          offers: 40,
          links: 120,
          commissions: 300,
          payouts: 15,
          events: 850,
        },
      }).success,
    ).toBe(true);
  });

  it("rejeita página maior que o total persistido", () => {
    expect(
      paginatedAffiliatePortalSchema.safeParse({
        ...EMPTY_PORTAL,
        events: [EVENT],
      }).success,
    ).toBe(false);
  });

  it("rejeita payload sem totais persistidos", () => {
    const payload: Record<string, unknown> = { ...EMPTY_PORTAL };
    delete payload.totals;

    expect(paginatedAffiliatePortalSchema.safeParse(payload).success).toBe(false);
  });

  it("rejeita totais negativos e campos extras", () => {
    expect(
      paginatedAffiliatePortalSchema.safeParse({
        ...EMPTY_PORTAL,
        totals: { ...EMPTY_PORTAL.totals, events: -1 },
      }).success,
    ).toBe(false);
    expect(
      paginatedAffiliatePortalSchema.safeParse({
        ...EMPTY_PORTAL,
        pagination: {},
      }).success,
    ).toBe(false);
  });
});
