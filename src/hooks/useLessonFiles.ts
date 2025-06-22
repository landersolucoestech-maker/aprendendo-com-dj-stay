
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
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Erro ao buscar arquivos da aula:', error);
        throw error;
      }

      console.log('Arquivos encontrados:', data);
      return data as LessonFile | null;
    },
  });
};

export const downloadFileFromStorage = async (bucketId: string, filePath: string, fileName: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketId)
      .download(filePath);

    if (error) {
      throw error;
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

    return true;
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    throw error;
  }
};
