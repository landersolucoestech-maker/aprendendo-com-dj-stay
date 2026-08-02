import { useMemo } from "react";

import {
  calculateModulesProgress,
  type LearningModule,
  type ModuleWithProgress,
} from "@/lib/course-progress";
import { useUserProgress } from "./useUserProgress";

export type {
  ModuleLessonWithProgress,
  ModuleWithProgress,
} from "@/lib/course-progress";

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

    return calculateModulesProgress(modules, progressQuery.data);
  }, [modules, progressQuery.data]);

  return {
    data,
    isLoading: progressQuery.isLoading,
    error: progressQuery.error,
  };
};
