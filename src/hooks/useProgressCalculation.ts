import { useMemo } from "react";

import type { LearningModule, ModuleLesson } from "./useModules";
import { useUserProgress } from "./useUserProgress";

export interface ModuleLessonWithProgress extends ModuleLesson {
  completed: boolean;
}

export interface ModuleWithProgress extends Omit<LearningModule, "lessons"> {
  progress: number;
  lessons: ModuleLessonWithProgress[];
}

export interface ProgressCalculationResult {
  data: ModuleWithProgress[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

export const useProgressCalculation = (
  modules: LearningModule[] | undefined,
): ProgressCalculationResult => {
  const progressQuery = useUserProgress();

  const data = useMemo(() => {
    if (modules === undefined || progressQuery.data === undefined) {
      return undefined;
    }

    const progressByLesson = new Map(
      progressQuery.data.map((progress) => [progress.aula_id, progress]),
    );

    return modules.map((module) => {
      const lessons = module.lessons.map((lesson) => ({
        ...lesson,
        completed: progressByLesson.get(lesson.id)?.completada === true,
      }));
      const completedLessons = lessons.filter((lesson) => lesson.completed).length;

      return {
        ...module,
        progress: lessons.length === 0 ? 0 : Math.round((completedLessons / lessons.length) * 100),
        lessons,
      };
    });
  }, [modules, progressQuery.data]);

  return {
    data,
    isLoading: progressQuery.isLoading,
    error: progressQuery.error,
  };
};
