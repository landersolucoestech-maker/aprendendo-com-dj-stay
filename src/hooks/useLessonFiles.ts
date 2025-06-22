
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
    
    // Para teste, vamos criar arquivos diferentes baseados no bucketId
    if (bucketId === 'lesson-samples') {
      // Criar um arquivo ZIP de samples e loops
      const samplesContent = `
SAMPLES E LOOPS - AULA DE PRODUÇÃO MUSICAL

Este arquivo contém samples e loops exclusivos para esta aula:

📁 Conteúdo do Pack:
- 10 Loops de bateria em 130 BPM
- 8 Samples de baixo funk
- 6 Elementos percussivos
- 4 Samples de voz
- 2 Loops completos para referência

🎵 Formatos inclusos:
- WAV 24-bit/44.1kHz
- Loops sincronizados
- Samples one-shot

💡 Como usar:
1. Extraia os arquivos para sua pasta de samples
2. Importe no seu DAW favorito
3. Ajuste o BPM conforme necessário
4. Combine os elementos para criar sua música

Data de criação: ${new Date().toLocaleString()}
Aula: Produção de Funk com DJ Stay

© Todos os direitos reservados
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
      // Criar um arquivo de projeto Ableton Live específico
      const projectContent = `
PROJETO ABLETON LIVE - AULA DE PRODUÇÃO MUSICAL

Este é o projeto completo da aula no formato Ableton Live (.als)

🎛️ Estrutura do Projeto:
- 8 faixas de áudio configuradas
- Efeitos pré-configurados (Compressor, EQ, Reverb)
- Automações de volume e filtros
- Samples organizados por grupos
- Template pronto para produção

🔧 Configurações incluídas:
- BPM: 130
- Tonalidade: Dm
- Samples mapeados no Drum Rack
- Cadeia de efeitos otimizada
- Roteamento de sends configurado

📖 Como usar:
1. Abra o Ableton Live (versão 10 ou superior)
2. Vá em File > Open Live Set
3. Selecione este arquivo .als
4. Certifique-se de ter os samples na pasta correta
5. Pressione Play para ouvir o projeto

💾 Requisitos:
- Ableton Live 10+
- Samples da aula (baixe separadamente)
- 4GB de RAM recomendado

Data de criação: ${new Date().toLocaleString()}
Aula: Produção de Funk com DJ Stay
Projeto: Funk Moderno - Base Completa

© Todos os direitos reservados
Uso exclusivo para alunos do curso
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
