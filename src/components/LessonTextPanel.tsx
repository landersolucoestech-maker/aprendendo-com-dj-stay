import { FileText } from "lucide-react";

import { useLessonTextContent } from "@/hooks/useLessonTextContent";
import { getErrorMessage } from "@/lib/error-message";

interface LessonTextPanelProps {
  lessonId: string;
  enabled: boolean;
}

const LessonTextPanel = ({ lessonId, enabled }: LessonTextPanelProps) => {
  const textQuery = useLessonTextContent(lessonId, enabled);

  if (!enabled) return null;

  return (
    <section
      className="rounded-xl border border-white/10 bg-white/5 p-6"
      aria-labelledby="lesson-text-title"
    >
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h3 id="lesson-text-title" className="text-lg font-semibold text-white">
          Conteúdo da aula
        </h3>
      </div>
      {textQuery.isLoading ? (
        <p className="text-sm text-gray-400">Carregando conteúdo...</p>
      ) : textQuery.error ? (
        <p className="text-sm text-red-300">
          {getErrorMessage(textQuery.error, "Não foi possível carregar o conteúdo textual.")}
        </p>
      ) : textQuery.data ? (
        <div className="whitespace-pre-wrap text-base leading-7 text-gray-200">
          {textQuery.data}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Nenhum conteúdo textual foi publicado.</p>
      )}
    </section>
  );
};

export default LessonTextPanel;
