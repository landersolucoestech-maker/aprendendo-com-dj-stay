
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProgress {
  id: string;
  user_id: string;
  aula_id: string;
  completada: boolean;
  progresso_percentual: number;
  tempo_assistido: number;
  ultima_visualizacao: string;
}

export const useUserProgress = () => {
  return useQuery({
    queryKey: ['user-progress'],
    queryFn: async () => {
      console.log('Buscando progresso do usuário...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('progresso_aulas')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao buscar progresso:', error);
        throw error;
      }

      console.log('Progresso encontrado:', data);
      return data as UserProgress[];
    },
  });
};

export const useUpdateProgress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      aulaId, 
      completada, 
      progressoPercentual, 
      tempoAssistido 
    }: {
      aulaId: string;
      completada?: boolean;
      progressoPercentual?: number;
      tempoAssistido?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('progresso_aulas')
        .upsert({
          user_id: user.id,
          aula_id: aulaId,
          completada: completada ?? false,
          progresso_percentual: progressoPercentual ?? 0,
          tempo_assistido: tempoAssistido ?? 0,
          ultima_visualizacao: new Date().toISOString(),
        }, {
          onConflict: 'user_id,aula_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar progresso:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch progress data
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
    },
  });
};
