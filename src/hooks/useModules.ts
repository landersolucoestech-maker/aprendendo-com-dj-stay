
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
      
      // Fazer a consulta completa com join das lessons
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

      console.log('Módulos encontrados na consulta:', data);

      // Se não há dados, retornar array vazio
      if (!data || data.length === 0) {
        console.log('Nenhum módulo encontrado na base de dados');
        return [];
      }

      // Transformar os dados para o formato esperado pelos componentes
      const modules: Module[] = data.map((module) => ({
        id: module.id,
        title: module.title || 'Módulo sem título',
        description: module.description || 'Descrição não disponível',
        progress: 0, // Por enquanto, progresso zerado - seria calculado baseado nas aulas completadas
        lessons: (module.lessons || []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title || 'Aula sem título',
          duration: '15:30', // Valor padrão - em produção viria do banco
          completed: false, // Valor padrão - seria calculado baseado no progresso do usuário
          videoUrl: lesson.video_url || '',
          description: lesson.content || 'Descrição não disponível',
        })),
      }));

      console.log('Módulos transformados:', modules);
      return modules;
    },
  });
};
