import { describe, expect, it } from "vitest";

import {
  calculateModulesProgress,
  type LearningModule,
  type LessonCompletionProgress,
} from "@/lib/course-progress";

const MODULE_A_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_B_ID = "22222222-2222-4222-8222-222222222222";
const LESSON_A_ID = "33333333-3333-4333-8333-333333333333";
const LESSON_B_ID = "44444444-4444-4444-8444-444444444444";
const LESSON_C_ID = "55555555-5555-4555-8555-555555555555";
const ORPHAN_LESSON_ID = "66666666-6666-4666-8666-666666666666";

const MODULE_A: LearningModule = {
  id: MODULE_A_ID,
  title: "Módulo inicial",
  description: "Fundamentos do curso",
  order: 1,
  lessons: [
    {
      id: LESSON_A_ID,
      title: "Aula A",
      description: "Primeira aula",
      durationMinutes: 10,
      durationLabel: "10 min",
      order: 1,
    },
    {
      id: LESSON_B_ID,
      title: "Aula B",
      description: null,
      durationMinutes: null,
      durationLabel: null,
      order: 2,
    },
    {
      id: LESSON_C_ID,
      title: "Aula C",
      description: "Terceira aula",
      durationMinutes: 30,
      durationLabel: "30 min",
      order: 3,
    },
  ],
};

const MODULE_B: LearningModule = {
  id: MODULE_B_ID,
  title: "Módulo vazio",
  description: null,
  order: 2,
  lessons: [],
};

const MODULES: LearningModule[] = [MODULE_A, MODULE_B];

const progress = (
  aulaId: string,
  completada: boolean,
): LessonCompletionProgress => ({
  aula_id: aulaId,
  completada,
});

describe("calculateModulesProgress", () => {
  it("mantém módulos sem aulas em zero por cento", () => {
    const result = calculateModulesProgress([MODULE_B], []);

    expect(result).toEqual([
      {
        ...MODULE_B,
        progress: 0,
        lessons: [],
      },
    ]);
  });

  it("mantém todas as aulas incompletas sem progresso confirmado", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(LESSON_A_ID, false),
      progress(LESSON_B_ID, false),
    ]);

    expect(module?.progress).toBe(0);
    expect(module?.lessons.map((lesson) => lesson.completed)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("arredonda a conclusão parcial do módulo", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(LESSON_A_ID, true),
    ]);

    expect(module?.progress).toBe(33);
    expect(module?.lessons.map((lesson) => lesson.completed)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("arredonda dois terços para sessenta e sete por cento", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(LESSON_A_ID, true),
      progress(LESSON_C_ID, true),
    ]);

    expect(module?.progress).toBe(67);
  });

  it("marca conclusão total em cem por cento", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(LESSON_A_ID, true),
      progress(LESSON_B_ID, true),
      progress(LESSON_C_ID, true),
    ]);

    expect(module?.progress).toBe(100);
    expect(module?.lessons.every((lesson) => lesson.completed)).toBe(true);
  });

  it("não deixa linhas duplicadas inflarem o percentual", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(LESSON_A_ID, true),
      progress(LESSON_A_ID, true),
      progress(LESSON_A_ID, true),
    ]);

    expect(module?.progress).toBe(33);
    expect(module?.lessons.filter((lesson) => lesson.completed)).toHaveLength(1);
  });

  it("considera a aula concluída quando existe ao menos uma linha verdadeira", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(LESSON_A_ID, false),
      progress(LESSON_A_ID, true),
      progress(LESSON_A_ID, false),
    ]);

    expect(module?.lessons[0]?.completed).toBe(true);
    expect(module?.progress).toBe(33);
  });

  it("ignora progresso de aulas inexistentes no currículo", () => {
    const [module] = calculateModulesProgress([MODULE_A], [
      progress(ORPHAN_LESSON_ID, true),
    ]);

    expect(module?.progress).toBe(0);
    expect(module?.lessons.some((lesson) => lesson.completed)).toBe(false);
  });

  it("preserva ordem e propriedades de módulos e aulas", () => {
    const result = calculateModulesProgress(MODULES, [progress(LESSON_B_ID, true)]);

    expect(result.map((module) => module.id)).toEqual([MODULE_A_ID, MODULE_B_ID]);
    expect(result[0]?.lessons.map((lesson) => lesson.id)).toEqual([
      LESSON_A_ID,
      LESSON_B_ID,
      LESSON_C_ID,
    ]);
    expect(result[0]?.lessons[1]).toMatchObject({
      title: "Aula B",
      description: null,
      durationMinutes: null,
      durationLabel: null,
      order: 2,
      completed: true,
    });
  });

  it("não altera módulos, aulas ou linhas de progresso recebidos", () => {
    const modules = structuredClone(MODULES);
    const progressRows = [
      progress(LESSON_A_ID, true),
      progress(ORPHAN_LESSON_ID, true),
    ];
    const modulesSnapshot = structuredClone(modules);
    const progressSnapshot = structuredClone(progressRows);

    calculateModulesProgress(modules, progressRows);

    expect(modules).toEqual(modulesSnapshot);
    expect(progressRows).toEqual(progressSnapshot);
  });

  it("aceita coleção vazia de módulos", () => {
    expect(calculateModulesProgress([], [progress(LESSON_A_ID, true)])).toEqual([]);
  });
});
