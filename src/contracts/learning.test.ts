import { describe, expect, it } from "vitest";

import {
  lessonProgressEventInputSchema,
  lessonProgressEventSchema,
  lessonProgressEventsSchema,
  lessonProgressStreamSchema,
  lessonProgressStreamsSchema,
  lessonRowSchema,
  lessonsResponseSchema,
  modulesResponseSchema,
  progressResponseSchema,
  progressRowSchema,
  recentProgressResponseSchema,
} from "@/contracts/learning";

const LESSON_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const PROGRESS_ID = "44444444-4444-4444-8444-444444444444";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";
const CLIENT_ID = "66666666-6666-4666-8666-666666666666";
const SESSION_ID = "77777777-7777-4777-8777-777777777777";
const TIMESTAMP = "2026-08-02T09:00:00.000Z";
const LATER_TIMESTAMP = "2026-08-02T09:01:00.000Z";

const MANUAL_LESSON = {
  id: LESSON_ID,
  modulo_id: MODULE_ID,
  titulo: "Introdução ao projeto",
  descricao: "Visão geral do fluxo de trabalho.",
  ordem: 0,
  duracao: 10,
  completion_mode: "manual",
  completion_percent: null,
  content_kind: "mixed",
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

const MEDIA_LESSON = {
  ...MANUAL_LESSON,
  completion_mode: "media_progress",
  completion_percent: 90,
  content_kind: "video",
} as const;

const INITIAL_PROGRESS = {
  id: PROGRESS_ID,
  user_id: USER_ID,
  aula_id: LESSON_ID,
  completada: false,
  progresso_percentual: 0,
  tempo_assistido: 0,
  ultima_visualizacao: TIMESTAMP,
  revision: 0,
  last_event_id: null,
  last_event_received_at: null,
  last_client_instance_id: null,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
} as const;

const ACTIVE_PROGRESS = {
  ...INITIAL_PROGRESS,
  progresso_percentual: 50,
  tempo_assistido: 300,
  ultima_visualizacao: LATER_TIMESTAMP,
  revision: 1,
  last_event_id: EVENT_ID,
  last_event_received_at: LATER_TIMESTAMP,
  last_client_instance_id: CLIENT_ID,
  updated_at: LATER_TIMESTAMP,
} as const;

const EVENT_INPUT = {
  lessonId: LESSON_ID,
  eventId: EVENT_ID,
  clientInstanceId: CLIENT_ID,
  eventSequence: 1,
  eventType: "heartbeat",
  positionSeconds: 300,
  durationSeconds: 600,
  observedAt: TIMESTAMP,
} as const;

const STREAM = {
  user_id: USER_ID,
  aula_id: LESSON_ID,
  client_instance_id: CLIENT_ID,
  auth_session_id: SESSION_ID,
  last_event_sequence: 1,
  last_event_id: EVENT_ID,
  last_position_seconds: 300,
  created_at: TIMESTAMP,
  updated_at: LATER_TIMESTAMP,
} as const;

const ACCEPTED_EVENT = {
  id: EVENT_ID,
  user_id: USER_ID,
  aula_id: LESSON_ID,
  client_instance_id: CLIENT_ID,
  auth_session_id: SESSION_ID,
  event_sequence: 1,
  event_type: "heartbeat",
  position_seconds: 300,
  duration_seconds: 600,
  calculated_progress_percent: 50,
  resulting_completed: false,
  accepted: true,
  ignored_reason: null,
  resulting_revision: 1,
  observed_at: TIMESTAMP,
  received_at: LATER_TIMESTAMP,
} as const;

describe("lessonRowSchema", () => {
  it("aceita os quatro modos de conclusão coerentes", () => {
    expect(lessonRowSchema.parse(MANUAL_LESSON)).toEqual(MANUAL_LESSON);
    expect(lessonRowSchema.parse(MEDIA_LESSON)).toEqual(MEDIA_LESSON);

    for (const completion_mode of [
      "reading_acknowledgement",
      "any_activity",
    ] as const) {
      expect(
        lessonRowSchema.safeParse({
          ...MANUAL_LESSON,
          completion_mode,
        }).success,
      ).toBe(true);
    }
  });

  it("rejeita media_progress sem percentual", () => {
    expect(
      lessonRowSchema.safeParse({
        ...MANUAL_LESSON,
        completion_mode: "media_progress",
      }).success,
    ).toBe(false);
  });

  it("rejeita percentual residual nos demais modos", () => {
    for (const completion_mode of [
      "manual",
      "reading_acknowledgement",
      "any_activity",
    ] as const) {
      expect(
        lessonRowSchema.safeParse({
          ...MANUAL_LESSON,
          completion_mode,
          completion_percent: 90,
        }).success,
      ).toBe(false);
    }
  });

  it("rejeita percentual, duração, ordem e título fora dos limites", () => {
    expect(
      lessonRowSchema.safeParse({
        ...MEDIA_LESSON,
        completion_percent: 0,
      }).success,
    ).toBe(false);
    expect(
      lessonRowSchema.safeParse({ ...MANUAL_LESSON, duracao: 1441 }).success,
    ).toBe(false);
    expect(
      lessonRowSchema.safeParse({ ...MANUAL_LESSON, ordem: -1 }).success,
    ).toBe(false);
    expect(
      lessonRowSchema.safeParse({ ...MANUAL_LESSON, titulo: "   " }).success,
    ).toBe(false);
  });

  it("rejeita UUID, timestamp e campos extras inválidos", () => {
    expect(
      lessonRowSchema.safeParse({ ...MANUAL_LESSON, id: "aula" }).success,
    ).toBe(false);
    expect(
      lessonRowSchema.safeParse({
        ...MANUAL_LESSON,
        created_at: "2026-08-02",
      }).success,
    ).toBe(false);
    expect(
      lessonRowSchema.safeParse({ ...MANUAL_LESSON, hidden: true }).success,
    ).toBe(false);
  });
});

describe("lesson and module response schemas", () => {
  const lessonResponse = {
    id: LESSON_ID,
    modulo_id: MODULE_ID,
    titulo: "Introdução ao projeto",
    descricao: null,
    ordem: 0,
    duracao: 10,
    completion_mode: "media_progress",
    completion_percent: 90,
    content_kind: "video",
  } as const;

  it("aceita listagem de aulas com contrato de conclusão", () => {
    expect(lessonsResponseSchema.parse([lessonResponse])).toEqual([
      lessonResponse,
    ]);
    expect(
      lessonsResponseSchema.safeParse([
        { ...lessonResponse, completion_percent: null },
      ]).success,
    ).toBe(false);
  });

  it("aceita módulos e aulas aninhadas estritos", () => {
    const modules = [
      {
        id: MODULE_ID,
        titulo: "Fundamentos",
        descricao: null,
        ordem: 0,
        aulas: [
          {
            id: LESSON_ID,
            titulo: "Introdução ao projeto",
            descricao: null,
            ordem: 0,
            duracao: 10,
          },
        ],
      },
    ];
    expect(modulesResponseSchema.parse(modules)).toEqual(modules);
  });

  it("rejeita campos extras nos recortes e níveis aninhados", () => {
    expect(
      lessonsResponseSchema.safeParse([
        { ...lessonResponse, created_at: TIMESTAMP },
      ]).success,
    ).toBe(false);
    expect(
      modulesResponseSchema.safeParse([
        {
          id: MODULE_ID,
          titulo: "Fundamentos",
          descricao: null,
          ordem: 0,
          aulas: [
            {
              id: LESSON_ID,
              titulo: "Introdução",
              descricao: null,
              ordem: 0,
              duracao: 10,
              modulo_id: MODULE_ID,
            },
          ],
        },
      ]).success,
    ).toBe(false);
  });
});

describe("progressRowSchema", () => {
  it("aceita agregado inicial e agregado com último evento", () => {
    expect(progressRowSchema.parse(INITIAL_PROGRESS)).toEqual(INITIAL_PROGRESS);
    expect(progressRowSchema.parse(ACTIVE_PROGRESS)).toEqual(ACTIVE_PROGRESS);
    expect(progressResponseSchema.parse([ACTIVE_PROGRESS])).toEqual([
      ACTIVE_PROGRESS,
    ]);
  });

  it("aceita progresso concluído somente em 100%", () => {
    const completed = {
      ...ACTIVE_PROGRESS,
      completada: true,
      progresso_percentual: 100,
    } as const;
    expect(progressRowSchema.parse(completed)).toEqual(completed);
    expect(
      progressRowSchema.safeParse({
        ...completed,
        progresso_percentual: 99,
      }).success,
    ).toBe(false);
  });

  it("rejeita revisão zero com dados de evento", () => {
    expect(
      progressRowSchema.safeParse({
        ...INITIAL_PROGRESS,
        last_event_id: EVENT_ID,
      }).success,
    ).toBe(false);
  });

  it("rejeita revisão positiva com quarteto parcial", () => {
    expect(
      progressRowSchema.safeParse({
        ...ACTIVE_PROGRESS,
        last_event_received_at: null,
      }).success,
    ).toBe(false);
    expect(
      progressRowSchema.safeParse({
        ...ACTIVE_PROGRESS,
        last_client_instance_id: null,
      }).success,
    ).toBe(false);
  });

  it("rejeita percentuais, tempo, revisão e campos extras inválidos", () => {
    expect(
      progressRowSchema.safeParse({
        ...INITIAL_PROGRESS,
        progresso_percentual: 101,
      }).success,
    ).toBe(false);
    expect(
      progressRowSchema.safeParse({
        ...INITIAL_PROGRESS,
        tempo_assistido: -1,
      }).success,
    ).toBe(false);
    expect(
      progressRowSchema.safeParse({
        ...INITIAL_PROGRESS,
        revision: -1,
      }).success,
    ).toBe(false);
    expect(
      progressRowSchema.safeParse({ ...INITIAL_PROGRESS, internal: true }).success,
    ).toBe(false);
  });

  it("preserva a coerência no recorte de atividades recentes", () => {
    const recent = {
      ...ACTIVE_PROGRESS,
      aulas: {
        titulo: "Introdução ao projeto",
        modulo_id: MODULE_ID,
        modulos: { titulo: "Fundamentos" },
      },
    } as const;
    expect(recentProgressResponseSchema.parse([recent])).toEqual([recent]);
    expect(
      recentProgressResponseSchema.safeParse([
        {
          ...recent,
          revision: 0,
        },
      ]).success,
    ).toBe(false);
  });
});

describe("lessonProgressEventInputSchema", () => {
  it("aceita posição dentro da duração e tolerância de 30 segundos", () => {
    expect(lessonProgressEventInputSchema.parse(EVENT_INPUT)).toEqual(EVENT_INPUT);
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        positionSeconds: 630,
      }).success,
    ).toBe(true);
  });

  it("rejeita posição acima da tolerância", () => {
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        positionSeconds: 631,
      }).success,
    ).toBe(false);
  });

  it("rejeita sequência, posição, duração e timestamp inválidos", () => {
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        eventSequence: 0,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        positionSeconds: 604_801,
        durationSeconds: 604_800,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        durationSeconds: 0,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        observedAt: "2026-08-02",
      }).success,
    ).toBe(false);
  });

  it("rejeita tipo, UUID e campos extras inválidos", () => {
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        eventType: "play",
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        eventId: "evento",
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventInputSchema.safeParse({
        ...EVENT_INPUT,
        hidden: true,
      }).success,
    ).toBe(false);
  });
});

describe("lessonProgressStreamSchema", () => {
  it("aceita stream ordenado e coleção de streams", () => {
    expect(lessonProgressStreamSchema.parse(STREAM)).toEqual(STREAM);
    expect(lessonProgressStreamsSchema.parse([STREAM])).toEqual([STREAM]);
  });

  it("rejeita sequência, posição, sessão e campos extras inválidos", () => {
    expect(
      lessonProgressStreamSchema.safeParse({
        ...STREAM,
        last_event_sequence: 0,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressStreamSchema.safeParse({
        ...STREAM,
        last_position_seconds: -1,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressStreamSchema.safeParse({
        ...STREAM,
        auth_session_id: "sessao",
      }).success,
    ).toBe(false);
    expect(
      lessonProgressStreamSchema.safeParse({ ...STREAM, internal: true }).success,
    ).toBe(false);
  });
});

describe("lessonProgressEventSchema", () => {
  it("aceita evento processado e coleção de eventos", () => {
    expect(lessonProgressEventSchema.parse(ACCEPTED_EVENT)).toEqual(
      ACCEPTED_EVENT,
    );
    expect(lessonProgressEventsSchema.parse([ACCEPTED_EVENT])).toEqual([
      ACCEPTED_EVENT,
    ]);
  });

  it("aceita evento descartado com motivo", () => {
    const ignored = {
      ...ACCEPTED_EVENT,
      event_sequence: 2,
      accepted: false,
      ignored_reason: "STALE_SEQUENCE",
      resulting_revision: 1,
    } as const;
    expect(lessonProgressEventSchema.parse(ignored)).toEqual(ignored);
  });

  it("aceita duração nula no registro persistido", () => {
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        duration_seconds: null,
      }).success,
    ).toBe(true);
  });

  it("rejeita accepted com motivo e rejected sem motivo", () => {
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        ignored_reason: "STALE_SEQUENCE",
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        accepted: false,
      }).success,
    ).toBe(false);
  });

  it("rejeita motivo fora dos limites", () => {
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        accepted: false,
        ignored_reason: "",
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        accepted: false,
        ignored_reason: "x".repeat(101),
      }).success,
    ).toBe(false);
  });

  it("rejeita posição persistida acima da duração e tolerância", () => {
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        position_seconds: 631,
      }).success,
    ).toBe(false);
  });

  it("rejeita progresso, revisão, sequência e campos extras inválidos", () => {
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        calculated_progress_percent: 101,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        resulting_revision: -1,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        event_sequence: 0,
      }).success,
    ).toBe(false);
    expect(
      lessonProgressEventSchema.safeParse({
        ...ACCEPTED_EVENT,
        internal: true,
      }).success,
    ).toBe(false);
  });
});
