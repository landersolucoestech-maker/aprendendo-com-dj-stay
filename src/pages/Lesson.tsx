
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Download, BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [watchProgress, setWatchProgress] = useState(0);

  // Dados mockados das aulas - em uma aplicação real, isso viria de uma API
  const lessons = [
    {
      id: 1,
      title: 'Introdução ao Curso',
      duration: '15:30',
      completed: true,
      videoUrl: 'https://example.com/video1.mp4',
      description: 'Bem-vindo ao curso de produção de funk! Nesta aula introdutória, você conhecerá os objetivos do curso e o que esperar das próximas lições.',
      moduleId: 1,
      moduleName: 'Fundamentos da Produção Musical'
    },
    {
      id: 2,
      title: 'Configurando seu Home Studio',
      duration: '25:45',
      completed: false,
      videoUrl: 'https://example.com/video2.mp4',
      description: 'Aprenda a configurar seu estúdio em casa com equipamentos básicos e necessários para começar a produzir funk.',
      moduleId: 1,
      moduleName: 'Fundamentos da Produção Musical'
    },
    {
      id: 3,
      title: 'Conhecendo o FL Studio',
      duration: '30:20',
      completed: false,
      videoUrl: 'https://example.com/video3.mp4',
      description: 'Uma introdução completa ao FL Studio, a DAW que utilizaremos durante todo o curso.',
      moduleId: 1,
      moduleName: 'Fundamentos da Produção Musical'
    },
    {
      id: 4,
      title: 'Drum Patterns Essenciais',
      duration: '25:10',
      completed: false,
      videoUrl: 'https://example.com/video4.mp4',
      description: 'Domine os padrões rítmicos fundamentais do funk carioca e aprenda a criar beats marcantes.',
      moduleId: 2,
      moduleName: 'Criação de Beats e Samples'
    }
  ];

  const currentLesson = lessons.find(lesson => lesson.id === parseInt(lessonId || '1'));
  const currentIndex = lessons.findIndex(lesson => lesson.id === parseInt(lessonId || '1'));
  const nextLesson = lessons[currentIndex + 1];
  const prevLesson = lessons[currentIndex - 1];

  useEffect(() => {
    if (currentLesson?.completed) {
      setWatchProgress(100);
    }
  }, [currentLesson]);

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aula não encontrada</h1>
          <Button onClick={() => navigate('/cursos')} className="btn-neon">
            Voltar aos Cursos
          </Button>
        </div>
      </div>
    );
  }

  const handleMarkComplete = () => {
    setWatchProgress(100);
    // Aqui você salvaria o progresso no backend
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/cursos')}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-sm text-gray-400">{currentLesson.moduleName}</p>
                <h1 className="text-2xl font-bold gradient-text">{currentLesson.title}</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{currentLesson.duration}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Video Player */}
          <div className="lg:col-span-3">
            <VideoPlayer lesson={currentLesson} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Progresso da Aula</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Assistido</span>
                    <span className="text-white">{watchProgress}%</span>
                  </div>
                  <Progress value={watchProgress} className="h-2" />
                </div>
                
                {watchProgress < 100 && (
                  <Button 
                    onClick={handleMarkComplete}
                    className="w-full btn-neon"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Concluída
                  </Button>
                )}
                
                {watchProgress === 100 && (
                  <div className="flex items-center justify-center text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Aula Concluída!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Materials Card */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Materiais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10">
                  <Download className="w-4 h-4 mr-2" />
                  Slides da Aula
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10">
                  <Download className="w-4 h-4 mr-2" />
                  Samples e Loops
                </Button>
                <Button variant="outline" className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10">
                  <Download className="w-4 h-4 mr-2" />
                  Projeto FL Studio
                </Button>
              </CardContent>
            </Card>

            {/* Navigation Card */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">Navegação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prevLesson && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-white/20 bg-transparent hover:bg-white/10"
                    onClick={() => navigate(`/aula/${prevLesson.id}`)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Aula Anterior
                  </Button>
                )}
                
                {nextLesson && (
                  <Button 
                    className="w-full btn-neon"
                    onClick={() => navigate(`/aula/${nextLesson.id}`)}
                  >
                    Próxima Aula
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                
                {!nextLesson && (
                  <Button 
                    className="w-full btn-neon"
                    onClick={() => navigate('/cursos')}
                  >
                    Finalizar Módulo
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lesson Description */}
        <div className="mt-8">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Sobre esta Aula</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">{currentLesson.description}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Lesson;
