import { describe, expect, it } from "vitest";

import {
  contactAdminDashboardSchema,
  contactAdminMessageSchema,
  contactMessageEventSchema,
  contactMessageEventsSchema,
  contactStatusUpdateInputSchema,
  contactStatusUpdateResultSchema,
  contactSubmissionInputSchema,
  contactSubmissionResultSchema,
} from "@/contracts/contact-messages";

const MESSAGE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";
const EVENT_ID = "44444444-4444-4444-8444-444444444444";
const IDEMPOTENCY_ID = "55555555-5555-4555-8555-555555555555";
const TIMESTAMP = "2026-08-02T09:00:00.000Z";
const LATER_TIMESTAMP = "2026-08-02T10:00:00.000Z";
const REFERENCE = "CONTATO-A1B2C3D4E5F60708";

const NEW_MESSAGE = {
  id: MESSAGE_ID,
  reference_code: REFERENCE,
  user_id: USER_ID,
  name: "João da Silva",
  email: "joao@example.com",
  subject: "Dúvida sobre o curso",
  message: "Gostaria de entender melhor como funciona o acesso ao curso.",
  status: "new",
  submitted_at: TIMESTAMP,
  handled_at: null,
  handled_by_user_id: null,
  resolution_note: null,
  event_count: 1,
} as const;

const RESOLVED_MESSAGE = {
  ...NEW_MESSAGE,
  status: "resolved",
  handled_at: LATER_TIMESTAMP,
  handled_by_user_id: ADMIN_ID,
  resolution_note: "Orientação enviada ao solicitante.",
  event_count: 2,
} as const;

describe("contactSubmissionInputSchema", () => {
  it("normaliza nome, e-mail, assunto e mensagem", () => {
    expect(
      contactSubmissionInputSchema.parse({
        name: "  João da Silva  ",
        email: "  JOAO@EXAMPLE.COM  ",
        subject: "  Dúvida sobre o curso  ",
        message: "  Gostaria de receber mais informações sobre o curso.  ",
        idempotencyKey: IDEMPOTENCY_ID,
      }),
    ).toEqual({
      name: "João da Silva",
      email: "joao@example.com",
      subject: "Dúvida sobre o curso",
      message: "Gostaria de receber mais informações sobre o curso.",
      idempotencyKey: IDEMPOTENCY_ID,
    });
  });

  it("rejeita limites, e-mail e UUID inválidos", () => {
    expect(
      contactSubmissionInputSchema.safeParse({
        name: "x",
        email: "invalido",
        subject: "oi",
        message: "curta",
        idempotencyKey: "id",
      }).success,
    ).toBe(false);
    expect(
      contactSubmissionInputSchema.safeParse({
        name: "x".repeat(151),
        email: `${"a".repeat(310)}@example.com`,
        subject: "x".repeat(201),
        message: "x".repeat(5_001),
        idempotencyKey: IDEMPOTENCY_ID,
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      contactSubmissionInputSchema.safeParse({
        name: "João da Silva",
        email: "joao@example.com",
        subject: "Dúvida sobre o curso",
        message: "Gostaria de receber mais informações sobre o curso.",
        idempotencyKey: IDEMPOTENCY_ID,
        hidden: true,
      }).success,
    ).toBe(false);
  });
});

describe("contactSubmissionResultSchema", () => {
  const result = {
    id: MESSAGE_ID,
    reference_code: REFERENCE,
    status: "new",
    submitted_at: TIMESTAMP,
    persisted: true,
    duplicate: false,
  } as const;

  it("aceita submissão persistida e replay idempotente", () => {
    expect(contactSubmissionResultSchema.parse(result)).toEqual(result);
    expect(
      contactSubmissionResultSchema.parse({ ...result, duplicate: true }),
    ).toEqual({ ...result, duplicate: true });
  });

  it("aceita replay com status administrativo atual", () => {
    expect(
      contactSubmissionResultSchema.safeParse({
        ...result,
        status: "resolved",
        duplicate: true,
      }).success,
    ).toBe(true);
  });

  it("rejeita protocolo, timestamp, persisted e campos extras inválidos", () => {
    expect(
      contactSubmissionResultSchema.safeParse({
        ...result,
        reference_code: "CONTATO-123",
      }).success,
    ).toBe(false);
    expect(
      contactSubmissionResultSchema.safeParse({
        ...result,
        submitted_at: "2026-08-02",
      }).success,
    ).toBe(false);
    expect(
      contactSubmissionResultSchema.safeParse({
        ...result,
        persisted: false,
      }).success,
    ).toBe(false);
    expect(
      contactSubmissionResultSchema.safeParse({
        ...result,
        internal: true,
      }).success,
    ).toBe(false);
  });
});

describe("contactAdminMessageSchema", () => {
  it("aceita estados new, in_progress, resolved e spam coerentes", () => {
    expect(contactAdminMessageSchema.parse(NEW_MESSAGE)).toEqual(NEW_MESSAGE);
    expect(
      contactAdminMessageSchema.safeParse({
        ...NEW_MESSAGE,
        status: "in_progress",
      }).success,
    ).toBe(true);
    expect(contactAdminMessageSchema.parse(RESOLVED_MESSAGE)).toEqual(
      RESOLVED_MESSAGE,
    );
    expect(
      contactAdminMessageSchema.safeParse({
        ...RESOLVED_MESSAGE,
        status: "spam",
      }).success,
    ).toBe(true);
  });

  it("rejeita estado aberto com dados de tratamento", () => {
    expect(
      contactAdminMessageSchema.safeParse({
        ...NEW_MESSAGE,
        handled_at: LATER_TIMESTAMP,
        handled_by_user_id: ADMIN_ID,
        resolution_note: "Nota residual inválida.",
      }).success,
    ).toBe(false);
  });

  it("rejeita estado final sem operador, timestamp ou nota", () => {
    expect(
      contactAdminMessageSchema.safeParse({
        ...NEW_MESSAGE,
        status: "resolved",
      }).success,
    ).toBe(false);
    expect(
      contactAdminMessageSchema.safeParse({
        ...RESOLVED_MESSAGE,
        handled_by_user_id: null,
      }).success,
    ).toBe(false);
    expect(
      contactAdminMessageSchema.safeParse({
        ...RESOLVED_MESSAGE,
        resolution_note: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita nota curta, textos longos e event_count zero", () => {
    expect(
      contactAdminMessageSchema.safeParse({
        ...RESOLVED_MESSAGE,
        resolution_note: "x",
      }).success,
    ).toBe(false);
    expect(
      contactAdminMessageSchema.safeParse({
        ...NEW_MESSAGE,
        name: "x".repeat(151),
      }).success,
    ).toBe(false);
    expect(
      contactAdminMessageSchema.safeParse({
        ...NEW_MESSAGE,
        event_count: 0,
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      contactAdminMessageSchema.safeParse({
        ...NEW_MESSAGE,
        metadata: {},
      }).success,
    ).toBe(false);
  });
});

describe("contactAdminDashboardSchema", () => {
  const dashboard = {
    summary: {
      new: 1,
      in_progress: 0,
      resolved: 1,
      spam: 0,
    },
    total: 2,
    messages: [NEW_MESSAGE, RESOLVED_MESSAGE],
  } as const;

  it("aceita dashboard estrito com total filtrado", () => {
    expect(contactAdminDashboardSchema.parse(dashboard)).toEqual(dashboard);
  });

  it("rejeita contagem negativa, total ausente e campos extras", () => {
    expect(
      contactAdminDashboardSchema.safeParse({
        ...dashboard,
        summary: { ...dashboard.summary, new: -1 },
      }).success,
    ).toBe(false);
    expect(
      contactAdminDashboardSchema.safeParse({
        ...dashboard,
        total: -1,
      }).success,
    ).toBe(false);
    const { total: omittedTotal, ...withoutTotal } = dashboard;
    expect(omittedTotal).toBe(2);
    expect(contactAdminDashboardSchema.safeParse(withoutTotal).success).toBe(false);
    expect(
      contactAdminDashboardSchema.safeParse({
        ...dashboard,
        summary: { ...dashboard.summary, total: 2 },
      }).success,
    ).toBe(false);
    expect(
      contactAdminDashboardSchema.safeParse({
        ...dashboard,
        pagination: {},
      }).success,
    ).toBe(false);
  });
});

describe("contactStatusUpdateInputSchema", () => {
  it("aceita estados abertos sem nota", () => {
    expect(
      contactStatusUpdateInputSchema.parse({
        contactMessageId: MESSAGE_ID,
        status: "new",
        note: null,
      }),
    ).toEqual({
      contactMessageId: MESSAGE_ID,
      status: "new",
      note: null,
    });
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: MESSAGE_ID,
        status: "in_progress",
      }).success,
    ).toBe(true);
  });

  it("aceita estados finais com nota normalizada", () => {
    expect(
      contactStatusUpdateInputSchema.parse({
        contactMessageId: MESSAGE_ID,
        status: "resolved",
        note: "  Solicitação atendida.  ",
      }),
    ).toEqual({
      contactMessageId: MESSAGE_ID,
      status: "resolved",
      note: "Solicitação atendida.",
    });
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: MESSAGE_ID,
        status: "spam",
        note: "Mensagem não solicitada.",
      }).success,
    ).toBe(true);
  });

  it("rejeita nota ausente no estado final ou residual no estado aberto", () => {
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: MESSAGE_ID,
        status: "resolved",
        note: null,
      }).success,
    ).toBe(false);
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: MESSAGE_ID,
        status: "new",
        note: "Nota residual",
      }).success,
    ).toBe(false);
  });

  it("rejeita UUID, nota longa e campos extras", () => {
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: "mensagem",
        status: "resolved",
        note: "Solicitação atendida.",
      }).success,
    ).toBe(false);
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: MESSAGE_ID,
        status: "resolved",
        note: "x".repeat(2_001),
      }).success,
    ).toBe(false);
    expect(
      contactStatusUpdateInputSchema.safeParse({
        contactMessageId: MESSAGE_ID,
        status: "new",
        note: null,
        hidden: true,
      }).success,
    ).toBe(false);
  });
});

describe("contactStatusUpdateResultSchema", () => {
  const openResult = {
    id: MESSAGE_ID,
    reference_code: REFERENCE,
    status: "in_progress",
    handled_at: null,
    duplicate: false,
  } as const;

  it("aceita resposta aberta e final coerentes", () => {
    expect(contactStatusUpdateResultSchema.parse(openResult)).toEqual(openResult);
    const finalResult = {
      ...openResult,
      status: "resolved",
      handled_at: LATER_TIMESTAMP,
    } as const;
    expect(contactStatusUpdateResultSchema.parse(finalResult)).toEqual(finalResult);
  });

  it("aceita resposta duplicada sem alterar a coerência", () => {
    expect(
      contactStatusUpdateResultSchema.safeParse({
        ...openResult,
        duplicate: true,
      }).success,
    ).toBe(true);
  });

  it("rejeita estado aberto tratado ou estado final sem timestamp", () => {
    expect(
      contactStatusUpdateResultSchema.safeParse({
        ...openResult,
        handled_at: LATER_TIMESTAMP,
      }).success,
    ).toBe(false);
    expect(
      contactStatusUpdateResultSchema.safeParse({
        ...openResult,
        status: "spam",
      }).success,
    ).toBe(false);
  });
});

describe("contactMessageEventSchema", () => {
  const submitted = {
    id: EVENT_ID,
    contact_message_id: MESSAGE_ID,
    event_type: "submitted",
    from_status: null,
    to_status: "new",
    actor_user_id: USER_ID,
    details: { reference_code: REFERENCE },
    created_at: TIMESTAMP,
  } as const;

  it("aceita submissão e coleção de eventos", () => {
    expect(contactMessageEventSchema.parse(submitted)).toEqual(submitted);
    expect(contactMessageEventsSchema.parse([submitted])).toEqual([submitted]);
  });

  it("aceita mudança, resolução e spam canônicos", () => {
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "status_changed",
        from_status: "new",
        to_status: "in_progress",
        actor_user_id: ADMIN_ID,
      }).success,
    ).toBe(true);
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "resolved",
        from_status: "in_progress",
        to_status: "resolved",
        actor_user_id: ADMIN_ID,
      }).success,
    ).toBe(true);
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "marked_spam",
        from_status: "new",
        to_status: "spam",
        actor_user_id: ADMIN_ID,
      }).success,
    ).toBe(true);
  });

  it("rejeita transições incompatíveis ou sem mudança", () => {
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "submitted",
        from_status: "new",
      }).success,
    ).toBe(false);
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "resolved",
        from_status: "new",
        to_status: "spam",
      }).success,
    ).toBe(false);
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "status_changed",
        from_status: "new",
        to_status: "new",
      }).success,
    ).toBe(false);
  });

  it("rejeita details não objeto, tipo livre e campos extras", () => {
    expect(
      contactMessageEventSchema.safeParse({ ...submitted, details: [] }).success,
    ).toBe(false);
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        event_type: "custom",
      }).success,
    ).toBe(false);
    expect(
      contactMessageEventSchema.safeParse({
        ...submitted,
        internal: true,
      }).success,
    ).toBe(false);
  });
});
