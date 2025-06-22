
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
    console.log(`Tentando baixar arquivo: ${filePath} do bucket: ${bucketId}`);
    
    // First check if the file exists
    const { data: fileExists, error: listError } = await supabase.storage
      .from(bucketId)
      .list(filePath.substring(0, filePath.lastIndexOf('/')) || '');

    if (listError) {
      console.error('Erro ao verificar existência do arquivo:', listError);
      throw new Error(`Erro ao verificar arquivo: ${listError.message}`);
    }

    const fileInList = fileExists?.find(file => 
      filePath.endsWith(file.name) || filePath.includes(file.name)
    );

    if (!fileInList) {
      console.warn('Arquivo não encontrado no storage:', filePath);
      throw new Error('Arquivo não encontrado no servidor. Entre em contato com o suporte.');
    }

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
