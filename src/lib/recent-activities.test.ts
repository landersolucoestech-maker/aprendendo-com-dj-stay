import { describe, expect, it } from "vitest";

import {
  DEFAULT_RECENT_ACTIVITY_LIMIT,
  MAX_RECENT_ACTIVITY_LIMIT,
  normalizeRecentActivityLimit,
  toRecentActivities,
  toRecentActivity,
  type RecentProgressRow,
} from "@/lib/recent-activities";

const PROGRESS_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const LESSON_ID = "33333333-3333-4333-8333-333333333333";
const MODULE_ID = "44444444-4444-4444-8444-444444444444";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";
const CLIENT_ID = "66666666-6666-4666-8666-666666666666";
const NOW = "2026-08-02T15:00:00.000Z";
const UPDATED_AT = "2026-08-02T14:00:00.000Z";

const BASE_PROGRESS: RecentProgressRow = {
  id: PROGRESS_ID,
  user_id: USER_ID,
  aula_id: LESSON_ID,
  completada: false,
  progresso_percentual: 0,
  tempo_assistido: 0,
  ultima_visualizacao: UPDATED_AT,
  revision: 1,
  last_event_id: EVENT_ID,
  last_event_received_at: UPDATED_AT,
  last_client_instance_id: CLIENT_ID,
  created_at: UPDATED_AT,
  updated_at: UPDATED_AT,
  aulas: {
    titulo: "Fundamentos de mixagem",
    modulo_id: MODULE_ID,
    modulos: {
      titulo: "Módulo inicial",
    },
  },
};

describe("normalizeRecentActivityLimit", () => {
  it.each([
    [1, 1],
    [1.9, 1],
    [10, 10],
    [99.9, 99],
    [100, 100],
  ])("normaliza limite finito %s para %s", (input, expected) => {
    expect(normalizeRecentActivityLimit(input)).toBe(expected);
  });

  it.each([
    [0, 1],
    [-1, 1],
    [-1000, 1],
    [100.9, MAX_RECENT_ACTIVITY_LIMIT],
    [101, MAX_RECENT_ACTIVITY_LIMIT],
    [1000, MAX_RECENT_ACTIVITY_LIMIT],
  ])("limita %s ao intervalo permitido", (input, expected) => {
    expect(normalizeRecentActivityLimit(input)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "usa o padrão para número não finito: %s",
    (input) => {
      expect(normalizeRecentActivityLimit(input)).toBe(DEFAULT_RECENT_ACTIVITY_LIMIT);
    },
  );
});

describe("toRecentActivity", () => {
  it("transforma aula iniciada com instante explícito", () => {
    expect(toRecentActivity(BASE_PROGRESS, NOW)).toEqual({
      id: PROGRESS_ID,
      activity: 'Iniciou "Fundamentos de mixagem" em Módulo inicial',
      time: "há 1 hora",
      type: "lesson_started",
      updatedAt: UPDATED_AT,
      lessonTitle: "Fundamentos de mixagem",
      moduleTitle: "Módulo inicial",
      progressPercent: 0,
      completed: false,
    });
  });

  it("transforma progresso parcial sem alterar o tipo público", () => {
    const partial = {
      ...BASE_PROGRESS,
      progresso_percentual: 42,
      tempo_assistido: 300,
    };

    expect(toRecentActivity(partial, NOW)).toMatchObject({
      activity: 'Assistiu 42% de "Fundamentos de mixagem"',
      type: "lesson_started",
      progressPercent: 42,
      completed: false,
    });
  });

  it("transforma conclusão com tipo e texto próprios", () => {
    const completed = {
      ...BASE_PROGRESS,
      completada: true,
      progresso_percentual: 100,
      tempo_assistido: 1200,
    };

    expect(toRecentActivity(completed, NOW)).toMatchObject({
      activity: 'Completou "Fundamentos de mixagem" em Módulo inicial',
      type: "lesson_completed",
      progressPercent: 100,
      completed: true,
    });
  });
});

describe("toRecentActivities", () => {
  it("preserva ordem e aplica o mesmo instante de referência", () => {
    const second = {
      ...BASE_PROGRESS,
      id: EVENT_ID,
      updated_at: "2026-08-02T13:00:00.000Z",
    };

    const result = toRecentActivities([BASE_PROGRESS, second], NOW);

    expect(result.map((activity) => activity.id)).toEqual([PROGRESS_ID, EVENT_ID]);
    expect(result.map((activity) => activity.time)).toEqual(["há 1 hora", "há 2 horas"]);
  });

  it("não altera as linhas de progresso recebidas", () => {
    const input = [structuredClone(BASE_PROGRESS)];
    const snapshot = structuredClone(input);

    toRecentActivities(input, NOW);

    expect(input).toEqual(snapshot);
  });

  it("aceita coleção vazia", () => {
    expect(toRecentActivities([], NOW)).toEqual([]);
  });
});
