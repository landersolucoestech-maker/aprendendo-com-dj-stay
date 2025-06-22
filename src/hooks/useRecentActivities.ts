
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentActivity {
  activity: string;
  time: string;
  type: 'lesson_completed' | 'lesson_started' | 'module_progress';
}

export const useRecentActivities = () => {
  return useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      console.log('Buscando atividades recentes...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar progresso recente do usuário com informações das aulas
      const { data: progressData, error } = await supabase
        .from('progresso_aulas')
        .select(`
          *,
          aulas (
            titulo,
            modulo_id,
            modulos (
              titulo
            )
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar atividades recentes:', error);
        throw error;
      }

      console.log('Dados de progresso encontrados:', progressData);

      // Transformar os dados em atividades recentes
      const activities: RecentActivity[] = progressData?.map((progress) => {
        const lessonTitle = progress.aulas?.titulo || 'Aula sem título';
        const moduleTitle = progress.aulas?.modulos?.titulo || 'Módulo';
        
        // Calcular tempo relativo
        const updatedAt = new Date(progress.updated_at);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);
        
        let timeText = '';
        if (diffInHours < 1) {
          timeText = 'Há alguns minutos';
        } else if (diffInHours < 24) {
          timeText = `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;
        } else {
          timeText = `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
        }

        // Determinar tipo de atividade
        let activityText = '';
        let type: RecentActivity['type'] = 'lesson_started';

        if (progress.completada) {
          activityText = `Completou "${lessonTitle}" em ${moduleTitle}`;
          type = 'lesson_completed';
        } else if (progress.progresso_percentual > 0) {
          activityText = `Assistiu ${progress.progresso_percentual}% de "${lessonTitle}"`;
          type = 'lesson_started';
        } else {
          activityText = `Iniciou "${lessonTitle}" em ${moduleTitle}`;
          type = 'lesson_started';
        }

        return {
          activity: activityText,
          time: timeText,
          type
        };
      }) || [];

      console.log('Atividades processadas:', activities);
      return activities;
    },
  });
};
