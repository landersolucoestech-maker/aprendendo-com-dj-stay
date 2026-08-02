import { describe, expect, it } from "vitest";

import {
  affiliateAdminDashboardSchema,
  affiliateAdminOfferSchema,
  affiliateAdminPayoutSchema,
  affiliateAdminProfileSchema,
  affiliateCancelPayoutInputSchema,
  affiliateClickResultSchema,
  affiliateCommissionSchema,
  affiliateCreateLinkInputSchema,
  affiliateCreatePayoutInputSchema,
  affiliateDisplayNameInputSchema,
  affiliateEventSchema,
  affiliateLinkRowSchema,
  affiliateMarkPayoutPaidInputSchema,
  affiliateOfferSchema,
  affiliatePayoutRowSchema,
  affiliatePayoutSchema,
  affiliatePortalSchema,
  affiliateProfileSchema,
  affiliateProfileStatusInputSchema,
  affiliateSubjectTermsRowSchema,
  affiliateTermsInputSchema,
} from "@/contracts/affiliate";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const LINK_ID = "33333333-3333-4333-8333-333333333333";
const ORDER_ID = "44444444-4444-4444-8444-444444444444";
const COMMISSION_ID = "55555555-5555-4555-8555-555555555555";
const PAYOUT_ID = "66666666-6666-4666-8666-666666666666";
const TERMS_ID = "77777777-7777-4777-8777-777777777777";
const EVENT_ID = "88888888-8888-4888-8888-888888888888";
const ACTOR_ID = "99999999-9999-4999-8999-999999999999";
const TIMESTAMP = "2026-08-02T08:00:00.000Z";
const LATER_TIMESTAMP = "2026-08-03T08:00:00.000Z";

const PENDING_PROFILE = {
  user_id: USER_ID,
  code: "abc12345",
  status: "pending",
  display_name: "Afiliado teste",
  created_by_user_id: USER_ID,
  activated_by_user_id: null,
  activated_at: null,
  suspended_at: null,
  suspension_reason: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

const ACTIVE_PROFILE = {
  ...PENDING_PROFILE,
  status: "active",
  activated_by_user_id: ACTOR_ID,
  activated_at: TIMESTAMP,
} as const;

const SUSPENDED_PROFILE = {
  ...ACTIVE_PROFILE,
  status: "suspended",
  suspended_at: LATER_TIMESTAMP,
  suspension_reason: "Violação comprovada dos termos.",
} as const;

const TERMS_ROW = {
  id: TERMS_ID,
  subject_type: "course",
  subject_id: SUBJECT_ID,
  commission_bps: 1500,
  attribution_window_days: 30,
  active: true,
  created_by_user_id: ACTOR_ID,
  updated_by_user_id: ACTOR_ID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

const ACTIVE_LINK_ROW = {
  id: LINK_ID,
  affiliate_user_id: USER_ID,
  subject_type: "course",
  subject_id: SUBJECT_ID,
  code: "abc123def456",
  status: "active",
  destination_path: "/curso/fundamentos?origem=afiliado",
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deactivated_at: null,
} as const;

const DRAFT_PAYOUT_ROW = {
  id: PAYOUT_ID,
  affiliate_user_id: USER_ID,
  status: "draft",
  amount_cents: 2500,
  currency_code: "BRL",
  external_reference: null,
  notes: "Pagamento referente a julho.",
  created_by_user_id: ACTOR_ID,
  paid_by_user_id: null,
  paid_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

const OFFER_WITHOUT_LINK = {
  subject_type: "course",
  subject_id: SUBJECT_ID,
  title: "Fundamentos",
  slug: "fundamentos",
  commission_bps: 1500,
  attribution_window_days: 30,
  link_id: null,
  link_code: null,
  destination_path: null,
  link_status: null,
} as const;

const PORTAL = {
  profile: PENDING_PROFILE,
  summary: {
    clicks: 0,
    conversions: 0,
    gross_sales_cents: 0,
    available_cents: 0,
    held_cents: 0,
    paid_cents: 0,
    reversed_cents: 0,
  },
  offers: [OFFER_WITHOUT_LINK],
  links: [],
  commissions: [],
  payouts: [],
  events: [],
} as const;

const ADMIN_PAYOUT = {
  id: PAYOUT_ID,
  affiliate_user_id: USER_ID,
  status: "draft",
  amount_cents: 2500,
  external_reference: null,
  notes: null,
  cancellation_reason: null,
  created_at: TIMESTAMP,
  paid_at: null,
  cancelled_at: null,
  commission_ids: [COMMISSION_ID],
} as const;

describe("affiliateProfileSchema", () => {
  it("aceita estados pending, active e suspended coerentes", () => {
    expect(affiliateProfileSchema.parse(PENDING_PROFILE)).toEqual(PENDING_PROFILE);
    expect(affiliateProfileSchema.parse(ACTIVE_PROFILE)).toEqual(ACTIVE_PROFILE);
    expect(affiliateProfileSchema.parse(SUSPENDED_PROFILE)).toEqual(SUSPENDED_PROFILE);
  });

  it("rejeita código fora do formato persistido", () => {
    expect(
      affiliateProfileSchema.safeParse({ ...PENDING_PROFILE, code: "ABC-123" }).success,
    ).toBe(false);
  });

  it("rejeita estado incoerente e motivo fora dos limites", () => {
    expect(
      affiliateProfileSchema.safeParse({
        ...PENDING_PROFILE,
        status: "active",
      }).success,
    ).toBe(false);
    expect(
      affiliateProfileSchema.safeParse({
        ...SUSPENDED_PROFILE,
        suspension_reason: "x",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      affiliateProfileSchema.safeParse({ ...PENDING_PROFILE, secret: true }).success,
    ).toBe(false);
  });
});

describe("affiliateSubjectTermsRowSchema", () => {
  it("aceita termos completos retornados pela RPC", () => {
    expect(affiliateSubjectTermsRowSchema.parse(TERMS_ROW)).toEqual(TERMS_ROW);
  });

  it("rejeita comissão e janela fora dos constraints", () => {
    expect(
      affiliateSubjectTermsRowSchema.safeParse({ ...TERMS_ROW, commission_bps: 0 }).success,
    ).toBe(false);
    expect(
      affiliateSubjectTermsRowSchema.safeParse({
        ...TERMS_ROW,
        attribution_window_days: 366,
      }).success,
    ).toBe(false);
  });
});

describe("affiliateOfferSchema", () => {
  it("aceita oferta sem link e com link ativo completo", () => {
    expect(affiliateOfferSchema.parse(OFFER_WITHOUT_LINK)).toEqual(OFFER_WITHOUT_LINK);

    const withLink = {
      ...OFFER_WITHOUT_LINK,
      link_id: LINK_ID,
      link_code: "abc123def456",
      destination_path: "/curso/fundamentos",
      link_status: "active",
    } as const;
    expect(affiliateOfferSchema.parse(withLink)).toEqual(withLink);
  });

  it("rejeita conjunto parcial ou link inativo exposto como oferta", () => {
    expect(
      affiliateOfferSchema.safeParse({
        ...OFFER_WITHOUT_LINK,
        link_id: LINK_ID,
      }).success,
    ).toBe(false);
    expect(
      affiliateOfferSchema.safeParse({
        ...OFFER_WITHOUT_LINK,
        link_id: LINK_ID,
        link_code: "abc123def456",
        destination_path: "/curso/fundamentos",
        link_status: "inactive",
      }).success,
    ).toBe(false);
  });
});

describe("affiliateLinkRowSchema", () => {
  it("aceita link ativo e link inativo com timestamp", () => {
    expect(affiliateLinkRowSchema.parse(ACTIVE_LINK_ROW)).toEqual(ACTIVE_LINK_ROW);
    const inactive = {
      ...ACTIVE_LINK_ROW,
      status: "inactive",
      deactivated_at: LATER_TIMESTAMP,
    } as const;
    expect(affiliateLinkRowSchema.parse(inactive)).toEqual(inactive);
  });

  it("rejeita path externo, protocolo relativo, barra invertida e estado incoerente", () => {
    for (const destination_path of [
      "https://example.com",
      "//example.com/path",
      "/curso\\externo",
      "/curso com espaco",
    ]) {
      expect(
        affiliateLinkRowSchema.safeParse({
          ...ACTIVE_LINK_ROW,
          destination_path,
        }).success,
      ).toBe(false);
    }

    expect(
      affiliateLinkRowSchema.safeParse({
        ...ACTIVE_LINK_ROW,
        status: "inactive",
      }).success,
    ).toBe(false);
  });
});

describe("affiliateCommissionSchema", () => {
  const commission = {
    id: COMMISSION_ID,
    order_id: ORDER_ID,
    title: "Fundamentos",
    basis_amount_cents: 10_000,
    commission_bps: 1500,
    commission_amount_cents: 1500,
    status: "available",
    created_at: TIMESTAMP,
    available_at: LATER_TIMESTAMP,
    paid_at: null,
  } as const;

  it("aceita comissão disponível e paga coerentes", () => {
    expect(affiliateCommissionSchema.parse(commission)).toEqual(commission);
    const paid = {
      ...commission,
      status: "paid",
      paid_at: LATER_TIMESTAMP,
    } as const;
    expect(affiliateCommissionSchema.parse(paid)).toEqual(paid);
  });

  it("rejeita valor zero, comissão maior que base e timestamps impossíveis", () => {
    expect(
      affiliateCommissionSchema.safeParse({
        ...commission,
        commission_amount_cents: 0,
      }).success,
    ).toBe(false);
    expect(
      affiliateCommissionSchema.safeParse({
        ...commission,
        commission_amount_cents: 10_001,
      }).success,
    ).toBe(false);
    expect(
      affiliateCommissionSchema.safeParse({
        ...commission,
        status: "pending",
      }).success,
    ).toBe(false);
  });
});

describe("affiliatePayout schemas", () => {
  it("aceita linhas completas draft, paid e cancelled", () => {
    expect(affiliatePayoutRowSchema.parse(DRAFT_PAYOUT_ROW)).toEqual(DRAFT_PAYOUT_ROW);

    const paid = {
      ...DRAFT_PAYOUT_ROW,
      status: "paid",
      external_reference: "TRX-2026-001",
      paid_by_user_id: ACTOR_ID,
      paid_at: LATER_TIMESTAMP,
    } as const;
    expect(affiliatePayoutRowSchema.parse(paid)).toEqual(paid);

    const cancelled = {
      ...DRAFT_PAYOUT_ROW,
      status: "cancelled",
      cancelled_at: LATER_TIMESTAMP,
      cancellation_reason: "Dados bancários inválidos.",
    } as const;
    expect(affiliatePayoutRowSchema.parse(cancelled)).toEqual(cancelled);
  });

  it("rejeita estado completo incoerente, moeda diferente e valor não positivo", () => {
    expect(
      affiliatePayoutRowSchema.safeParse({
        ...DRAFT_PAYOUT_ROW,
        status: "paid",
      }).success,
    ).toBe(false);
    expect(
      affiliatePayoutRowSchema.safeParse({
        ...DRAFT_PAYOUT_ROW,
        currency_code: "USD",
      }).success,
    ).toBe(false);
    expect(
      affiliatePayoutRowSchema.safeParse({
        ...DRAFT_PAYOUT_ROW,
        amount_cents: 0,
      }).success,
    ).toBe(false);
  });

  it("valida o modelo resumido do portal", () => {
    const portalPayout = {
      id: PAYOUT_ID,
      status: "paid",
      amount_cents: 2500,
      external_reference: "TRX-2026-001",
      notes: null,
      paid_at: LATER_TIMESTAMP,
      created_at: TIMESTAMP,
    } as const;
    expect(affiliatePayoutSchema.parse(portalPayout)).toEqual(portalPayout);
    expect(
      affiliatePayoutSchema.safeParse({
        ...portalPayout,
        external_reference: null,
      }).success,
    ).toBe(false);
  });
});

describe("affiliateClickResultSchema", () => {
  it("aceita somente os dois motivos canônicos de rejeição", () => {
    for (const reason of [
      "AFFILIATE_LINK_NOT_AVAILABLE",
      "AFFILIATE_SUBJECT_NOT_AVAILABLE",
    ]) {
      expect(
        affiliateClickResultSchema.parse({ accepted: false, reason }),
      ).toEqual({ accepted: false, reason });
    }
  });

  it("aceita atribuição completa e rejeita respostas híbridas", () => {
    const accepted = {
      accepted: true,
      reason: null,
      destination_path: "/curso/fundamentos",
      attribution_id: LINK_ID,
      expires_at: LATER_TIMESTAMP,
    } as const;
    expect(affiliateClickResultSchema.parse(accepted)).toEqual(accepted);

    expect(
      affiliateClickResultSchema.safeParse({
        accepted: true,
        reason: null,
        destination_path: "/curso/fundamentos",
      }).success,
    ).toBe(false);
    expect(
      affiliateClickResultSchema.safeParse({
        accepted: false,
        reason: "UNKNOWN",
        destination_path: "/curso/fundamentos",
      }).success,
    ).toBe(false);
  });
});

describe("affiliatePortalSchema", () => {
  it("aceita o payload agregado canônico", () => {
    expect(affiliatePortalSchema.parse(PORTAL)).toEqual(PORTAL);
  });

  it("rejeita campos extras em qualquer nível", () => {
    expect(
      affiliatePortalSchema.safeParse({ ...PORTAL, internal: true }).success,
    ).toBe(false);
    expect(
      affiliatePortalSchema.safeParse({
        ...PORTAL,
        summary: { ...PORTAL.summary, hidden: 1 },
      }).success,
    ).toBe(false);
  });
});

describe("affiliateAdmin schemas", () => {
  const notRequested = {
    user_id: USER_ID,
    code: null,
    status: "not_requested",
    display_name: null,
    created_at: null,
    activated_at: null,
    suspended_at: null,
    suspension_reason: null,
    links: 0,
    clicks: 0,
    conversions: 0,
    available_cents: 0,
  } as const;

  it("aceita perfil não solicitado e rejeita campos de perfil residuais", () => {
    expect(affiliateAdminProfileSchema.parse(notRequested)).toEqual(notRequested);
    expect(
      affiliateAdminProfileSchema.safeParse({
        ...notRequested,
        code: "abc12345",
      }).success,
    ).toBe(false);
  });

  it("valida coerência dos termos administrativos", () => {
    const offer = {
      subject_type: "course",
      subject_id: SUBJECT_ID,
      title: "Fundamentos",
      slug: "fundamentos",
      publication_status: "published",
      affiliate_eligible: true,
      terms_id: TERMS_ID,
      commission_bps: 1500,
      attribution_window_days: 30,
      terms_active: true,
    } as const;
    expect(affiliateAdminOfferSchema.parse(offer)).toEqual(offer);
    expect(
      affiliateAdminOfferSchema.safeParse({
        ...offer,
        commission_bps: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita payout administrativo duplicado ou incoerente", () => {
    expect(affiliateAdminPayoutSchema.parse(ADMIN_PAYOUT)).toEqual(ADMIN_PAYOUT);
    expect(
      affiliateAdminPayoutSchema.safeParse({
        ...ADMIN_PAYOUT,
        commission_ids: [COMMISSION_ID, COMMISSION_ID],
      }).success,
    ).toBe(false);
    expect(
      affiliateAdminPayoutSchema.safeParse({
        ...ADMIN_PAYOUT,
        status: "cancelled",
      }).success,
    ).toBe(false);
  });

  it("aceita dashboard administrativo estrito", () => {
    const dashboard = {
      summary: {
        affiliates: 1,
        active_affiliates: 0,
        clicks: 0,
        conversions: 0,
        available_cents: 0,
        held_cents: 0,
        paid_cents: 0,
      },
      profiles: [notRequested],
      offers: [],
      available_commissions: [],
      payouts: [ADMIN_PAYOUT],
    } as const;
    expect(affiliateAdminDashboardSchema.parse(dashboard)).toEqual(dashboard);
  });
});

describe("affiliateEventSchema", () => {
  it("aceita evento canônico e rejeita tipo livre", () => {
    const event = {
      id: EVENT_ID,
      event_type: "link_created",
      details: { link_id: LINK_ID },
      created_at: TIMESTAMP,
    } as const;
    expect(affiliateEventSchema.parse(event)).toEqual(event);
    expect(
      affiliateEventSchema.safeParse({ ...event, event_type: "custom" }).success,
    ).toBe(false);
  });
});

describe("affiliate mutation inputs", () => {
  it("normaliza nome opcional e aplica limites", () => {
    expect(affiliateDisplayNameInputSchema.parse("  DJ Stay  ")).toBe("DJ Stay");
    expect(affiliateDisplayNameInputSchema.parse("   ")).toBe("");
    expect(affiliateDisplayNameInputSchema.safeParse("x").success).toBe(false);
  });

  it("valida criação de link e bloqueia path inseguro", () => {
    const input = {
      subjectType: "course",
      subjectId: SUBJECT_ID,
      destinationPath: "/curso/fundamentos",
    } as const;
    expect(affiliateCreateLinkInputSchema.parse(input)).toEqual(input);
    expect(
      affiliateCreateLinkInputSchema.safeParse({
        ...input,
        destinationPath: "//example.com",
      }).success,
    ).toBe(false);
  });

  it("discrimina ativação e suspensão de perfil", () => {
    expect(
      affiliateProfileStatusInputSchema.safeParse({
        userId: USER_ID,
        status: "active",
        reason: null,
      }).success,
    ).toBe(true);
    expect(
      affiliateProfileStatusInputSchema.safeParse({
        userId: USER_ID,
        status: "suspended",
        reason: "Fraude confirmada.",
      }).success,
    ).toBe(true);
    expect(
      affiliateProfileStatusInputSchema.safeParse({
        userId: USER_ID,
        status: "suspended",
        reason: null,
      }).success,
    ).toBe(false);
  });

  it("valida termos, criação de payout e comissões únicas", () => {
    expect(
      affiliateTermsInputSchema.safeParse({
        subjectType: "course",
        subjectId: SUBJECT_ID,
        commissionBps: 1500,
        attributionWindowDays: 30,
        active: true,
      }).success,
    ).toBe(true);
    expect(
      affiliateCreatePayoutInputSchema.safeParse({
        affiliateUserId: USER_ID,
        commissionIds: [COMMISSION_ID, COMMISSION_ID],
        notes: null,
      }).success,
    ).toBe(false);
  });

  it("valida referência de pagamento e motivo de cancelamento", () => {
    expect(
      affiliateMarkPayoutPaidInputSchema.parse({
        payoutId: PAYOUT_ID,
        externalReference: "  TRX-2026-001  ",
      }),
    ).toEqual({ payoutId: PAYOUT_ID, externalReference: "TRX-2026-001" });
    expect(
      affiliateCancelPayoutInputSchema.safeParse({
        payoutId: PAYOUT_ID,
        reason: "x",
      }).success,
    ).toBe(false);
  });
});
