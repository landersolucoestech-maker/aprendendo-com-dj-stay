
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
      console.log('Iniciando busca de módulos...');
      
      // Primeiro, vamos verificar se há dados na tabela modules
      const { data: moduleCheck, error: moduleCheckError } = await supabase
        .from('modules')
        .select('*');
      
      console.log('Verificação de módulos:', moduleCheck, 'Erro:', moduleCheckError);
      
      // Agora vamos fazer a consulta completa
      const { data, error } = await supabase
        .from('modules')
        .select(`
          id,
          title,
          description,
          order_num,
          lessons (
            id,
            title,
            content,
            video_url,
            order_num
          )
        `)
        .order('order_num', { ascending: true });

      if (error) {
        console.error('Erro ao buscar módulos:', error);
        throw error;
      }

      console.log('Módulos encontrados na consulta completa:', data);

      // Se não há dados, vamos retornar dados de exemplo para testar
      if (!data || data.length === 0) {
        console.log('Nenhum módulo encontrado, retornando dados de exemplo...');
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
                description: 'Bem-vindo ao curso de produção de funk!',
              },
              {
                id: '2',
                title: 'Configurando seu Home Studio',
                duration: '20:15',
                completed: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: 'Aprenda a configurar seu estúdio em casa.',
              },
            ],
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
                description: 'Domine os padrões rítmicos fundamentais do funk carioca.',
              },
            ],
          },
        ];
      }

      // Transformar os dados para o formato esperado pelos componentes
      const modules: Module[] = data?.map((module) => ({
        id: module.id,
        title: module.title || 'Módulo sem título',
        description: module.description || 'Descrição não disponível',
        progress: 0, // Calcular progresso baseado nas aulas completadas
        lessons: module.lessons?.map((lesson) => ({
          id: lesson.id,
          title: lesson.title || 'Aula sem título',
          duration: '15:30', // Valor padrão
          completed: false, // Valor padrão
          videoUrl: lesson.video_url || '',
          description: lesson.content || 'Descrição não disponível',
        })) || [],
      })) || [];

      console.log('Módulos transformados:', modules);
      return modules;
    },
  });
};
