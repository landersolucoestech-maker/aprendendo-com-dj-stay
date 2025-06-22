
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileAudio, FileCode, Upload, AlertCircle } from "lucide-react";
import { useLessonFiles, downloadFileFromStorage } from "@/hooks/useLessonFiles";
import { useToast } from "@/hooks/use-toast";
import { useParams } from 'react-router-dom';

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
  const { lessonId } = useParams();
  
  // Usar o ID da aula atual da URL, ou um ID padrão se não estiver disponível
  const currentLessonId = lessonId || "1c136523-3b58-4cc3-ba5b-aa03f4a4e081";
  
  // Hook que busca os arquivos da aula no banco de dados
  const { data: lessonFiles, isLoading, error } = useLessonFiles(currentLessonId);

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
      const fileName = `samples-loops-aula-${currentLessonId.slice(0, 8)}.zip`;
      
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
        description: `Não foi possível baixar os samples: ${error.message}`,
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
      const fileName = `projeto-aula-${currentLessonId.slice(0, 8)}.als`;
      
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
        description: `Não foi possível baixar o projeto: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <p className="text-gray-300">Carregando arquivos da aula...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <p>Erro ao carregar arquivos: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Sistema de Download de Arquivos das Aulas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-gray-300 space-y-2">
            <p><strong>ID da Aula:</strong> {currentLessonId}</p>
            <p><strong>Samples disponíveis:</strong> {lessonFiles?.samples_file_path ? '✅ Sim' : '❌ Não'}</p>
            <p><strong>Projeto disponível:</strong> {lessonFiles?.project_file_path ? '✅ Sim' : '❌ Não'}</p>
            
            {!lessonFiles && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">
                    Nenhum arquivo encontrado para esta aula. 
                    <br />
                    Para testar o sistema, você precisa adicionar dados na tabela lesson_files.
                  </p>
                </div>
              </div>
            )}
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

          {/* Como adicionar dados de teste */}
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Para testar o sistema:</h4>
            <div className="text-gray-300 text-sm space-y-2">
              <p>1. Acesse o SQL Editor do Supabase</p>
              <p>2. Execute um comando como:</p>
              <code className="block bg-gray-800 p-2 rounded text-xs mt-1">
                INSERT INTO lesson_files (aula_id, samples_file_path, project_file_path)<br/>
                VALUES ('{currentLessonId}', 'exemplo/samples.zip', 'exemplo/projeto.als');
              </code>
              <p>3. Faça upload dos arquivos nos buckets correspondentes</p>
            </div>
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
