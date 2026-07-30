import { ArrowRight, BookOpen, CheckCircle, Clock, Download, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { downloadFileFromStorage, useLessonFiles } from "@/hooks/useLessonFiles";
import { useLessonPlayback } from "@/hooks/useLessonPlayback";
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

const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  const [watchProgress, setWatchProgress] = useState(lesson.progressPercent);
  const lastPlaybackSecond = useRef(lesson.watchedSeconds);
  const privateVideoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const updateProgress = useUpdateProgress();
  const { toast } = useToast();
  const lessonFilesQuery = useLessonFiles(lesson.id);
  const allLessonsQuery = useLessons();
  const playbackQuery = useLessonPlayback(lesson.id);

  const currentIndex = allLessonsQuery.data?.findIndex((item) => item.id === lesson.id);
  const nextLesson =
    currentIndex !== undefined && currentIndex >= 0
      ? allLessonsQuery.data?.[currentIndex + 1]
      : undefined;

  useEffect(() => {
    const video = privateVideoRef.current;
    if (!video || playbackQuery.data?.provider !== "private_asset") {
      return;
    }

    const restorePosition = () => {
      const target = Math.min(
        lastPlaybackSecond.current,
        Number.isFinite(video.duration) ? video.duration : lastPlaybackSecond.current,
      );
      if (target > 0) {
        video.currentTime = target;
      }
    };

    video.addEventListener("loadedmetadata", restorePosition);
    return () => video.removeEventListener("loadedmetadata", restorePosition);
  }, [playbackQuery.data?.provider, playbackQuery.data?.streamUrl]);

  const handleMarkComplete = async () => {
    try {
      await updateProgress.mutateAsync({
        aulaId: lesson.id,
        completada: true,
        progressoPercentual: 100,
        tempoAssistido: Math.max(lesson.watchedSeconds, Math.floor(lastPlaybackSecond.current)),
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

  const sampleAsset = lessonFilesQuery.data?.find((asset) => asset.purpose === "sample");
  const projectAsset = lessonFilesQuery.data?.find((asset) => asset.purpose === "project");

  const handleDownload = async (
    asset: typeof sampleAsset,
    unavailableMessage: string,
    successMessage: string,
  ) => {
    if (!asset) {
      toast({
        title: "Arquivo não disponível",
        description: unavailableMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      await downloadFileFromStorage(asset);
      toast({ title: "Download iniciado", description: successMessage });
    } catch (error: unknown) {
      toast({
        title: "Erro no download",
        description: getErrorMessage(error, "Não foi possível baixar o arquivo."),
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
  const playback = playbackQuery.data;

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
            {playbackQuery.isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-gray-300">Autorizando reprodução...</p>
              </div>
            ) : playbackQuery.error ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-900 px-6 text-center">
                <ShieldAlert className="w-10 h-10 text-red-300" />
                <p className="text-red-200">
                  {getErrorMessage(playbackQuery.error, "Não foi possível autorizar a reprodução.")}
                </p>
                <Button variant="outline" onClick={() => void playbackQuery.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            ) : playback?.provider === "private_asset" && playback.streamUrl !== null ? (
              <video
                ref={privateVideoRef}
                key={playback.streamUrl}
                className="w-full h-full bg-black"
                src={playback.streamUrl}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                preload="metadata"
                crossOrigin="anonymous"
                onTimeUpdate={(event) => {
                  lastPlaybackSecond.current = event.currentTarget.currentTime;
                }}
              />
            ) : playback?.embedUrl !== null && playback?.embedUrl !== undefined ? (
              <iframe
                className="w-full h-full"
                src={playback.embedUrl}
                title={lesson.title}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="no-referrer"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <p className="text-gray-400">Mídia não disponível para esta aula</p>
              </div>
            )}

            {playback?.watermarkText ? (
              <div className="pointer-events-none absolute right-4 bottom-4 rounded bg-black/50 px-2 py-1 text-xs font-medium tracking-wider text-white/70">
                {playback.watermarkText}
              </div>
            ) : null}
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
              onClick={() =>
                void handleDownload(
                  sampleAsset,
                  "Os samples e loops desta aula ainda não foram disponibilizados.",
                  "Os samples e loops da aula estão sendo baixados.",
                )
              }
              disabled={filesUnavailable || !sampleAsset}
            >
              <Download className="w-4 h-4 mr-2" />
              {lessonFilesQuery.isLoading ? "Carregando..." : "Samples e loops da aula"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={() =>
                void handleDownload(
                  projectAsset,
                  "O projeto desta aula ainda não foi disponibilizado.",
                  "O projeto da aula está sendo baixado.",
                )
              }
              disabled={filesUnavailable || !projectAsset}
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
