import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileAudio, FileCode, Upload, AlertCircle, ExternalLink } from "lucide-react";
import { useLessonFiles, downloadFileFromStorage } from "@/hooks/useLessonFiles";
import { useToast } from "@/hooks/use-toast";
import { useParams } from 'react-router-dom';
const LessonFilesExample = () => {
  const {
    toast
  } = useToast();
  const {
    lessonId
  } = useParams();
  const currentLessonId = lessonId || "1c136523-3b58-4cc3-ba5b-aa03f4a4e081";
  const {
    data: lessonFiles,
    isLoading,
    error
  } = useLessonFiles(currentLessonId);
  const handleDownloadSamples = async () => {
    if (!lessonFiles?.samples_file_path) {
      toast({
        title: "Arquivo não disponível",
        description: "Os samples e loops desta aula ainda não foram disponibilizados.",
        variant: "destructive"
      });
      return;
    }
    try {
      const fileName = `samples-loops-aula-${currentLessonId.slice(0, 8)}.zip`;
      await downloadFileFromStorage('lesson-samples', lessonFiles.samples_file_path, fileName);
      toast({
        title: "Download iniciado!",
        description: "Os samples e loops da aula estão sendo baixados."
      });
    } catch (error: any) {
      console.error('Erro ao baixar samples:', error);
      toast({
        title: "Erro no download",
        description: error.message || "Não foi possível baixar os samples.",
        variant: "destructive"
      });
    }
  };
  const handleDownloadProject = async () => {
    if (!lessonFiles?.project_file_path) {
      toast({
        title: "Arquivo não disponível",
        description: "O projeto Ableton Live desta aula ainda não foi disponibilizado.",
        variant: "destructive"
      });
      return;
    }
    try {
      const fileName = `projeto-aula-${currentLessonId.slice(0, 8)}.als`;
      await downloadFileFromStorage('lesson-projects', lessonFiles.project_file_path, fileName);
      toast({
        title: "Download iniciado!",
        description: "O projeto Ableton Live está sendo baixado."
      });
    } catch (error: any) {
      console.error('Erro ao baixar projeto:', error);
      toast({
        title: "Erro no download",
        description: error.message || "Não foi possível baixar o projeto.",
        variant: "destructive"
      });
    }
  };
  if (isLoading) {
    return <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <p className="text-gray-300">Carregando arquivos da aula...</p>
          </div>
        </CardContent>
      </Card>;
  }
  if (error) {
    return;
  }
  return <div className="space-y-6 p-6">
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
            
            {lessonFiles && <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">
                    <strong>Configuração necessária:</strong> Os caminhos dos arquivos estão configurados no banco de dados, 
                    mas você precisa fazer upload dos arquivos reais no Supabase Storage para que os downloads funcionem.
                  </p>
                </div>
              </div>}

            {!lessonFiles && <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">
                    Nenhum arquivo encontrado para esta aula.
                  </p>
                </div>
              </div>}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10" onClick={handleDownloadSamples} disabled={!lessonFiles?.samples_file_path}>
              <FileAudio className="w-4 h-4 mr-2" />
              Download Samples & Loops
            </Button>

            <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10" onClick={handleDownloadProject} disabled={!lessonFiles?.project_file_path}>
              <FileCode className="w-4 h-4 mr-2" />
              Download Projeto Ableton
            </Button>
          </div>

          {lessonFiles && <div className="mt-6 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                Próximos passos para ativar os downloads:
              </h4>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>1. Acesse o <strong>Supabase Storage</strong> do seu projeto</li>
                <li>2. Faça upload dos arquivos nos caminhos especificados:</li>
                <li className="ml-4">• <code>{lessonFiles.samples_file_path}</code> → bucket lesson-samples</li>
                <li className="ml-4">• <code>{lessonFiles.project_file_path}</code> → bucket lesson-projects</li>
                <li>3. Os downloads funcionarão automaticamente após o upload</li>
              </ul>
            </div>}

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Como funciona:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>1. O hook <code>useLessonFiles</code> busca os caminhos dos arquivos no banco</li>
              <li>2. A função <code>downloadFileFromStorage</code> baixa do Supabase Storage</li>
              <li>3. Os arquivos são organizados em buckets: 'lesson-samples' e 'lesson-projects'</li>
              <li>4. O download é feito via blob URL e link temporário</li>
            </ul>
          </div>

          <details className="mt-4">
            <summary className="text-gray-400 cursor-pointer">Ver dados retornados do hook</summary>
            <pre className="text-xs text-gray-300 mt-2 p-2 bg-gray-900 rounded overflow-auto">
              {JSON.stringify(lessonFiles, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>;
};
export default LessonFilesExample;