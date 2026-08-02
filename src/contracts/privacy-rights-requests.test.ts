import { describe, expect, it } from "vitest";

import {
  adminUpdatePrivacyRightsRequestSchema,
  createPrivacyRightsRequestSchema,
  privacyRightsRequestEventSchema,
  privacyRightsRequestListSchema,
  privacyRightsRequestSchema,
  privacyRightsRequestStatusSchema,
  privacyRightsRequestTypeSchema,
} from "./privacy-rights-requests";

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";
const USER_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN_ID = "9b2c4d6e-8f10-4a12-b345-6789abcdef01";
const TIMESTAMP = "2026-08-02T06:45:00-03:00";
const DESCRIPTION = "Solicito acesso e exportação de todos os meus dados.";

const CREATED_EVENT = {
  id: EVENT_ID,
  action: "created",
  from_status: null,
  to_status: "submitted",
  notes: null,
  created_at: TIMESTAMP,
} as const;

const STUDENT_REQUEST = {
  id: REQUEST_ID,
  request_type: "access_export",
  description: DESCRIPTION,
  status: "submitted",
  admin_notes: null,
  handled_at: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  events: [CREATED_EVENT],
} as const;

const ADMIN_COMPLETED_REQUEST = {
  ...STUDENT_REQUEST,
  user_id: USER_ID,
  user_name: "Aluno Exemplo",
  user_email: "aluno@example.com",
  status: "completed",
  admin_notes: "Exportação disponibilizada ao titular.",
  handled_by: ADMIN_ID,
  handled_at: TIMESTAMP,
  events: [
    { ...CREATED_EVENT, actor_user_id: USER_ID },
    {
      id: ADMIN_ID,
      actor_user_id: ADMIN_ID,
      action: "status_changed",
      from_status: "submitted",
      to_status: "completed",
      notes: "Exportação concluída.",
      created_at: TIMESTAMP,
    },
  ],
} as const;

describe("enums de direitos de privacidade", () => {
  it.each(["access_export", "correction", "deletion"] as const)(
    "aceita o tipo canônico %s",
    (requestType) => {
      expect(privacyRightsRequestTypeSchema.parse(requestType)).toBe(requestType);
    },
  );

  it.each([
    "submitted",
    "in_review",
    "completed",
    "rejected",
    "cancelled",
  ] as const)("aceita o status canônico %s", (status) => {
    expect(privacyRightsRequestStatusSchema.parse(status)).toBe(status);
  });

  it.each(["export", "ACCESS_EXPORT", ""])(
    "rejeita tipo inválido %j",
    (requestType) => {
      expect(privacyRightsRequestTypeSchema.safeParse(requestType).success).toBe(
        false,
      );
    },
  );
});

describe("privacyRightsRequestEventSchema", () => {
  it("aceita evento de criação", () => {
    expect(privacyRightsRequestEventSchema.parse(CREATED_EVENT)).toEqual(
      CREATED_EVENT,
    );
  });

  it("aceita cancelamento submitted para cancelled", () => {
    const event = {
      ...CREATED_EVENT,
      action: "cancelled",
      from_status: "submitted",
      to_status: "cancelled",
    } as const;
    expect(privacyRightsRequestEventSchema.parse(event)).toEqual(event);
  });

  it("aceita mudança real de status", () => {
    const event = {
      ...CREATED_EVENT,
      action: "status_changed",
      from_status: "submitted",
      to_status: "in_review",
      notes: "Análise iniciada.",
    } as const;
    expect(privacyRightsRequestEventSchema.parse(event)).toEqual(event);
  });

  it("rejeita evento de criação com transição inválida", () => {
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        from_status: "submitted",
      }).success,
    ).toBe(false);
  });

  it("rejeita cancelamento fora de submitted para cancelled", () => {
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        action: "cancelled",
        from_status: "in_review",
        to_status: "cancelled",
      }).success,
    ).toBe(false);
  });

  it("rejeita mudança sem origem, destino ou alteração real", () => {
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        action: "status_changed",
        from_status: null,
        to_status: "in_review",
      }).success,
    ).toBe(false);
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        action: "status_changed",
        from_status: "submitted",
        to_status: "submitted",
      }).success,
    ).toBe(false);
  });

  it("normaliza notas e rejeita notas acima de 4000 caracteres", () => {
    const parsed = privacyRightsRequestEventSchema.parse({
      ...CREATED_EVENT,
      notes: "  Registro auditável  ",
    });
    expect(parsed.notes).toBe("Registro auditável");

    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        notes: "a".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("rejeita timestamp sem timezone e campos extras", () => {
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        created_at: "2026-08-02T06:45:00",
      }).success,
    ).toBe(false);
    expect(
      privacyRightsRequestEventSchema.safeParse({
        ...CREATED_EVENT,
        request_id: REQUEST_ID,
      }).success,
    ).toBe(false);
  });
});

describe("privacyRightsRequestSchema", () => {
  it("aceita solicitação do aluno", () => {
    expect(privacyRightsRequestSchema.parse(STUDENT_REQUEST)).toEqual(
      STUDENT_REQUEST,
    );
  });

  it("aceita solicitação administrativa finalizada", () => {
    expect(privacyRightsRequestSchema.parse(ADMIN_COMPLETED_REQUEST)).toEqual(
      ADMIN_COMPLETED_REQUEST,
    );
  });

  it("aceita retorno de mutação e fornece eventos vazios", () => {
    const mutationRow = {
      id: REQUEST_ID,
      user_id: USER_ID,
      request_type: "correction",
      description: DESCRIPTION,
      status: "submitted",
      admin_notes: null,
      handled_by: null,
      handled_at: null,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    } as const;

    expect(privacyRightsRequestSchema.parse(mutationRow)).toEqual({
      ...mutationRow,
      events: [],
    });
  });

  it("aceita e-mail administrativo nulo", () => {
    expect(
      privacyRightsRequestSchema.parse({
        ...ADMIN_COMPLETED_REQUEST,
        user_email: null,
      }).user_email,
    ).toBeNull();
  });

  it("rejeita status final sem horário de tratamento", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...ADMIN_COMPLETED_REQUEST,
        handled_at: null,
        handled_by: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita status não final com horário de tratamento", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...STUDENT_REQUEST,
        handled_at: TIMESTAMP,
      }).success,
    ).toBe(false);
  });

  it("rejeita responsável e horário divergentes", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...ADMIN_COMPLETED_REQUEST,
        handled_by: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita solicitação rejeitada sem justificativa", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...ADMIN_COMPLETED_REQUEST,
        status: "rejected",
        admin_notes: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita descrição fora dos limites persistidos", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...STUDENT_REQUEST,
        description: "curta",
      }).success,
    ).toBe(false);
    expect(
      privacyRightsRequestSchema.safeParse({
        ...STUDENT_REQUEST,
        description: "a".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("rejeita observações administrativas acima do limite", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...ADMIN_COMPLETED_REQUEST,
        admin_notes: "a".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("rejeita e-mail, UUID e timestamp inválidos", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...ADMIN_COMPLETED_REQUEST,
        user_email: "email-invalido",
      }).success,
    ).toBe(false);
    expect(
      privacyRightsRequestSchema.safeParse({
        ...STUDENT_REQUEST,
        id: "solicitacao-invalida",
      }).success,
    ).toBe(false);
    expect(
      privacyRightsRequestSchema.safeParse({
        ...STUDENT_REQUEST,
        updated_at: "ontem",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      privacyRightsRequestSchema.safeParse({
        ...STUDENT_REQUEST,
        internal_payload: {},
      }).success,
    ).toBe(false);
  });
});

describe("privacyRightsRequestListSchema", () => {
  it("aceita lista completa e lista vazia", () => {
    expect(
      privacyRightsRequestListSchema.parse({
        total: 1,
        requests: [STUDENT_REQUEST],
      }),
    ).toEqual({ total: 1, requests: [STUDENT_REQUEST] });
    expect(
      privacyRightsRequestListSchema.parse({ total: 0, requests: [] }),
    ).toEqual({ total: 0, requests: [] });
  });

  it("rejeita total negativo, fracionário e campo extra", () => {
    expect(
      privacyRightsRequestListSchema.safeParse({ total: -1, requests: [] })
        .success,
    ).toBe(false);
    expect(
      privacyRightsRequestListSchema.safeParse({ total: 0.5, requests: [] })
        .success,
    ).toBe(false);
    expect(
      privacyRightsRequestListSchema.safeParse({
        total: 0,
        requests: [],
        cursor: "interno",
      }).success,
    ).toBe(false);
  });
});

describe("createPrivacyRightsRequestSchema", () => {
  it("aceita e normaliza criação válida", () => {
    expect(
      createPrivacyRightsRequestSchema.parse({
        request_type: "deletion",
        description: `  ${DESCRIPTION}  `,
      }),
    ).toEqual({ request_type: "deletion", description: DESCRIPTION });
  });

  it("rejeita descrição curta, longa e campo extra", () => {
    expect(
      createPrivacyRightsRequestSchema.safeParse({
        request_type: "correction",
        description: "curta",
      }).success,
    ).toBe(false);
    expect(
      createPrivacyRightsRequestSchema.safeParse({
        request_type: "correction",
        description: "a".repeat(4001),
      }).success,
    ).toBe(false);
    expect(
      createPrivacyRightsRequestSchema.safeParse({
        request_type: "correction",
        description: DESCRIPTION,
        user_id: USER_ID,
      }).success,
    ).toBe(false);
  });
});

describe("adminUpdatePrivacyRightsRequestSchema", () => {
  it.each(["in_review", "completed"] as const)(
    "aceita atualização administrativa para %s sem notas",
    (status) => {
      const value = { request_id: REQUEST_ID, status, admin_notes: null };
      expect(adminUpdatePrivacyRightsRequestSchema.parse(value)).toEqual(value);
    },
  );

  it("aceita rejeição justificada e normaliza notas", () => {
    expect(
      adminUpdatePrivacyRightsRequestSchema.parse({
        request_id: REQUEST_ID,
        status: "rejected",
        admin_notes: "  Identidade não confirmada.  ",
      }),
    ).toEqual({
      request_id: REQUEST_ID,
      status: "rejected",
      admin_notes: "Identidade não confirmada.",
    });
  });

  it("rejeita rejeição sem justificativa", () => {
    expect(
      adminUpdatePrivacyRightsRequestSchema.safeParse({
        request_id: REQUEST_ID,
        status: "rejected",
        admin_notes: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita status não administrativo, notas longas, UUID e campo extra", () => {
    expect(
      adminUpdatePrivacyRightsRequestSchema.safeParse({
        request_id: REQUEST_ID,
        status: "submitted",
        admin_notes: null,
      }).success,
    ).toBe(false);
    expect(
      adminUpdatePrivacyRightsRequestSchema.safeParse({
        request_id: REQUEST_ID,
        status: "completed",
        admin_notes: "a".repeat(4001),
      }).success,
    ).toBe(false);
    expect(
      adminUpdatePrivacyRightsRequestSchema.safeParse({
        request_id: "solicitacao-invalida",
        status: "completed",
        admin_notes: null,
      }).success,
    ).toBe(false);
    expect(
      adminUpdatePrivacyRightsRequestSchema.safeParse({
        request_id: REQUEST_ID,
        status: "completed",
        admin_notes: null,
        handled_by: ADMIN_ID,
      }).success,
    ).toBe(false);
  });
});
