import { describe, expect, it } from "vitest";

import {
  mySupportTicketsSchema,
  supportAdminDashboardSchema,
  supportAdminTicketSchema,
  supportMessageAuthorRoleSchema,
  supportMessageSchema,
  supportMutationResultSchema,
  supportTicketPrioritySchema,
  supportTicketSchema,
  supportTicketStatusSchema,
} from "./support";

const TICKET_ID = "123e4567-e89b-42d3-a456-426614174000";
const MESSAGE_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const REFERENCE_CODE = "SUP-0123456789ABCDEF";
const TIMESTAMP = "2026-08-02T06:30:00-03:00";

const MESSAGE = {
  id: MESSAGE_ID,
  author_role: "student",
  body: "Preciso de ajuda com o acesso ao curso.",
  created_at: TIMESTAMP,
} as const;

const TICKET = {
  id: TICKET_ID,
  reference_code: REFERENCE_CODE,
  subject: "Problema de acesso",
  category: "Acesso",
  priority: "normal",
  status: "awaiting_support",
  last_message_at: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  messages: [MESSAGE],
} as const;

const ADMIN_TICKET = {
  ...TICKET,
  user_id: USER_ID,
  customer_email: "aluno@example.com",
} as const;

describe("enums de suporte", () => {
  it.each([
    "open",
    "awaiting_support",
    "awaiting_student",
    "resolved",
    "closed",
  ] as const)("aceita status canônico %s", (status) => {
    expect(supportTicketStatusSchema.parse(status)).toBe(status);
  });

  it.each(["low", "normal", "high", "urgent"] as const)(
    "aceita prioridade canônica %s",
    (priority) => {
      expect(supportTicketPrioritySchema.parse(priority)).toBe(priority);
    },
  );

  it.each(["student", "support"] as const)(
    "aceita papel de autor canônico %s",
    (role) => {
      expect(supportMessageAuthorRoleSchema.parse(role)).toBe(role);
    },
  );

  it.each(["pending", "AWAITING_SUPPORT", ""])(
    "rejeita status inválido %j",
    (status) => {
      expect(supportTicketStatusSchema.safeParse(status).success).toBe(false);
    },
  );
});

describe("supportMessageSchema", () => {
  it("aceita mensagem válida", () => {
    expect(supportMessageSchema.parse(MESSAGE)).toEqual(MESSAGE);
  });

  it("normaliza espaços externos do corpo", () => {
    expect(
      supportMessageSchema.parse({
        ...MESSAGE,
        body: "  Mensagem válida  ",
      }).body,
    ).toBe("Mensagem válida");
  });

  it.each(["", "a"])("rejeita corpo curto %j", (body) => {
    expect(supportMessageSchema.safeParse({ ...MESSAGE, body }).success).toBe(
      false,
    );
  });

  it("rejeita corpo acima de 5000 caracteres", () => {
    expect(
      supportMessageSchema.safeParse({
        ...MESSAGE,
        body: "a".repeat(5001),
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamp sem timezone", () => {
    expect(
      supportMessageSchema.safeParse({
        ...MESSAGE,
        created_at: "2026-08-02T06:30:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita UUID inválido e campo adicional", () => {
    expect(
      supportMessageSchema.safeParse({
        ...MESSAGE,
        id: "mensagem-invalida",
      }).success,
    ).toBe(false);
    expect(
      supportMessageSchema.safeParse({
        ...MESSAGE,
        author_user_id: USER_ID,
      }).success,
    ).toBe(false);
  });
});

describe("supportTicketSchema", () => {
  it("aceita ticket completo", () => {
    expect(supportTicketSchema.parse(TICKET)).toEqual(TICKET);
  });

  it.each([
    "SUP-0123456789ABCDE",
    "SUP-0123456789abcdef",
    "TKT-0123456789ABCDEF",
  ])("rejeita referência inválida %s", (reference_code) => {
    expect(
      supportTicketSchema.safeParse({ ...TICKET, reference_code }).success,
    ).toBe(false);
  });

  it("rejeita assunto fora do limite do banco", () => {
    expect(
      supportTicketSchema.safeParse({ ...TICKET, subject: "abcd" }).success,
    ).toBe(false);
    expect(
      supportTicketSchema.safeParse({
        ...TICKET,
        subject: "a".repeat(201),
      }).success,
    ).toBe(false);
  });

  it("rejeita categoria fora do limite do banco", () => {
    expect(
      supportTicketSchema.safeParse({ ...TICKET, category: "a" }).success,
    ).toBe(false);
    expect(
      supportTicketSchema.safeParse({
        ...TICKET,
        category: "a".repeat(81),
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamp inválido e campo extra", () => {
    expect(
      supportTicketSchema.safeParse({
        ...TICKET,
        updated_at: "ontem",
      }).success,
    ).toBe(false);
    expect(
      supportTicketSchema.safeParse({
        ...TICKET,
        internal_event_count: 3,
      }).success,
    ).toBe(false);
  });
});

describe("listas e dashboard de suporte", () => {
  it("aceita e normaliza total numérico do portal do aluno", () => {
    expect(
      mySupportTicketsSchema.parse({ total: "1", tickets: [TICKET] }),
    ).toEqual({ total: 1, tickets: [TICKET] });
  });

  it("rejeita contagem negativa e campo adicional", () => {
    expect(
      mySupportTicketsSchema.safeParse({ total: -1, tickets: [] }).success,
    ).toBe(false);
    expect(
      mySupportTicketsSchema.safeParse({
        total: 1,
        tickets: [TICKET],
        cursor: "interno",
      }).success,
    ).toBe(false);
  });

  it("aceita ticket administrativo com usuário e e-mail", () => {
    expect(supportAdminTicketSchema.parse(ADMIN_TICKET)).toEqual(ADMIN_TICKET);
  });

  it("rejeita e-mail administrativo inválido", () => {
    expect(
      supportAdminTicketSchema.safeParse({
        ...ADMIN_TICKET,
        customer_email: "email-invalido",
      }).success,
    ).toBe(false);
  });

  it("aceita dashboard administrativo completo", () => {
    const dashboard = {
      summary: {
        total: 1,
        awaiting_support: 1,
        awaiting_student: 0,
        urgent: 0,
      },
      total: 1,
      tickets: [ADMIN_TICKET],
    };

    expect(supportAdminDashboardSchema.parse(dashboard)).toEqual(dashboard);
  });

  it("rejeita campo adicional no resumo administrativo", () => {
    expect(
      supportAdminDashboardSchema.safeParse({
        summary: {
          total: 1,
          awaiting_support: 1,
          awaiting_student: 0,
          urgent: 0,
          closed: 0,
        },
        total: 1,
        tickets: [ADMIN_TICKET],
      }).success,
    ).toBe(false);
  });
});

describe("supportMutationResultSchema", () => {
  it("aceita retorno de criação de ticket", () => {
    expect(
      supportMutationResultSchema.parse({
        id: TICKET_ID,
        reference_code: REFERENCE_CODE,
      }),
    ).toEqual({ id: TICKET_ID, reference_code: REFERENCE_CODE });
  });

  it("aceita retorno de mensagem e status", () => {
    expect(
      supportMutationResultSchema.parse({
        id: MESSAGE_ID,
        ticket_id: TICKET_ID,
        status: "awaiting_student",
      }),
    ).toEqual({
      id: MESSAGE_ID,
      ticket_id: TICKET_ID,
      status: "awaiting_student",
    });
  });

  it("rejeita UUID, referência e campos extras inválidos", () => {
    expect(
      supportMutationResultSchema.safeParse({ id: "resultado-invalido" })
        .success,
    ).toBe(false);
    expect(
      supportMutationResultSchema.safeParse({
        id: TICKET_ID,
        reference_code: "SUP-invalido",
      }).success,
    ).toBe(false);
    expect(
      supportMutationResultSchema.safeParse({
        id: TICKET_ID,
        provider_payload: {},
      }).success,
    ).toBe(false);
  });
});
