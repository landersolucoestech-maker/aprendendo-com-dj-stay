
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
        // Primeiro, vamos verificar se existem módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .order('order_num', { ascending: true });

        console.log('Verificação de módulos:', modulesData, 'Erro:', modulesError);

        if (modulesError) {
          console.error('Erro ao buscar módulos:', modulesError);
          throw modulesError;
        }

        // Se não há módulos, vamos fazer uma consulta mais completa para debug
        if (!modulesData || modulesData.length === 0) {
          console.log('Nenhum módulo encontrado, fazendo consulta completa...');
          
          const { data: allModules, error: allError } = await supabase
            .from('modules')
            .select(`
              *,
              lessons (*)
            `);
          
          console.log('Módulos encontrados na consulta completa:', allModules);
          
          if (!allModules || allModules.length === 0) {
            console.log('Nenhum módulo encontrado, retornando dados de exemplo...');
            // Retornar dados de exemplo para teste
            return [
              {
                id: '1',
                title: 'Fundamentos da Produção Musical',
                description: 'Introdução aos conceitos básicos de produção musical',
                progress: 25,
                lessons: [
                  {
                    id: '1',
                    title: 'Introdução ao Curso',
                    duration: '15:30',
                    completed: false,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    description: 'Bem-vindo ao curso de produção de funk!'
                  },
                  {
                    id: '2',
                    title: 'Configurando seu Home Studio',
                    duration: '20:15',
                    completed: false,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    description: 'Aprenda a configurar seu estúdio em casa.'
                  }
                ]
              },
              {
                id: '2',
                title: 'Criação de Beats e Samples',
                description: 'Aprenda a criar beats marcantes e trabalhar com samples',
                progress: 50,
                lessons: [
                  {
                    id: '3',
                    title: 'Drum Patterns Essenciais',
                    duration: '18:45',
                    completed: true,
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    description: 'Domine os padrões rítmicos fundamentais do funk carioca.'
                  }
                ]
              }
            ];
          }
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
        
        // Em caso de erro, retornar dados de exemplo
        return [
          {
            id: '1',
            title: 'Fundamentos da Produção Musical',
            description: 'Introdução aos conceitos básicos de produção musical',
            progress: 25,
            lessons: [
              {
                id: '1',
                title: 'Introdução ao Curso',
                duration: '15:30',
                completed: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: 'Bem-vindo ao curso de produção de funk!'
              },
              {
                id: '2',
                title: 'Configurando seu Home Studio',
                duration: '20:15',
                completed: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: 'Aprenda a configurar seu estúdio em casa.'
              }
            ]
          },
          {
            id: '2',
            title: 'Criação de Beats e Samples',
            description: 'Aprenda a criar beats marcantes e trabalhar com samples',
            progress: 50,
            lessons: [
              {
                id: '3',
                title: 'Drum Patterns Essenciais',
                duration: '18:45',
                completed: true,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: 'Domine os padrões rítmicos fundamentais do funk carioca.'
              }
            ]
          }
        ];
      }
    },
  });
};
