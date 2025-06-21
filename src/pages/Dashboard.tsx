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
import { useModules } from "@/hooks/useModules";

const Dashboard = () => {
  const [user, setUser] = useState({
    name: 'Usuário',
    email: '',
    joinDate: '15/01/2024',
    progress: 65
  });

  const [currentLesson, setCurrentLesson] = useState(null);
  const navigate = useNavigate();
  const { modules, isLoading, error } = useModules();

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

  // Convert database modules to the format expected by components
  const formattedModules = modules.map(module => ({
    id: module.id,
    title: module.title || 'Módulo sem título',
    description: module.description || 'Descrição não disponível',
    progress: 0, // Calculate based on completed lessons if needed
    lessons: module.lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title || 'Lição sem título',
      duration: '15:30', // Default duration - you might want to add this to your database
      completed: false, // Check progress table if needed
      videoUrl: lesson.video_url || '',
      description: lesson.content || 'Descrição não disponível'
    }))
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          <p className="mt-4">Carregando módulos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Erro ao carregar módulos: {error}</p>
        </div>
      </div>
    );
  }

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
                  <LessonGrid modules={formattedModules} onLessonClick={handleLessonClick} />
                )}
              </TabsContent>

              <TabsContent value="progresso" className="space-y-6">
                <ModuleProgress modules={formattedModules} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
