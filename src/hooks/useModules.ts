
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Module {
  id: string;
  title: string;
  description?: string;
  progress: number;
  lessons: any[];
}

export const useModules = () => {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      console.log('Buscando módulos do Supabase...');
      
      const { data, error } = await supabase
        .from('modulos')
        .select(`
          id,
          titulo,
          ordem,
          aulas (
            id,
            titulo,
            descricao,
            video,
            ordem,
            duracao
          )
        `)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar módulos:', error);
        throw error;
      }

      console.log('Módulos encontrados:', data);

      // Transform the data to match the expected format
      const modules: Module[] = data?.map((modulo) => ({
        id: modulo.id,
        title: modulo.titulo || 'Módulo sem título',
        description: 'Descrição não disponível',
        progress: 0, // Calculate progress based on completed lessons
        lessons: modulo.aulas?.map((aula) => ({
          id: aula.id,
          title: aula.titulo || 'Aula sem título',
          duration: aula.duracao ? `${aula.duracao}:00` : '15:30',
          completed: false, // Default value
          videoUrl: aula.video || '',
          description: aula.descricao || 'Descrição não disponível',
        })) || [],
      })) || [];

      return modules;
    },
  });
};
