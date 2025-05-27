
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, BookOpen, Award, Clock, Play, Settings, LogOut, CheckCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import LessonCard from "@/components/LessonCard";
import VideoPlayer from "@/components/VideoPlayer";

const Dashboard = () => {
  const [user] = useState({
    name: 'João Silva',
    email: 'joao@email.com',
    joinDate: '15 de Janeiro, 2024',
    progress: 65
  });

  const [currentLesson, setCurrentLesson] = useState(null);

  const modules = [
    {
      id: 1,
      title: 'Módulo 1 - Fundamentos',
      description: 'Aprenda os conceitos básicos da produção de funk',
      progress: 100,
      lessons: [
        {
          id: 1,
          title: 'Introdução ao Funk',
          duration: '15:30',
          completed: true,
          videoUrl: 'https://example.com/video1.mp4',
          description: 'História e evolução do funk brasileiro'
        },
        {
          id: 2,
          title: 'Estrutura Musical do Funk',
          duration: '22:45',
          completed: true,
          videoUrl: 'https://example.com/video2.mp4',
          description: 'Entenda a base rítmica e harmônica'
        },
        {
          id: 3,
          title: 'Equipamentos Básicos',
          duration: '18:20',
          completed: true,
          videoUrl: 'https://example.com/video3.mp4',
          description: 'O que você precisa para começar'
        }
      ]
    },
    {
      id: 2,
      title: 'Módulo 2 - Criação de Beats',
      description: 'Domine a arte de criar batidas marcantes',
      progress: 75,
      lessons: [
        {
          id: 4,
          title: 'Drum Patterns Essenciais',
          duration: '25:10',
          completed: true,
          videoUrl: 'https://example.com/video4.mp4',
          description: 'Padrões rítmicos fundamentais do funk'
        },
        {
          id: 5,
          title: 'Criando Variações',
          duration: '30:15',
          completed: true,
          videoUrl: 'https://example.com/video5.mp4',
          description: 'Como dar personalidade aos seus beats'
        },
        {
          id: 6,
          title: 'Samples e Loops',
          duration: '20:30',
          completed: false,
          videoUrl: 'https://example.com/video6.mp4',
          description: 'Usando samples de forma criativa'
        }
      ]
    },
    {
      id: 3,
      title: 'Módulo 3 - Mixagem',
      description: 'Finalize suas faixas com qualidade profissional',
      progress: 30,
      lessons: [
        {
          id: 7,
          title: 'EQ e Compressão',
          duration: '28:45',
          completed: true,
          videoUrl: 'https://example.com/video7.mp4',
          description: 'Técnicas de equalização e compressão'
        },
        {
          id: 8,
          title: 'Efeitos e Espacialização',
          duration: '24:20',
          completed: false,
          videoUrl: 'https://example.com/video8.mp4',
          description: 'Reverb, delay e outros efeitos'
        },
        {
          id: 9,
          title: 'Masterização Final',
          duration: '32:10',
          completed: false,
          videoUrl: 'https://example.com/video9.mp4',
          description: 'Dê o toque final nas suas produções'
        }
      ]
    }
  ];

  const recentActivities = [
    { activity: 'Completou a lição "Estrutura de um Beat"', time: '2 horas atrás' },
    { activity: 'Baixou samples do Módulo 2', time: '1 dia atrás' },
    { activity: 'Assistiu "Introdução ao FL Studio"', time: '3 dias atrás' },
  ];

  const handleLessonClick = (lesson) => {
    setCurrentLesson(lesson);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Área do Aluno</h1>
              <p className="text-gray-300 mt-1">Bem-vindo de volta, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Perfil */}
          <div className="space-y-6">
            <Card className="glass-card border-white/10">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-neon rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{user.name}</CardTitle>
                    <CardDescription className="text-gray-400">{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Membro desde</p>
                  <p className="text-white">{user.joinDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Progresso Geral</p>
                  <Progress value={user.progress} className="h-2" />
                  <p className="text-xs text-gray-400 mt-1">{user.progress}% concluído</p>
                </div>
                <Button className="w-full btn-neon">
                  <Award className="w-4 h-4 mr-2" />
                  Certificados
                </Button>
              </CardContent>
            </Card>

            {/* Atividades Recentes */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.map((item, index) => (
                  <div key={index} className="border-b border-white/10 pb-3 last:border-b-0">
                    <p className="text-sm text-white">{item.activity}</p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="aulas" className="space-y-6">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger value="aulas" className="data-[state=active]:bg-white/20">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Aulas
                </TabsTrigger>
                <TabsTrigger value="progresso" className="data-[state=active]:bg-white/20">
                  <Award className="w-4 h-4 mr-2" />
                  Progresso
                </TabsTrigger>
              </TabsList>

              <TabsContent value="aulas" className="space-y-6">
                {currentLesson ? (
                  <div className="space-y-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentLesson(null)}
                      className="border-white/20 bg-transparent hover:bg-white/10"
                    >
                      ← Voltar às aulas
                    </Button>
                    <VideoPlayer lesson={currentLesson} />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {modules.map((module) => (
                      <div key={module.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-white">{module.title}</h3>
                            <p className="text-gray-300">{module.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Progresso</p>
                            <p className="text-white font-semibold">{module.progress}%</p>
                          </div>
                        </div>
                        
                        <Progress value={module.progress} className="h-2" />
                        
                        <div className="grid gap-4">
                          {module.lessons.map((lesson) => (
                            <LessonCard 
                              key={lesson.id} 
                              lesson={lesson} 
                              onClick={() => handleLessonClick(lesson)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="progresso" className="space-y-6">
                <Card className="glass-card border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Estatísticas de Progresso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {modules.map((module) => (
                      <div key={module.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white">{module.title}</span>
                          <span className="text-gray-400">{module.progress}%</span>
                        </div>
                        <Progress value={module.progress} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
