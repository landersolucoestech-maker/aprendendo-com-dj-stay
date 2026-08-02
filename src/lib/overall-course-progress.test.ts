import { describe, expect, it } from "vitest";

import {
  calculateOverallCourseProgress,
  type ModuleLessonWithProgress,
  type ModuleWithProgress,
} from "@/lib/course-progress";

const lesson = (
  id: string,
  completed: boolean,
): ModuleLessonWithProgress => ({
  id,
  title: `Aula ${id}`,
  description: null,
  durationMinutes: 10,
  durationLabel: "10 min",
  order: 1,
  completed,
});

const moduleWithLessons = (
  id: string,
  progress: number,
  lessons: ModuleLessonWithProgress[],
): ModuleWithProgress => ({
  id,
  title: `Módulo ${id}`,
  description: null,
  order: 1,
  progress,
  lessons,
});

describe("calculateOverallCourseProgress", () => {
  it("mantém currículo sem módulos em zero por cento", () => {
    expect(calculateOverallCourseProgress([])).toBe(0);
  });

  it("ignora módulos vazios no denominador", () => {
    expect(
      calculateOverallCourseProgress([
        moduleWithLessons("vazio-1", 100, []),
        moduleWithLessons("vazio-2", 50, []),
      ]),
    ).toBe(0);
  });

  it("pondera módulos pela quantidade real de aulas", () => {
    const smallModule = moduleWithLessons("pequeno", 100, [
      lesson("concluida", true),
    ]);
    const largeModule = moduleWithLessons(
      "grande",
      0,
      Array.from({ length: 9 }, (_, index) =>
        lesson(`pendente-${index + 1}`, false),
      ),
    );

    expect(calculateOverallCourseProgress([smallModule, largeModule])).toBe(10);
  });

  it("não usa o percentual agregado do módulo como fonte", () => {
    const contradictoryIncomplete = moduleWithLessons("incompleto", 100, [
      lesson("a", false),
    ]);
    const contradictoryComplete = moduleWithLessons("completo", 0, [
      lesson("b", true),
    ]);

    expect(calculateOverallCourseProgress([contradictoryIncomplete])).toBe(0);
    expect(calculateOverallCourseProgress([contradictoryComplete])).toBe(100);
  });

  it("arredonda um terço para trinta e três por cento", () => {
    expect(
      calculateOverallCourseProgress([
        moduleWithLessons("um-terco", 33, [
          lesson("a", true),
          lesson("b", false),
          lesson("c", false),
        ]),
      ]),
    ).toBe(33);
  });

  it("arredonda dois terços para sessenta e sete por cento", () => {
    expect(
      calculateOverallCourseProgress([
        moduleWithLessons("dois-tercos", 67, [
          lesson("a", true),
          lesson("b", true),
          lesson("c", false),
        ]),
      ]),
    ).toBe(67);
  });

  it("retorna cem por cento quando todas as aulas estão concluídas", () => {
    expect(
      calculateOverallCourseProgress([
        moduleWithLessons("primeiro", 100, [lesson("a", true)]),
        moduleWithLessons("segundo", 100, [
          lesson("b", true),
          lesson("c", true),
        ]),
      ]),
    ).toBe(100);
  });

  it("preserva módulos e aulas recebidos", () => {
    const modules = [
      moduleWithLessons("imutavel", 999, [
        lesson("a", true),
        lesson("b", false),
      ]),
    ];
    const snapshot = structuredClone(modules);

    calculateOverallCourseProgress(modules);

    expect(modules).toEqual(snapshot);
  });
});
