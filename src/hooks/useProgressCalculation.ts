
import { useMemo } from 'react';
import { useUserProgress } from './useUserProgress';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed?: boolean;
  video_url?: string;
  videoUrl?: string;
  description: string;
  content?: string;
  order_num?: number;
  module_id?: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
}

export const useProgressCalculation = (modules: Module[] | undefined) => {
  const { data: userProgress } = useUserProgress();

  const modulesWithProgress = useMemo(() => {
    if (!modules) return [];

    return modules.map(module => {
      // Calcular progresso baseado nas aulas completadas
      const completedLessons = module.lessons.filter(lesson => {
        const progress = userProgress?.find(p => p.aula_id === lesson.id);
        return progress?.completada || false;
      });
      
      const progressPercentage = module.lessons.length > 0 
        ? Math.round((completedLessons.length / module.lessons.length) * 100)
        : 0;

      return {
        ...module,
        description: module.description || 'Descrição não disponível',
        progress: progressPercentage,
        lessons: module.lessons.map(lesson => ({
          ...lesson,
          duration: lesson.duration || '0:00',
          description: lesson.description || 'Descrição não disponível',
          completed: userProgress?.find(p => p.aula_id === lesson.id)?.completada || false
        }))
      };
    });
  }, [modules, userProgress]);

  return modulesWithProgress;
};
