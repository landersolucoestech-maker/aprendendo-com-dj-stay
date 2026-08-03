import { describe, expect, it } from "vitest";

import { paginatedAffiliateAdminDashboardSchema } from "@/contracts/affiliate-admin-pagination";

const EMPTY_DASHBOARD = {
  summary: {
    affiliates: 0,
    active_affiliates: 0,
    clicks: 0,
    conversions: 0,
    available_cents: 0,
    held_cents: 0,
    paid_cents: 0,
  },
  totals: {
    profiles: 0,
    offers: 0,
    available_commissions: 0,
    payouts: 0,
  },
  profiles: [],
  offers: [],
  available_commissions: [],
  payouts: [],
} as const;

const OFFER = {
  subject_type: "course",
  subject_id: "550e8400-e29b-41d4-a716-446655440001",
  title: "Curso de exemplo",
  slug: "curso-de-exemplo",
  publication_status: "published",
  affiliate_eligible: true,
  terms_id: null,
  commission_bps: null,
  attribution_window_days: null,
  terms_active: false,
} as const;

describe("paginatedAffiliateAdminDashboardSchema", () => {
  it("aceita páginas vazias com totais coerentes", () => {
    expect(paginatedAffiliateAdminDashboardSchema.parse(EMPTY_DASHBOARD)).toEqual(
      EMPTY_DASHBOARD,
    );
  });

  it("aceita totais maiores que as páginas carregadas", () => {
    expect(
      paginatedAffiliateAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        totals: {
          profiles: 350,
          offers: 80,
          available_commissions: 125,
          payouts: 60,
        },
      }).success,
    ).toBe(true);
  });

  it("rejeita página maior que o total persistido", () => {
    expect(
      paginatedAffiliateAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        offers: [OFFER],
      }).success,
    ).toBe(false);
  });

  it("rejeita payload sem totais persistidos", () => {
    const payload: Record<string, unknown> = { ...EMPTY_DASHBOARD };
    delete payload.totals;

    expect(paginatedAffiliateAdminDashboardSchema.safeParse(payload).success).toBe(
      false,
    );
  });

  it("rejeita totais negativos e campos extras", () => {
    expect(
      paginatedAffiliateAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        totals: { ...EMPTY_DASHBOARD.totals, profiles: -1 },
      }).success,
    ).toBe(false);
    expect(
      paginatedAffiliateAdminDashboardSchema.safeParse({
        ...EMPTY_DASHBOARD,
        pagination: {},
      }).success,
    ).toBe(false);
  });
});
