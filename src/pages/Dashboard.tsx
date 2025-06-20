
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

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  description: string;
}

const Dashboard = () => {
  const [user, setUser] = useState({
    name: 'Usuário',
    email: '',
    joinDate: '15/01/2024',
    progress: 65
  });

  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const navigate = useNavigate();
  const { data: modules = [], isLoading, error } = useModules();

  console.log('🎯 Dashboard - Estado atual:', {
    modules,
    isLoading,
    error,
    modulesCount: modules.length
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

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
    };

    checkAuth();

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

  const handleLessonClick = (lesson: Lesson) => {
    setCurrentLesson(lesson);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">🔄 Carregando módulos...</h1>
          <p className="text-gray-300">Aguarde enquanto buscamos seus cursos</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('❌ Erro detalhado:', error);
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">❌ Erro ao carregar módulos</h1>
          <p className="text-gray-300 mb-4">
            Erro: {error.message || 'Erro desconhecido'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="btn-neon"
          >
            🔄 Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <DashboardHeader userName={user.name} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">📚 Nenhum módulo encontrado</h1>
            <p className="text-gray-300 mb-6">
              Parece que ainda não há módulos cadastrados no sistema.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="btn-neon"
            >
              🔄 Recarregar Página
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader userName={user.name} />

      <div className="container mx-auto px-4 py-8">
        {/* Debug Info */}
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-bold mb-2">🔍 Debug Info</h3>
          <p>📊 Total de módulos: {modules.length}</p>
          <p>📖 Total de lições: {modules.reduce((total, module) => total + module.lessons.length, 0)}</p>
        </div>

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
                  Aulas ({modules.reduce((total, module) => total + module.lessons.length, 0)})
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
