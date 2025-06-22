
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonFile {
  id: string;
  aula_id: string;
  samples_file_path: string | null;
  project_file_path: string | null;
  created_at: string;
  updated_at: string;
}

export const useLessonFiles = (aulaId: string) => {
  return useQuery({
    queryKey: ['lesson-files', aulaId],
    queryFn: async () => {
      console.log('Buscando arquivos da aula:', aulaId);
      
      const { data, error } = await supabase
        .from('lesson_files')
        .select('*')
        .eq('aula_id', aulaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar arquivos da aula:', error);
        throw new Error(`Erro ao buscar arquivos: ${error.message}`);
      }

      console.log('Arquivos encontrados:', data);
      return data as LessonFile | null;
    },
    enabled: !!aulaId,
  });
};

export const downloadFileFromStorage = async (bucketId: string, filePath: string, fileName: string) => {
  try {
    console.log(`Iniciando download: ${fileName} de ${bucketId}/${filePath}`);
    
    // Para teste, vamos criar arquivos diferentes baseados no tipo
    if (bucketId === 'lesson-samples') {
      // Criar um arquivo ZIP de samples
      const samplesContent = `
Samples e Loops - Aula de Produção Musical

Este é um arquivo de teste contendo samples e loops para a aula.
Em produção, este seria um arquivo ZIP real com:
- Loops de bateria
- Samples de sintetizadores
- Elementos percussivos
- Outros elementos musicais

Data: ${new Date().toLocaleString()}
`;
      
      const blob = new Blob([samplesContent], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Download de samples concluído: ${fileName}`);
      return true;
    }

    if (bucketId === 'lesson-projects') {
      // Criar um arquivo de projeto Ableton Live
      const projectContent = `
Projeto Ableton Live - Aula de Produção Musical

Este é um arquivo de teste do projeto da aula.
Em produção, este seria um arquivo .als real do Ableton Live com:
- Todas as faixas da música
- Efeitos aplicados
- Automações
- Configurações do projeto

Para usar:
1. Abra o Ableton Live
2. Vá em File > Open Live Set
3. Selecione este arquivo

Data: ${new Date().toLocaleString()}
`;
      
      const blob = new Blob([projectContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Download de projeto concluído: ${fileName}`);
      return true;
    }

    // Se chegou até aqui, é um download real do Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketId)
      .download(filePath);

    if (error) {
      console.error('Erro no download do storage:', error);
      throw new Error(`Erro no download: ${error.message}`);
    }

    if (!data) {
      throw new Error('Nenhum dado retornado do storage');
    }

    // Create blob URL and trigger download
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Download concluído: ${fileName}`);
    return true;
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    throw error;
  }
};
