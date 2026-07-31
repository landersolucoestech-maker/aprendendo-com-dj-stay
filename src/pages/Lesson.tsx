import { ArrowLeft, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { useLessons } from "@/hooks/useLessons";
import { useUserProgress } from "@/hooks/useUserProgress";
import { getErrorMessage } from "@/lib/error-message";

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lessonsQuery = useLessons();
  const progressQuery = useUserProgress();

  if (lessonsQuery.isLoading || progressQuery.isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300">Carregando aula...</p>
        </div>
      </div>
    );
  }

  const loadingError = lessonsQuery.error ?? progressQuery.error;

  if (loadingError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <h1 className="text-2xl font-bold mb-4">Erro ao carregar aula</h1>
          <p className="text-gray-300 mb-4">
            {getErrorMessage(loadingError, "Não foi possível carregar os dados da aula.")}
          </p>
          <Button onClick={() => navigate("/aluno/cursos")} className="btn-neon">
            Voltar aos cursos
          </Button>
        </div>
      </div>
    );
  }

  const currentLesson = lessonsQuery.data?.find((lesson) => lesson.id === lessonId);

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aula não encontrada</h1>
          <Button onClick={() => navigate("/aluno/cursos")} className="btn-neon">
            Voltar aos cursos
          </Button>
        </div>
      </div>
    );
  }

  const currentProgress = progressQuery.data?.find(
    (progress) => progress.aula_id === currentLesson.id,
  );
  const lessonForPlayer = {
    ...currentLesson,
    completed: currentProgress?.completada === true,
    progressPercent: currentProgress?.progresso_percentual ?? 0,
    watchedSeconds: currentProgress?.tempo_assistido ?? 0,
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/aluno/cursos")}
                className="text-gray-300 hover:text-white"
                aria-label="Voltar aos cursos"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-sm text-gray-400">Aula</p>
                <h1 className="text-2xl font-bold gradient-text">{currentLesson.title}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{currentLesson.durationLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <VideoPlayer lesson={lessonForPlayer} />
      </div>
    </div>
  );
};

export default Lesson;
