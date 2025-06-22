
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

export const useProgressCalculation = (modules: any[] | undefined) => {
  const { data: userProgress } = useUserProgress();

  const modulesWithProgress = useMemo(() => {
    if (!modules) return [];

    return modules.map(module => {
      // Calcular progresso baseado nas aulas completadas
      const completedLessons = module.lessons?.filter(lesson => {
        const progress = userProgress?.find(p => p.aula_id === lesson.id);
        return progress?.completada || false;
      }) || [];
      
      const totalLessons = module.lessons?.length || 0;
      const progressPercentage = totalLessons > 0 
        ? Math.round((completedLessons.length / totalLessons) * 100)
        : 0;

      return {
        ...module,
        description: module.description || 'Descrição não disponível',
        progress: progressPercentage,
        lessons: (module.lessons || []).map(lesson => ({
          ...lesson,
          duration: lesson.duracao ? `${lesson.duracao}:00` : (lesson.duration || '15:30'),
          description: lesson.descricao || lesson.description || 'Descrição não disponível',
          videoUrl: lesson.video || lesson.video_url || lesson.videoUrl || '',
          completed: userProgress?.find(p => p.aula_id === lesson.id)?.completada || false
        }))
      };
    });
  }, [modules, userProgress]);

  return modulesWithProgress;
};
