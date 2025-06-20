
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: any[];
}

export const useModules = () => {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      console.log('🔍 Iniciando busca de módulos...');
      
      try {
        // Primeiro, vamos buscar os módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .order('order_num', { ascending: true });

        console.log('📚 Módulos encontrados:', modulesData);
        console.log('❌ Erro módulos:', modulesError);

        if (modulesError) {
          console.error('Erro ao buscar módulos:', modulesError);
          throw modulesError;
        }

        if (!modulesData || modulesData.length === 0) {
          console.log('⚠️ Nenhum módulo encontrado no banco');
          return [];
        }

        // Agora vamos buscar as lições para cada módulo
        const modulesWithLessons = await Promise.all(
          modulesData.map(async (module) => {
            console.log(`🔍 Buscando lições para módulo: ${module.title}`);
            
            const { data: lessonsData, error: lessonsError } = await supabase
              .from('lessons')
              .select('*')
              .eq('module_id', module.id)
              .order('order_num', { ascending: true });

            console.log(`📖 Lições para ${module.title}:`, lessonsData);
            
            if (lessonsError) {
              console.error(`Erro ao buscar lições para módulo ${module.id}:`, lessonsError);
            }

            const lessons = lessonsData?.map((lesson) => ({
              id: lesson.id,
              title: lesson.title || 'Aula sem título',
              duration: '15:30', // Valor padrão
              completed: false, // Valor padrão
              videoUrl: lesson.video_url || '',
              description: lesson.content || 'Descrição não disponível',
            })) || [];

            return {
              id: module.id,
              title: module.title || 'Módulo sem título',
              description: module.description || 'Descrição não disponível',
              progress: 0, // Calcular progresso baseado nas aulas completadas
              lessons: lessons,
            };
          })
        );

        console.log('✅ Módulos finais processados:', modulesWithLessons);
        return modulesWithLessons;

      } catch (error) {
        console.error('💥 Erro geral na busca de módulos:', error);
        throw error;
      }
    },
  });
};
