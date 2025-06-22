
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
        .from('aulas')
        .select(`
          id,
          titulo,
          descricao,
          video,
          ordem,
          modulo_id,
          duracao
        `)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar aulas:', error);
        throw error;
      }

      console.log('Aulas encontradas:', data);

      // Transform the data to match the expected format
      const lessons: Lesson[] = data?.map((aula) => ({
        id: aula.id,
        title: aula.titulo || 'Sem título',
        content: aula.descricao,
        video_url: aula.video,
        order_num: aula.ordem,
        module_id: aula.modulo_id,
        duration: aula.duracao ? `${aula.duracao}:00` : '15:30', // Convert minutes to MM:SS format
        completed: false, // Default value
        description: aula.descricao || 'Descrição não disponível',
      })) || [];

      return lessons;
    },
  });
};
