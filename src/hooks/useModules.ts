
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleLesson {
  id: string;
  title: string;
  titulo: string;
  descricao: string | null;
  video: string | null;
  video_url: string | null;
  duracao: number | null;
  duration: string;
  completed: boolean;
  videoUrl: string;
  description: string;
  ordem: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: ModuleLesson[];
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
          descricao,
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
        description: modulo.descricao || 'Descrição não disponível',
        progress: 0, // Will be calculated by useProgressCalculation
        lessons: modulo.aulas?.map((aula) => ({
          id: aula.id,
          title: aula.titulo || 'Aula sem título',
          titulo: aula.titulo,
          descricao: aula.descricao,
          video: aula.video,
          video_url: aula.video,
          duracao: aula.duracao,
          duration: aula.duracao ? `${aula.duracao}:00` : '15:30',
          completed: false, // Default value
          videoUrl: aula.video || '',
          description: aula.descricao || 'Descrição não disponível',
          ordem: aula.ordem
        })) || [],
      })) || [];

      return modules;
    },
  });
};
