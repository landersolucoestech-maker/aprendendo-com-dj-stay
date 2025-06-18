
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Download, BookOpen, ArrowLeft, ArrowRight } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  description: string;
  moduleId: string;
  moduleName: string;
}

const Lesson = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [watchProgress, setWatchProgress] = useState(0);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLessonData = async () => {
      try {
        console.log('Buscando dados da aula:', lessonId);
        
        // Buscar todas as aulas com informações dos módulos
        const { data: lessonsData, error } = await supabase
          .from('lessons')
          .select(`
            id,
            title,
            content,
            video_url,
            order_num,
            modules (
              id,
              title
            )
          `)
          .order('order_num', { ascending: true });

        if (error) {
          console.error('Erro ao buscar aulas:', error);
          return;
        }

        console.log('Aulas encontradas:', lessonsData);

        // Transformar os dados para o formato esperado
        const transformedLessons: Lesson[] = lessonsData?.map((lesson) => ({
          id: lesson.id,
          title: lesson.title || 'Aula sem título',
          duration: '15:30', // Valor padrão - em uma aplicação real, isso viria do banco
          completed: false, // Valor padrão - seria calculado baseado no progresso do usuário
          videoUrl: lesson.video_url || '',
          description: lesson.content || 'Descrição não disponível',
          moduleId: lesson.modules?.id || '',
          moduleName: lesson.modules?.title || 'Módulo'
        })) || [];

        setAllLessons(transformedLessons);
        
        // Encontrar a aula atual
        const current = transformedLessons.find(lesson => lesson.id === lessonId);
        setCurrentLesson(current || null);
        
        if (current?.completed) {
          setWatchProgress(100);
        }
        
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    if (lessonId) {
      fetchLessonData();
    }
  }, [lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Carregando aula...</h1>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aula não encontrada</h1>
          <Button onClick={() => navigate('/dashboard')} className="btn-neon">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentIndex = allLessons.findIndex(lesson => lesson.id === lessonId);
  const nextLesson = allLessons[currentIndex + 1];
  const prevLesson = allLessons[currentIndex - 1];

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
                onClick={() => navigate('/dashboard')}
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
                    onClick={() => navigate('/dashboard')}
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
