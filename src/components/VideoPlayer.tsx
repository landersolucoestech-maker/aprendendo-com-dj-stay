
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Download, BookOpen } from "lucide-react";
import { useState } from "react";

interface Lesson {
  id: number;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  description: string;
}

interface VideoPlayerProps {
  lesson: Lesson;
}

const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  const [watchProgress, setWatchProgress] = useState(lesson.completed ? 100 : 0);
  
  const handleVideoProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const progress = (video.currentTime / video.duration) * 100;
    setWatchProgress(Math.round(progress));
  };

  const handleVideoEnded = () => {
    setWatchProgress(100);
  };
  
  return (
    <div className="space-y-6">
      {/* Video Player */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
            <video
              className="w-full h-full object-cover"
              controls
              preload="metadata"
              onTimeUpdate={handleVideoProgress}
              onEnded={handleVideoEnded}
              poster="/placeholder.svg"
            >
              <source src={lesson.videoUrl} type="video/mp4" />
              <track kind="captions" src="" label="Portuguese" default />
              Seu navegador não suporta o elemento de vídeo.
            </video>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{lesson.title}</h2>
                <p className="text-gray-300">{lesson.description}</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{lesson.duration}</span>
              </div>
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
            <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              Baixar slides da apresentação
            </Button>
            <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              Samples e loops da aula
            </Button>
            <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              Projeto FL Studio
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
              onClick={() => setWatchProgress(100)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como concluída
            </Button>
            <Button variant="outline" className="w-full border-white/20 bg-transparent hover:bg-white/10">
              Fazer anotações
            </Button>
            <Button variant="outline" className="w-full border-white/20 bg-transparent hover:bg-white/10">
              Tirar dúvidas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Next Lesson Suggestion */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Próxima Aula</h3>
              <p className="text-gray-300">Samples e Loops</p>
            </div>
            <Button className="btn-neon">
              Continuar Curso
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPlayer;
