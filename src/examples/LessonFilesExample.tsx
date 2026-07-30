import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileAudio, FileCode, Upload, AlertCircle, ExternalLink, CheckCircle } from "lucide-react";
import { useLessonFiles, downloadFileFromStorage } from "@/hooks/useLessonFiles";
import { useToast } from "@/hooks/use-toast";
import { useParams } from 'react-router-dom';
import { getErrorMessage } from "@/lib/error-message";
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
    } catch (error: unknown) {
      console.error('Erro ao baixar samples:', error);
      toast({
        title: "Erro no download",
        description: getErrorMessage(error, "Não foi possível baixar os samples."),
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
    } catch (error: unknown) {
      console.error('Erro ao baixar projeto:', error);
      toast({
        title: "Erro no download",
        description: getErrorMessage(error, "Não foi possível baixar o projeto."),
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
    return null;
  }
  return <div className="space-y-6 p-6">
      
    </div>;
};
export default LessonFilesExample;