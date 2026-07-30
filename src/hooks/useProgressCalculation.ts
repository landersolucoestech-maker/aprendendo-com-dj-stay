import { useMemo } from "react";

import type { Module } from "./useModules";
import { useUserProgress } from "./useUserProgress";

export const useProgressCalculation = (modules: Module[] | undefined): Module[] => {
  const { data: userProgress } = useUserProgress();

  return useMemo(() => {
    if (!modules) {
      return [];
    }

    const progressByLesson = new Map(
      (userProgress ?? []).map((progress) => [progress.aula_id, progress]),
    );

    return modules.map((module) => {
      const lessons = module.lessons.map((lesson) => {
        const progress = progressByLesson.get(lesson.id);

        return {
          ...lesson,
          duration: lesson.duracao
            ? `${lesson.duracao}:00`
            : lesson.duration || "15:30",
          description:
            lesson.descricao || lesson.description || "Descrição não disponível",
          videoUrl: lesson.video || lesson.video_url || lesson.videoUrl || "",
          completed: progress?.completada ?? false,
        };
      });

      const completedLessons = lessons.filter((lesson) => lesson.completed).length;
      const progress = lessons.length > 0
        ? Math.round((completedLessons / lessons.length) * 100)
        : 0;

      return {
        ...module,
        description: module.description || "Descrição não disponível",
        progress,
        lessons,
      };
    });
  }, [modules, userProgress]);
};
