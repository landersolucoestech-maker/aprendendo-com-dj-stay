
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  video_url?: string;
  order_num?: number;
  module_id?: string;
  duration?: string;
  completed?: boolean;
  description?: string;
}

export const useLessons = () => {
  return useQuery({
    queryKey: ['lessons'],
    queryFn: async () => {
      console.log('Buscando aulas do Supabase...');
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          content,
          video_url,
          order_num,
          module_id,
          modules!inner(
            title,
            description,
            duration
          )
        `)
        .order('order_num', { ascending: true });

      if (error) {
        console.error('Erro ao buscar aulas:', error);
        throw error;
      }

      console.log('Aulas encontradas:', data);

      // Transformar os dados para o formato esperado pelos componentes
      const lessons: Lesson[] = data?.map((lesson) => ({
        id: lesson.id,
        title: lesson.title || 'Sem título',
        content: lesson.content,
        video_url: lesson.video_url,
        order_num: lesson.order_num,
        module_id: lesson.module_id,
        duration: '15:30', // Valor padrão por enquanto
        completed: false, // Valor padrão por enquanto
        description: lesson.content || 'Descrição não disponível',
        videoUrl: lesson.video_url || '', // Para compatibilidade com o componente existente
      })) || [];

      return lessons;
    },
  });
};
