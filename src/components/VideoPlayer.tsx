import { ArrowRight, BookOpen, CheckCircle, Clock, Download } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { downloadFileFromStorage, useLessonFiles } from "@/hooks/useLessonFiles";
import { useLessons, type Lesson } from "@/hooks/useLessons";
import { useUpdateProgress } from "@/hooks/useUserProgress";
import { getErrorMessage } from "@/lib/error-message";

interface LessonPlayerData extends Lesson {
  completed: boolean;
  progressPercent: number;
  watchedSeconds: number;
}

interface VideoPlayerProps {
  lesson: LessonPlayerData;
}

const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  );
  return match?.[1] ?? null;
};

const slugifyFileName = (title: string): string =>
  title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  const [watchProgress, setWatchProgress] = useState(lesson.progressPercent);
  const navigate = useNavigate();
  const updateProgress = useUpdateProgress();
  const { toast } = useToast();
  const lessonFilesQuery = useLessonFiles(lesson.id);
  const allLessonsQuery = useLessons();

  const currentIndex = allLessonsQuery.data?.findIndex((item) => item.id === lesson.id);
  const nextLesson =
    currentIndex !== undefined && currentIndex >= 0
      ? allLessonsQuery.data?.[currentIndex + 1]
      : undefined;
  const videoId = lesson.videoUrl === null ? null : getYouTubeVideoId(lesson.videoUrl);
  const embedUrl =
    lesson.videoUrl === null
      ? null
      : videoId === null
        ? lesson.videoUrl
        : `https://www.youtube.com/embed/${videoId}`;

  const handleMarkComplete = async () => {
    try {
      await updateProgress.mutateAsync({
        aulaId: lesson.id,
        completada: true,
        progressoPercentual: 100,
        tempoAssistido: lesson.watchedSeconds,
      });
      setWatchProgress(100);
      toast({
        title: "Aula concluída!",
        description: "Seu progresso foi salvo com sucesso.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível salvar o progresso",
        description: getErrorMessage(error, "Tente novamente em alguns instantes."),
        variant: "destructive",
      });
    }
  };

  const handleDownloadSamples = async () => {
    const filePath = lessonFilesQuery.data?.samples_file_path;

    if (!filePath) {
      toast({
        title: "Arquivo não disponível",
        description: "Os samples e loops desta aula ainda não foram disponibilizados.",
        variant: "destructive",
      });
      return;
    }

    try {
      await downloadFileFromStorage(
        "lesson-samples",
        filePath,
        `samples-loops-${slugifyFileName(lesson.title)}.zip`,
      );
      toast({
        title: "Download iniciado",
        description: "Os samples e loops da aula estão sendo baixados.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro no download",
        description: getErrorMessage(error, "Não foi possível baixar os samples."),
        variant: "destructive",
      });
    }
  };

  const handleDownloadProject = async () => {
    const filePath = lessonFilesQuery.data?.project_file_path;

    if (!filePath) {
      toast({
        title: "Arquivo não disponível",
        description: "O projeto desta aula ainda não foi disponibilizado.",
        variant: "destructive",
      });
      return;
    }

    try {
      await downloadFileFromStorage(
        "lesson-projects",
        filePath,
        `projeto-${slugifyFileName(lesson.title)}.als`,
      );
      toast({
        title: "Download iniciado",
        description: "O projeto da aula está sendo baixado.",
      });
    } catch (error: unknown) {
      toast({
        title: "Erro no download",
        description: getErrorMessage(error, "Não foi possível baixar o projeto."),
        variant: "destructive",
      });
    }
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      navigate(`/aula/${nextLesson.id}`);
      return;
    }

    toast({
      title: "Fim do conteúdo disponível",
      description: "Não existe uma próxima aula cadastrada.",
    });
  };

  const filesUnavailable = lessonFilesQuery.isLoading || lessonFilesQuery.error !== null;

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
            {embedUrl !== null ? (
              <iframe
                className="w-full h-full"
                src={embedUrl}
                title={lesson.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <p className="text-gray-400">Vídeo não informado para esta aula</p>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4 gap-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{lesson.title}</h2>
                {lesson.description !== null && (
                  <p className="text-gray-300">{lesson.description}</p>
                )}
              </div>
              {lesson.durationLabel !== null && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.durationLabel}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progresso da aula</span>
                <span className="text-white">{watchProgress}%</span>
              </div>
              <Progress value={watchProgress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Materiais da Aula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessonFilesQuery.error && (
              <p className="text-sm text-red-300">
                {getErrorMessage(
                  lessonFilesQuery.error,
                  "Não foi possível consultar os materiais desta aula.",
                )}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={handleDownloadSamples}
              disabled={filesUnavailable || !lessonFilesQuery.data?.samples_file_path}
            >
              <Download className="w-4 h-4 mr-2" />
              {lessonFilesQuery.isLoading ? "Carregando..." : "Samples e loops da aula"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={handleDownloadProject}
              disabled={filesUnavailable || !lessonFilesQuery.data?.project_file_path}
            >
              <Download className="w-4 h-4 mr-2" />
              {lessonFilesQuery.isLoading ? "Carregando..." : "Projeto da aula"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full btn-neon"
              onClick={handleMarkComplete}
              disabled={updateProgress.isPending || watchProgress === 100}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updateProgress.isPending
                ? "Salvando..."
                : watchProgress === 100
                  ? "Concluída"
                  : "Marcar como concluída"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {nextLesson ? "Próxima aula" : "Fim do conteúdo disponível"}
              </h3>
              <p className="text-gray-300">
                {allLessonsQuery.error
                  ? getErrorMessage(
                      allLessonsQuery.error,
                      "Não foi possível identificar a próxima aula.",
                    )
                  : nextLesson?.title ?? "Não existe outra aula cadastrada."}
              </p>
            </div>
            <Button
              className="btn-neon"
              onClick={handleNextLesson}
              disabled={!nextLesson || allLessonsQuery.isLoading || allLessonsQuery.error !== null}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Próxima aula
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPlayer;
