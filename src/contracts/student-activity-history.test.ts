import { describe, expect, it } from "vitest";

import { studentActivityHistoryResponseSchema } from "@/contracts/student-activity-history";

const ROW = {
  id: "b1080000-0000-4000-8000-000000000001",
  user_id: "b1080000-0000-4000-8000-000000000002",
  aula_id: "b1080000-0000-4000-8000-000000000003",
  completada: false,
  progresso_percentual: 25,
  tempo_assistido: 120,
  ultima_visualizacao: "2026-08-03T15:00:00-03:00",
  revision: 0,
  last_event_id: null,
  last_event_received_at: null,
  last_client_instance_id: null,
  created_at: "2026-08-03T14:50:00-03:00",
  updated_at: "2026-08-03T15:00:00-03:00",
  aulas: {
    titulo: "Aula B108",
    modulo_id: "b1080000-0000-4000-8000-000000000004",
    modulos: {
      titulo: "Módulo B108",
    },
  },
} as const;

describe("studentActivityHistoryResponseSchema", () => {
  it("aceita histórico vazio coerente", () => {
    const response = { total: 0, rows: [] };
    expect(studentActivityHistoryResponseSchema.parse(response)).toEqual(response);
  });

  it("aceita página menor que o total persistido", () => {
    const response = { total: 40, rows: [ROW] };
    expect(studentActivityHistoryResponseSchema.parse(response)).toEqual(response);
  });

  it("rejeita página maior que o total persistido", () => {
    expect(
      studentActivityHistoryResponseSchema.safeParse({ total: 0, rows: [ROW] })
        .success,
    ).toBe(false);
  });

  it("rejeita total negativo ou fracionário", () => {
    expect(
      studentActivityHistoryResponseSchema.safeParse({ total: -1, rows: [] })
        .success,
    ).toBe(false);
    expect(
      studentActivityHistoryResponseSchema.safeParse({ total: 0.5, rows: [] })
        .success,
    ).toBe(false);
  });

  it("rejeita campos extras", () => {
    expect(
      studentActivityHistoryResponseSchema.safeParse({
        total: 1,
        rows: [ROW],
        cursor: "interno",
      }).success,
    ).toBe(false);
  });
});
