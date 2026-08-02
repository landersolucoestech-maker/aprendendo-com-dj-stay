import { afterEach, describe, expect, it, vi } from "vitest";

import {
  courseSummarySchema,
  enrollmentEventSchema,
  enrollmentEventsSchema,
  enrollmentRowSchema,
  enrollmentRowsSchema,
  enrollmentWithCourseSchema,
  enrollmentsWithCourseSchema,
  getActiveEnrollments,
} from "@/contracts/course-access";

const ENROLLMENT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const COURSE_ID = "33333333-3333-4333-8333-333333333333";
const ADMIN_ID = "44444444-4444-4444-8444-444444444444";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";
const STARTS_AT = "2026-08-01T12:00:00.000Z";
const NOW = "2026-08-02T12:00:00.000Z";
const EXPIRES_AT = "2026-08-03T12:00:00.000Z";
const TIMESTAMP = "2026-08-01T11:00:00.000Z";

const COURSE = {
  id: COURSE_ID,
  title: "Aprendendo com DJ Stay",
  slug: "aprendendo-com-dj-stay",
  status: "published",
} as const;

const ACTIVE_PURCHASE = {
  id: ENROLLMENT_ID,
  user_id: USER_ID,
  course_id: COURSE_ID,
  status: "active",
  source: "purchase",
  source_reference: "ORDER-2026-0001",
  payment_confirmed_at: STARTS_AT,
  starts_at: STARTS_AT,
  expires_at: EXPIRES_AT,
  status_reason: null,
  courses: COURSE,
} as const;

const ACTIVE_MANUAL_ROW = {
  id: ENROLLMENT_ID,
  user_id: USER_ID,
  course_id: COURSE_ID,
  status: "active",
  source: "manual_grant",
  source_reference: null,
  payment_confirmed_at: null,
  starts_at: STARTS_AT,
  expires_at: EXPIRES_AT,
  granted_by_user_id: ADMIN_ID,
  status_reason: "Acesso concedido pela equipe.",
  suspended_at: null,
  revoked_at: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

afterEach(() => {
  vi.useRealTimers();
});

describe("courseSummarySchema", () => {
  it("aceita curso resumido estrito", () => {
    expect(courseSummarySchema.parse(COURSE)).toEqual(COURSE);
  });

  it("rejeita slug inválido, título longo, UUID e campos extras", () => {
    expect(
      courseSummarySchema.safeParse({ ...COURSE, slug: "Curso Inválido" }).success,
    ).toBe(false);
    expect(
      courseSummarySchema.safeParse({ ...COURSE, title: "x".repeat(201) }).success,
    ).toBe(false);
    expect(
      courseSummarySchema.safeParse({ ...COURSE, id: "curso" }).success,
    ).toBe(false);
    expect(
      courseSummarySchema.safeParse({ ...COURSE, internal: true }).success,
    ).toBe(false);
  });
});

describe("enrollmentWithCourseSchema", () => {
  it("aceita compra ativa confirmada e coleção", () => {
    expect(enrollmentWithCourseSchema.parse(ACTIVE_PURCHASE)).toEqual(
      ACTIVE_PURCHASE,
    );
    expect(enrollmentsWithCourseSchema.parse([ACTIVE_PURCHASE])).toEqual([
      ACTIVE_PURCHASE,
    ]);
  });

  it("aceita compra pendente com referência e sem confirmação", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        status: "pending",
        payment_confirmed_at: null,
      }).success,
    ).toBe(true);
  });

  it("aceita matrícula manual ativa sem dados de compra", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        source: "manual_grant",
        source_reference: null,
        payment_confirmed_at: null,
      }).success,
    ).toBe(true);
  });

  it("rejeita compra sem referência", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        source_reference: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita compra ativa sem confirmação de pagamento", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        payment_confirmed_at: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita matrícula manual pendente", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        source: "manual_grant",
        source_reference: null,
        payment_confirmed_at: null,
        status: "pending",
      }).success,
    ).toBe(false);
  });

  it("rejeita expiração anterior ou igual ao início", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        expires_at: STARTS_AT,
      }).success,
    ).toBe(false);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        expires_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("aceita acesso sem expiração", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        expires_at: null,
      }).success,
    ).toBe(true);
  });

  it("rejeita referência e motivo fora dos limites", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        source_reference: "curta",
      }).success,
    ).toBe(false);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        source_reference: "x".repeat(201),
      }).success,
    ).toBe(false);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        status_reason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamp, UUID e campos extras inválidos", () => {
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        starts_at: "2026-08-01",
      }).success,
    ).toBe(false);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        user_id: "usuario",
      }).success,
    ).toBe(false);
    expect(
      enrollmentWithCourseSchema.safeParse({
        ...ACTIVE_PURCHASE,
        granted_by_user_id: ADMIN_ID,
      }).success,
    ).toBe(false);
  });
});

describe("enrollmentRowSchema", () => {
  it("aceita matrícula manual ativa completa e coleção", () => {
    expect(enrollmentRowSchema.parse(ACTIVE_MANUAL_ROW)).toEqual(
      ACTIVE_MANUAL_ROW,
    );
    expect(enrollmentRowsSchema.parse([ACTIVE_MANUAL_ROW])).toEqual([
      ACTIVE_MANUAL_ROW,
    ]);
  });

  it("aceita compra ativa completa", () => {
    const purchase = {
      ...ACTIVE_MANUAL_ROW,
      source: "purchase",
      source_reference: "ORDER-2026-0001",
      payment_confirmed_at: STARTS_AT,
      granted_by_user_id: null,
      status_reason: null,
    } as const;
    expect(enrollmentRowSchema.parse(purchase)).toEqual(purchase);
  });

  it("rejeita matrícula manual sem concedente ou com dados de compra", () => {
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        granted_by_user_id: null,
      }).success,
    ).toBe(false);
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        source_reference: "ORDER-2026-0001",
      }).success,
    ).toBe(false);
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        payment_confirmed_at: STARTS_AT,
      }).success,
    ).toBe(false);
  });

  it("rejeita compra com concedente manual", () => {
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        source: "purchase",
        source_reference: "ORDER-2026-0001",
        payment_confirmed_at: STARTS_AT,
      }).success,
    ).toBe(false);
  });

  it("aceita suspensão e revogação coerentes", () => {
    const suspended = {
      ...ACTIVE_MANUAL_ROW,
      status: "suspended",
      suspended_at: NOW,
      status_reason: "Acesso suspenso para análise.",
    } as const;
    const revoked = {
      ...ACTIVE_MANUAL_ROW,
      status: "revoked",
      revoked_at: NOW,
      status_reason: "Acesso revogado definitivamente.",
    } as const;
    expect(enrollmentRowSchema.parse(suspended)).toEqual(suspended);
    expect(enrollmentRowSchema.parse(revoked)).toEqual(revoked);
  });

  it("rejeita estados finais sem timestamp ou motivo", () => {
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        status: "suspended",
      }).success,
    ).toBe(false);
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        status: "revoked",
        revoked_at: NOW,
        status_reason: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita estado aberto com timestamps finais residuais", () => {
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        suspended_at: NOW,
      }).success,
    ).toBe(false);
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        revoked_at: NOW,
      }).success,
    ).toBe(false);
  });

  it("rejeita suspensão e revogação simultâneas", () => {
    expect(
      enrollmentRowSchema.safeParse({
        ...ACTIVE_MANUAL_ROW,
        status: "revoked",
        suspended_at: NOW,
        revoked_at: NOW,
      }).success,
    ).toBe(false);
  });
});

describe("enrollmentEventSchema", () => {
  const event = {
    id: EVENT_ID,
    enrollment_id: ENROLLMENT_ID,
    actor_user_id: ADMIN_ID,
    event_type: "activated",
    from_status: "suspended",
    to_status: "active",
    details: { reason: "Pagamento regularizado" },
    created_at: NOW,
  } as const;

  it("aceita evento canônico e coleção", () => {
    expect(enrollmentEventSchema.parse(event)).toEqual(event);
    expect(enrollmentEventsSchema.parse([event])).toEqual([event]);
  });

  it("aceita ator e estados nulos quando o evento permite", () => {
    expect(
      enrollmentEventSchema.safeParse({
        ...event,
        actor_user_id: null,
        event_type: "access_denied",
        from_status: null,
        to_status: null,
      }).success,
    ).toBe(true);
  });

  it("rejeita evento livre, details não objeto e campos extras", () => {
    expect(
      enrollmentEventSchema.safeParse({ ...event, event_type: "custom" }).success,
    ).toBe(false);
    expect(
      enrollmentEventSchema.safeParse({ ...event, details: [] }).success,
    ).toBe(false);
    expect(
      enrollmentEventSchema.safeParse({ ...event, internal: true }).success,
    ).toBe(false);
  });
});

describe("getActiveEnrollments", () => {
  it("retorna apenas matrícula ativa, publicada e dentro da janela", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));

    const future = {
      ...ACTIVE_PURCHASE,
      starts_at: EXPIRES_AT,
      expires_at: "2026-08-04T12:00:00.000Z",
    } as const;
    const expired = {
      ...ACTIVE_PURCHASE,
      expires_at: NOW,
    } as const;
    const suspended = {
      ...ACTIVE_PURCHASE,
      status: "suspended",
    } as const;
    const draftCourse = {
      ...ACTIVE_PURCHASE,
      courses: { ...COURSE, status: "draft" },
    } as const;
    const permanent = {
      ...ACTIVE_PURCHASE,
      id: EVENT_ID,
      expires_at: null,
    } as const;

    expect(
      getActiveEnrollments([
        ACTIVE_PURCHASE,
        future,
        expired,
        suspended,
        draftCourse,
        permanent,
      ]),
    ).toEqual([ACTIVE_PURCHASE, permanent]);
  });

  it("considera o início inclusivo e a expiração exclusiva", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(STARTS_AT));

    expect(getActiveEnrollments([ACTIVE_PURCHASE])).toEqual([ACTIVE_PURCHASE]);

    vi.setSystemTime(new Date(EXPIRES_AT));
    expect(getActiveEnrollments([ACTIVE_PURCHASE])).toEqual([]);
  });
});
