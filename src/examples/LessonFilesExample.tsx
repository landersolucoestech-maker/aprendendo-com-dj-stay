import { useParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { useLessonFiles } from "@/hooks/useLessonFiles";
import { getErrorMessage } from "@/lib/error-message";

const LessonFilesExample = () => {
  const { lessonId } = useParams();
  const { data, isLoading, error } = useLessonFiles(lessonId ?? "");

  if (!lessonId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            <p className="text-gray-300">Carregando materiais privados da aula...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6 text-red-300">
          {getErrorMessage(error, "Não foi possível consultar os materiais da aula.")}
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return null;
  }

  return null;
};

export default LessonFilesExample;
