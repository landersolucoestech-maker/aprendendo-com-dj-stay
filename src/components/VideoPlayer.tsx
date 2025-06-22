import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Download, BookOpen, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdateProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";
import { useLessonFiles, downloadFileFromStorage } from "@/hooks/useLessonFiles";
import { useLessons } from "@/hooks/useLessons";
import { useUserProgress } from "@/hooks/useUserProgress";

interface Lesson {
  id: string;
  title: string;
  duration?: string;
  completed: boolean;
  video_url?: string;
  videoUrl?: string;
  description: string;
}

interface VideoPlayerProps {
  lesson: Lesson;
}

const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  const [watchProgress, setWatchProgress] = useState(lesson.completed ? 100 : 0);
  const navigate = useNavigate();
  const updateProgress = useUpdateProgress();
  const { toast } = useToast();
  const { data: lessonFiles, isLoading: filesLoading } = useLessonFiles(lesson.id);
  const { data: allLessons } = useLessons();
  const { data: userProgress } = useUserProgress();
  
  // Check if current lesson is completed
  const currentLessonProgress = userProgress?.find(p => p.aula_id === lesson.id);
  const isCurrentLessonCompleted = currentLessonProgress?.completada || lesson.completed || watchProgress === 100;
  
  // Find next lesson
  const currentIndex = allLessons?.findIndex(l => l.id === lesson.id) || 0;
  const nextLesson = allLessons?.[currentIndex + 1];
  
  // Verificar se todas as aulas foram concluídas (para certificados)
  const areAllLessonsCompleted = () => {
    if (!allLessons || !userProgress) return false;
    
    const completedLessons = userProgress.filter(progress => progress.completada);
    return completedLessons.length === allLessons.length;
  };

  const allLessonsCompleted = areAllLessonsCompleted();
  
  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  };

  const videoUrl = lesson.video_url || lesson.videoUrl || '';
  const videoId = getYouTubeVideoId(videoUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : videoUrl;

  const handleMarkComplete = async () => {
    try {
      await updateProgress.mutateAsync({
        aulaId: lesson.id,
        completada: true,
        progressoPercentual: 100,
        tempoAssistido: 0,
      });
      
      setWatchProgress(100);
      
      toast({
        title: "Aula concluída!",
        description: "Seu progresso foi salvo com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao marcar aula como concluída:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o progresso. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSamples = async () => {
    if (!lessonFiles?.samples_file_path) {
      toast({
        title: "Arquivo não disponível",
        description: "Os samples e loops desta aula ainda não foram disponibilizados.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `samples-loops-${lesson.title.replace(/\s+/g, '-').toLowerCase()}.zip`;
      await downloadFileFromStorage('lesson-samples', lessonFiles.samples_file_path, fileName);
      
      toast({
        title: "Download iniciado!",
        description: "Os samples e loops da aula estão sendo baixados.",
      });
    } catch (error) {
      console.error('Erro ao baixar samples:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar os samples. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadProject = async () => {
    if (!lessonFiles?.project_file_path) {
      toast({
        title: "Arquivo não disponível",
        description: "O projeto Ableton Live desta aula ainda não foi disponibilizado.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `projeto-ableton-${lesson.title.replace(/\s+/g, '-').toLowerCase()}.als`;
      await downloadFileFromStorage('lesson-projects', lessonFiles.project_file_path, fileName);
      
      toast({
        title: "Download iniciado!",
        description: "O projeto Ableton Live está sendo baixado.",
      });
    } catch (error) {
      console.error('Erro ao baixar projeto:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o projeto. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      navigate(`/aula/${nextLesson.id}`);
    } else {
      toast({
        title: "Parabéns!",
        description: "Você concluiu todas as aulas do curso!",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
            {embedUrl ? (
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
                <p className="text-gray-400">Vídeo não disponível</p>
              </div>
            )}
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{lesson.title}</h2>
                <p className="text-gray-300">{lesson.description}</p>
              </div>
              {lesson.duration && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.duration}</span>
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

      {/* Lesson Info and Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Materiais da Aula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={handleDownloadSamples}
              disabled={filesLoading || !lessonFiles?.samples_file_path}
            >
              <Download className="w-4 h-4 mr-2" />
              {filesLoading ? 'Carregando...' : 'Samples e loops da aula'}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
              onClick={handleDownloadProject}
              disabled={filesLoading || !lessonFiles?.project_file_path}
            >
              <Download className="w-4 h-4 mr-2" />
              {filesLoading ? 'Carregando...' : 'Projeto Ableton Live'}
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
              {updateProgress.isPending ? 'Salvando...' : watchProgress === 100 ? 'Concluída!' : 'Marcar como concluída'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Next Lesson Suggestion */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {nextLesson ? 'Próxima Aula' : 'Curso Concluído'}
              </h3>
              <p className="text-gray-300">
                {nextLesson ? nextLesson.title : 'Parabéns por concluir todas as aulas!'}
              </p>
            </div>
            <Button 
              className="btn-neon"
              onClick={handleNextLesson}
              disabled={!nextLesson}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              {nextLesson ? 'Próxima Aula' : 'Curso Concluído'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPlayer;
