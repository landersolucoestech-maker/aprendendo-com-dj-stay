
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Award } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import UserProfile from "@/components/UserProfile";
import RecentActivities from "@/components/RecentActivities";
import ModuleProgress from "@/components/ModuleProgress";
import LessonGrid from "@/components/LessonGrid";
import DashboardHeader from "@/components/DashboardHeader";

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
      <DashboardHeader userName={user.name} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <UserProfile user={user} />
            <RecentActivities activities={recentActivities} />
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
                  <LessonGrid modules={modules} onLessonClick={handleLessonClick} />
                )}
              </TabsContent>

              <TabsContent value="progresso" className="space-y-6">
                <ModuleProgress modules={modules} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
