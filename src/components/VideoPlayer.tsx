import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import ExternalLessonMedia from "@/components/ExternalLessonMedia";
import LessonTextPanel from "@/components/LessonTextPanel";
import PrivateLessonMedia from "@/components/PrivateLessonMedia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { downloadFileFromStorage, useLessonFiles } from "@/hooks/useLessonFiles";
import { useLessonPlayback } from "@/hooks/useLessonPlayback";
import { useLessonProgressTracker } from "@/hooks/useLessonProgressTracker";
import { useLessons, type Lesson } from "@/hooks/useLessons";
import { getErrorMessage } from "@/lib/error-message";

interface LessonPlayerData extends Lesson {
  completed: boolean;
  progressPercent: number;
  watchedSeconds: number;
}

interface VideoPlayerProps {
  lesson: LessonPlayerData;
}

const saveStatusLabel = {
  idle: "O progresso será salvo durante a atividade.",
  saving: "Salvando progresso...",
  saved: "Progresso salvo.",
  error: "Não foi possível salvar o último evento de progresso.",
} as const;

const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const lessonFilesQuery = useLessonFiles(lesson.id);
  const allLessonsQuery = useLessons();
  const hasMedia = lesson.contentKind !== "text";
  const hasText = lesson.contentKind === "text" || lesson.contentKind === "mixed";
  const playbackQuery = useLessonPlayback(lesson.id, hasMedia);
  const tracker = useLessonProgressTracker({
    lessonId: lesson.id,
    initialCompleted: lesson.completed,
    initialProgressPercent: lesson.progressPercent,
    initialWatchedSeconds: lesson.watchedSeconds,
    configuredDurationMinutes: lesson.durationMinutes,
  });

  const observePosition = useCallback(
    (positionSeconds: number, durationSeconds?: number) => {
      if (durationSeconds === undefined) {
        tracker.observePosition({ positionSeconds });
        return;
      }
      tracker.observePosition({ positionSeconds, durationSeconds });
    },
    [tracker],
  );

  const currentIndex = allLessonsQuery.data?.findIndex((item) => item.id === lesson.id);
  const nextLesson =
    currentIndex !== undefined && currentIndex >= 0
      ? allLessonsQuery.data?.[currentIndex + 1]
      : undefined;
  const playback = playbackQuery.data;
  const sampleAsset = lessonFilesQuery.data?.find((asset) => asset.purpose === "sample");
  const projectAsset = lessonFilesQuery.data?.find((asset) => asset.purpose === "project");
  const filesUnavailable = lessonFilesQuery.isLoading || lessonFilesQuery.error !== null;

  const handleDownload = async (
    asset: typeof sampleAsset,
    unavailableMessage: string,
    successMessage: string,
  ) => {
    if (!asset) {
      toast({ title: "Arquivo não disponível", description: unavailableMessage, variant: "destructive" });
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

  const handleCompletionAction = async () => {
    try {
      if (lesson.completionMode === "manual") {
        await tracker.completeManually();
      } else {
        await tracker.acknowledgeReading();
      }
      toast({ title: "Aula concluída", description: "A conclusão foi validada e salva." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível concluir a aula",
        description: getErrorMessage(error, "Tente novamente em alguns instantes."),
        variant: "destructive",
      });
    }
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      navigate(`/aula/${nextLesson.id}`);
      return;
    }
    toast({ title: "Fim do conteúdo disponível", description: "Não existe uma próxima aula cadastrada." });
  };

  const renderMedia = () => {
    if (!hasMedia) return null;
    if (playbackQuery.isLoading) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-900">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-gray-300">Autorizando reprodução...</p>
        </div>
      );
    }
    if (playbackQuery.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-900 px-6 text-center">
          <ShieldAlert className="h-10 w-10 text-red-300" />
          <p className="text-red-200">
            {getErrorMessage(playbackQuery.error, "Não foi possível autorizar a reprodução.")}
          </p>
          <Button variant="outline" onClick={() => void playbackQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      );
    }
    if (playback?.provider === "private_asset" && playback.streamUrl) {
      return (
        <PrivateLessonMedia
          lesson={lesson}
          streamUrl={playback.streamUrl}
          watchedSeconds={lesson.watchedSeconds}
          onPosition={observePosition}
          onPlay={tracker.handlePlay}
          onPause={tracker.handlePause}
          onEnded={tracker.handleEnded}
        />
      );
    }
    if ((playback?.provider === "youtube" || playback?.provider === "vimeo") && playback.embedUrl) {
      return (
        <ExternalLessonMedia
          lesson={lesson}
          playback={playback}
          isPlaying={tracker.isPlaying}
          onPosition={observePosition}
          onPlay={tracker.handlePlay}
          onPause={tracker.handlePause}
          onEnded={tracker.handleEnded}
        />
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-800 px-6 text-center">
        <p className="text-gray-400">Mídia não disponível para esta aula.</p>
      </div>
    );
  };

  const completionActionAvailable =
    lesson.completionMode === "manual" ||
    lesson.completionMode === "reading_acknowledgement" ||
    (lesson.completionMode === "any_activity" && !hasMedia);

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          {hasMedia ? (
            <div className="relative aspect-video overflow-hidden rounded-t-lg bg-gray-900">
              {renderMedia()}
              {playback?.watermarkText ? (
                <div className="pointer-events-none absolute bottom-4 right-4 rounded bg-black/50 px-2 py-1 text-xs font-medium tracking-wider text-white/70">
                  {playback.watermarkText}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">{lesson.title}</h2>
                {lesson.description ? <p className="text-gray-300">{lesson.description}</p> : null}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{lesson.durationLabel}</span>
              </div>
            </div>

            <LessonTextPanel lessonId={lesson.id} enabled={hasText} />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progresso da aula</span>
                <span className="text-white">{tracker.progressPercent}%</span>
              </div>
              <Progress value={tracker.progressPercent} className="h-2" />
              <p
                className={tracker.saveStatus === "error" ? "text-xs text-red-300" : "text-xs text-gray-400"}
                role="status"
                aria-live="polite"
              >
                {saveStatusLabel[tracker.saveStatus]}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <BookOpen className="mr-2 h-5 w-5" />
              Materiais da aula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lessonFilesQuery.error ? (
              <p className="text-sm text-red-300">
                {getErrorMessage(lessonFilesQuery.error, "Não foi possível consultar os materiais.")}
              </p>
            ) : null}
            <Button
              variant="outline"
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={() => void handleDownload(sampleAsset, "Os samples ainda não foram disponibilizados.", "Os samples estão sendo baixados.")}
              disabled={filesUnavailable || !sampleAsset}
            >
              <Download className="mr-2 h-4 w-4" />
              {lessonFilesQuery.isLoading ? "Carregando..." : "Samples e loops da aula"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={() => void handleDownload(projectAsset, "O projeto ainda não foi disponibilizado.", "O projeto está sendo baixado.")}
              disabled={filesUnavailable || !projectAsset}
            >
              <Download className="mr-2 h-4 w-4" />
              {lessonFilesQuery.isLoading ? "Carregando..." : "Projeto da aula"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Conclusão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completionActionAvailable ? (
              <Button
                className="w-full btn-neon"
                onClick={() => void handleCompletionAction()}
                disabled={tracker.isSaving || tracker.completed}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {tracker.completed
                  ? "Aula concluída"
                  : lesson.completionMode === "manual"
                    ? "Marcar como concluída"
                    : "Confirmar leitura e concluir"}
              </Button>
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                {lesson.completionMode === "media_progress"
                  ? `A conclusão será automática ao atingir ${lesson.completionPercent ?? 90}% da mídia.`
                  : "A conclusão será registrada automaticamente durante a atividade."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h3 className="mb-1 text-lg font-semibold text-white">
                {nextLesson ? "Próxima aula" : "Fim do conteúdo disponível"}
              </h3>
              <p className="text-gray-300">
                {allLessonsQuery.error
                  ? getErrorMessage(allLessonsQuery.error, "Não foi possível identificar a próxima aula.")
                  : nextLesson?.title ?? "Não existe outra aula cadastrada."}
              </p>
            </div>
            <Button
              className="btn-neon"
              onClick={handleNextLesson}
              disabled={!nextLesson || allLessonsQuery.isLoading || allLessonsQuery.error !== null}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Próxima aula
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPlayer;
