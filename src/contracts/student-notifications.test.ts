import { describe, expect, it } from "vitest";

import {
  studentNotificationListSchema,
  studentNotificationReadResultSchema,
  studentNotificationSchema,
  studentNotificationsReadAllResultSchema,
  studentNotificationTypeSchema,
} from "./student-notifications";

const NOTIFICATION_ID = "123e4567-e89b-42d3-a456-426614174000";
const SOURCE_ID = "7aa48813-4885-4bc9-9e6f-8dfb32bdba73";
const TIMESTAMP = "2026-08-02T06:30:00-03:00";

const NOTIFICATION = {
  id: NOTIFICATION_ID,
  type: "support_reply",
  title: "Nova resposta no suporte",
  message: "A equipe respondeu ao seu ticket.",
  action_path: "/aluno/suporte",
  source_entity_type: "support_ticket",
  source_entity_id: SOURCE_ID,
  read_at: null,
  created_at: TIMESTAMP,
} as const;

describe("studentNotificationTypeSchema", () => {
  it.each([
    "support_reply",
    "payment_confirmed",
    "access_granted",
    "certificate_issued",
    "system",
  ] as const)("aceita o tipo canônico %s", (type) => {
    expect(studentNotificationTypeSchema.parse(type)).toBe(type);
  });

  it.each(["marketing", "SUPPORT_REPLY", ""])(
    "rejeita o tipo inválido %j",
    (type) => {
      expect(studentNotificationTypeSchema.safeParse(type).success).toBe(false);
    },
  );
});

describe("studentNotificationSchema", () => {
  it("aceita notificação não lida com ação interna", () => {
    expect(studentNotificationSchema.parse(NOTIFICATION)).toEqual(NOTIFICATION);
  });

  it("aceita notificação lida sem ação ou origem", () => {
    const value = {
      ...NOTIFICATION,
      action_path: null,
      source_entity_type: null,
      source_entity_id: null,
      read_at: TIMESTAMP,
    };
    expect(studentNotificationSchema.parse(value)).toEqual(value);
  });

  it("normaliza espaços externos do título e da mensagem", () => {
    const result = studentNotificationSchema.parse({
      ...NOTIFICATION,
      title: "  Título válido  ",
      message: "  Mensagem válida  ",
    });
    expect(result.title).toBe("Título válido");
    expect(result.message).toBe("Mensagem válida");
  });

  it("rejeita título fora dos limites do banco", () => {
    expect(
      studentNotificationSchema.safeParse({ ...NOTIFICATION, title: "ab" })
        .success,
    ).toBe(false);
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        title: "a".repeat(161),
      }).success,
    ).toBe(false);
  });

  it("rejeita mensagem fora dos limites do banco", () => {
    expect(
      studentNotificationSchema.safeParse({ ...NOTIFICATION, message: "ab" })
        .success,
    ).toBe(false);
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        message: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it.each([
    "https://example.com",
    "//example.com/path",
    "aluno/suporte",
    "mailto:suporte@example.com",
    "/\\example.com",
    "/aluno\\suporte",
  ])("rejeita caminho de ação externo ou relativo %j", (action_path) => {
    expect(
      studentNotificationSchema.safeParse({ ...NOTIFICATION, action_path })
        .success,
    ).toBe(false);
  });

  it("rejeita timestamps sem timezone", () => {
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        created_at: "2026-08-02T06:30:00",
      }).success,
    ).toBe(false);
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        read_at: "2026-08-02T06:30:00",
      }).success,
    ).toBe(false);
  });

  it("rejeita UUIDs inválidos", () => {
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        id: "notificacao-invalida",
      }).success,
    ).toBe(false);
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        source_entity_id: "origem-invalida",
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentNotificationSchema.safeParse({
        ...NOTIFICATION,
        idempotency_key: "não expor",
      }).success,
    ).toBe(false);
  });
});

describe("studentNotificationListSchema", () => {
  it("aceita lista completa", () => {
    const list = { total: 1, unread_count: 1, notifications: [NOTIFICATION] };
    expect(studentNotificationListSchema.parse(list)).toEqual(list);
  });

  it("aceita uma página menor que o total persistido", () => {
    const page = { total: 75, unread_count: 12, notifications: [NOTIFICATION] };
    expect(studentNotificationListSchema.parse(page)).toEqual(page);
  });

  it("rejeita contagens negativas ou fracionárias", () => {
    expect(
      studentNotificationListSchema.safeParse({
        total: -1,
        unread_count: 0,
        notifications: [],
      }).success,
    ).toBe(false);
    expect(
      studentNotificationListSchema.safeParse({
        total: 1,
        unread_count: 0.5,
        notifications: [],
      }).success,
    ).toBe(false);
  });

  it("rejeita contagens ou página maiores que o total", () => {
    expect(
      studentNotificationListSchema.safeParse({
        total: 0,
        unread_count: 1,
        notifications: [],
      }).success,
    ).toBe(false);
    expect(
      studentNotificationListSchema.safeParse({
        total: 0,
        unread_count: 0,
        notifications: [NOTIFICATION],
      }).success,
    ).toBe(false);
  });

  it("rejeita campos extras na lista", () => {
    expect(
      studentNotificationListSchema.safeParse({
        total: 1,
        unread_count: 1,
        notifications: [NOTIFICATION],
        cursor: "interno",
      }).success,
    ).toBe(false);
  });
});

describe("resultados de leitura", () => {
  it("aceita resultado individual", () => {
    expect(
      studentNotificationReadResultSchema.parse({
        id: NOTIFICATION_ID,
        read_at: TIMESTAMP,
      }),
    ).toEqual({ id: NOTIFICATION_ID, read_at: TIMESTAMP });
  });

  it("rejeita timestamp individual inválido e campo extra", () => {
    expect(
      studentNotificationReadResultSchema.safeParse({
        id: NOTIFICATION_ID,
        read_at: "agora",
      }).success,
    ).toBe(false);
    expect(
      studentNotificationReadResultSchema.safeParse({
        id: NOTIFICATION_ID,
        read_at: TIMESTAMP,
        user_id: SOURCE_ID,
      }).success,
    ).toBe(false);
  });

  it("aceita quantidade atualizada e rejeita valores inválidos", () => {
    expect(studentNotificationsReadAllResultSchema.parse({ updated: 3 })).toEqual({
      updated: 3,
    });
    expect(
      studentNotificationsReadAllResultSchema.safeParse({ updated: -1 }).success,
    ).toBe(false);
    expect(
      studentNotificationsReadAllResultSchema.safeParse({
        updated: 1,
        debug: true,
      }).success,
    ).toBe(false);
  });
});
