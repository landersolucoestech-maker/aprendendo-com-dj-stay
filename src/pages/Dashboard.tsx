
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Award } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import UserProfile from "@/components/UserProfile";
import RecentActivities from "@/components/RecentActivities";
import ModuleProgress from "@/components/ModuleProgress";
import LessonGrid from "@/components/LessonGrid";
import DashboardHeader from "@/components/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState({
    name: 'Usuário',
    email: '',
    joinDate: '15/01/2024',
    progress: 65
  });

  const [currentLesson, setCurrentLesson] = useState(null);
  const navigate = useNavigate();

  // Dados mockados dos módulos
  const modules = [
    {
      id: 1,
      title: 'Fundamentos da Produção Musical',
      description: 'Aprenda os conceitos básicos da produção musical',
      progress: 75,
      lessons: [
        {
          id: 1,
          title: 'Introdução ao Curso',
          duration: '15:30',
          completed: true,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Bem-vindo ao curso de produção de funk!'
        },
        {
          id: 2,
          title: 'Configurando seu Home Studio',
          duration: '25:45',
          completed: true,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Aprenda a configurar seu estúdio em casa'
        },
        {
          id: 3,
          title: 'Conhecendo o FL Studio',
          duration: '30:20',
          completed: false,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Uma introdução completa ao FL Studio'
        }
      ]
    },
    {
      id: 2,
      title: 'Criação de Beats e Samples',
      description: 'Domine a arte de criar beats únicos',
      progress: 45,
      lessons: [
        {
          id: 4,
          title: 'Drum Patterns Essenciais',
          duration: '25:10',
          completed: false,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Domine os padrões rítmicos fundamentais do funk carioca'
        },
        {
          id: 5,
          title: 'Estrutura de um Beat',
          duration: '35:20',
          completed: false,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Entenda como estruturar um beat profissional'
        },
        {
          id: 6,
          title: 'Samples e Loops',
          duration: '28:15',
          completed: false,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Aprenda a usar samples e criar loops únicos'
        }
      ]
    },
    {
      id: 3,
      title: 'Mixagem e Masterização',
      description: 'Finalize suas produções com qualidade profissional',
      progress: 20,
      lessons: [
        {
          id: 7,
          title: 'Fundamentos da Mixagem',
          duration: '40:30',
          completed: false,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Aprenda os conceitos fundamentais da mixagem'
        },
        {
          id: 8,
          title: 'EQ e Compressão',
          duration: '32:45',
          completed: false,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          description: 'Domine o uso de equalizadores e compressores'
        }
      ]
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Atualizar dados do usuário com informações reais
      const userData = {
        name: session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || 'Usuário',
        email: session.user?.email || '',
        joinDate: new Date(session.user?.created_at || '').toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        progress: 65 // Mantém o progresso fixo por enquanto
      };

      setUser(userData);
    };

    checkAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      } else {
        const userData = {
          name: session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || 'Usuário',
          email: session.user?.email || '',
          joinDate: new Date(session.user?.created_at || '').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }),
          progress: 65
        };
        setUser(userData);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
