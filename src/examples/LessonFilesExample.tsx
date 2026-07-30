import { Card, CardContent } from "@/components/ui/card";
import { useLessonFiles } from "@/hooks/useLessonFiles";
import { useParams } from "react-router-dom";

const LessonFilesExample = () => {
  const { lessonId } = useParams();
  const currentLessonId = lessonId ?? "1c136523-3b58-4cc3-ba5b-aa03f4a4e081";
  const { isLoading, error } = useLessonFiles(currentLessonId);

  if (isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
            <p className="text-gray-300">Carregando arquivos da aula...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  return null;
};

export default LessonFilesExample;
