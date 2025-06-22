
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileAudio, FileCode } from "lucide-react";
import { useLessonFiles, downloadFileFromStorage } from "@/hooks/useLessonFiles";
import { useToast } from "@/hooks/use-toast";

/**
 * Exemplo de como usar o sistema de download de arquivos das aulas
 * 
 * Este componente demonstra:
 * 1. Como buscar os arquivos de uma aula usando o hook useLessonFiles
 * 2. Como fazer download dos samples/loops
 * 3. Como fazer download do projeto Ableton Live
 * 4. Como tratar erros e mostrar feedback ao usuário
 */

const LessonFilesExample = () => {
  const { toast } = useToast();
  
  // ID de exemplo de uma aula (substitua por um ID real do seu banco)
  const exampleLessonId = "1c136523-3b58-4cc3-ba5b-aa03f4a4e081";
  
  // Hook que busca os arquivos da aula no banco de dados
  const { data: lessonFiles, isLoading, error } = useLessonFiles(exampleLessonId);

  /**
   * Função para fazer download dos samples e loops
   */
  const handleDownloadSamples = async () => {
    // Verifica se existe o caminho do arquivo de samples
    if (!lessonFiles?.samples_file_path) {
      toast({
        title: "Arquivo não disponível",
        description: "Os samples e loops desta aula ainda não foram disponibilizados.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Define o nome do arquivo para download
      const fileName = `samples-loops-aula-exemplo.zip`;
      
      // Chama a função de download passando:
      // - bucket: 'lesson-samples' (definido na migração SQL)
      // - filePath: caminho do arquivo no storage
      // - fileName: nome que o arquivo terá quando baixado
      await downloadFileFromStorage('lesson-samples', lessonFiles.samples_file_path, fileName);
      
      toast({
        title: "Download iniciado!",
        description: "Os samples e loops da aula estão sendo baixados.",
      });
    } catch (error) {
      console.error('Erro ao baixar samples:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar os samples. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  /**
   * Função para fazer download do projeto Ableton Live
   */
  const handleDownloadProject = async () => {
    // Verifica se existe o caminho do arquivo do projeto
    if (!lessonFiles?.project_file_path) {
      toast({
        title: "Arquivo não disponível",
        description: "O projeto Ableton Live desta aula ainda não foi disponibilizado.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Define o nome do arquivo para download
      const fileName = `projeto-aula-exemplo.als`;
      
      // Chama a função de download passando:
      // - bucket: 'lesson-projects' (definido na migração SQL)
      // - filePath: caminho do arquivo no storage
      // - fileName: nome que o arquivo terá quando baixado
      await downloadFileFromStorage('lesson-projects', lessonFiles.project_file_path, fileName);
      
      toast({
        title: "Download iniciado!",
        description: "O projeto Ableton Live está sendo baixado.",
      });
    } catch (error) {
      console.error('Erro ao baixar projeto:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <p className="text-gray-300">Carregando arquivos da aula...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <p className="text-red-400">Erro ao carregar arquivos: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            Exemplo: Sistema de Download de Arquivos das Aulas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-gray-300 space-y-2">
            <p><strong>ID da Aula:</strong> {exampleLessonId}</p>
            <p><strong>Samples disponíveis:</strong> {lessonFiles?.samples_file_path ? '✅ Sim' : '❌ Não'}</p>
            <p><strong>Projeto disponível:</strong> {lessonFiles?.project_file_path ? '✅ Sim' : '❌ Não'}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {/* Botão para download de samples */}
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={handleDownloadSamples}
              disabled={!lessonFiles?.samples_file_path}
            >
              <FileAudio className="w-4 h-4 mr-2" />
              Download Samples & Loops
            </Button>

            {/* Botão para download do projeto */}
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={handleDownloadProject}
              disabled={!lessonFiles?.project_file_path}
            >
              <FileCode className="w-4 h-4 mr-2" />
              Download Projeto Ableton
            </Button>
          </div>

          {/* Informações sobre o funcionamento */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Como funciona:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>1. O hook <code>useLessonFiles</code> busca os caminhos dos arquivos no banco</li>
              <li>2. A função <code>downloadFileFromStorage</code> baixa do Supabase Storage</li>
              <li>3. Os arquivos são organizados em buckets: 'lesson-samples' e 'lesson-projects'</li>
              <li>4. O download é feito via blob URL e link temporário</li>
            </ul>
          </div>

          {/* Debug Info */}
          <details className="mt-4">
            <summary className="text-gray-400 cursor-pointer">Ver dados retornados do hook</summary>
            <pre className="text-xs text-gray-300 mt-2 p-2 bg-gray-900 rounded overflow-auto">
              {JSON.stringify(lessonFiles, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonFilesExample;
