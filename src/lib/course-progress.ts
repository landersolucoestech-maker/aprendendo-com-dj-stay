export interface ModuleLesson {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly durationMinutes: number | null;
  readonly durationLabel: string | null;
  readonly order: number;
}

export interface LearningModule {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly order: number;
  readonly lessons: readonly ModuleLesson[];
}

export interface ModuleLessonWithProgress extends ModuleLesson {
  readonly completed: boolean;
}

export interface ModuleWithProgress extends Omit<LearningModule, "lessons"> {
  readonly progress: number;
  readonly lessons: ModuleLessonWithProgress[];
}

export interface LessonCompletionProgress {
  readonly aula_id: string;
  readonly completada: boolean;
}

export const calculateModulesProgress = (
  modules: readonly LearningModule[],
  progressRows: readonly LessonCompletionProgress[],
): ModuleWithProgress[] => {
  const completedLessonIds = new Set(
    progressRows
      .filter((progress) => progress.completada)
      .map((progress) => progress.aula_id),
  );

  return modules.map((module) => {
    const lessons = module.lessons.map((lesson) => ({
      ...lesson,
      completed: completedLessonIds.has(lesson.id),
    }));
    const completedLessons = lessons.reduce(
      (total, lesson) => total + (lesson.completed ? 1 : 0),
      0,
    );

    return {
      ...module,
      progress:
        lessons.length === 0
          ? 0
          : Math.round((completedLessons / lessons.length) * 100),
      lessons,
    };
  });
};
