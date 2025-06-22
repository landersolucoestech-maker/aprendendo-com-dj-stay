
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
import { useLessons } from "@/hooks/useLessons";
import { useModules } from "@/hooks/useModules";
import { useUserProgress } from "@/hooks/useUserProgress";

const Dashboard = () => {
  const [user, setUser] = useState({
    name: 'Usuário',
    email: '',
    joinDate: '15/01/2024',
    progress: 65
  });

  const [currentLesson, setCurrentLesson] = useState(null);
  const navigate = useNavigate();

  // Usar os hooks para buscar dados do Supabase
  const { data: lessons, isLoading: lessonsLoading, error: lessonsError } = useLessons();
  const { data: modules, isLoading: modulesLoading, error: modulesError } = useModules();
  const { data: userProgress } = useUserProgress();

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

  // Integrar o progresso do usuário com os módulos
  const modulesWithProgress = modules?.map(module => {
    // Calcular progresso baseado nas aulas completadas
    const completedLessons = module.lessons.filter(lesson => {
      const progress = userProgress?.find(p => p.aula_id === lesson.id);
      return progress?.completada || false;
    });
    
    const progressPercentage = module.lessons.length > 0 
      ? Math.round((completedLessons.length / module.lessons.length) * 100)
      : 0;

    return {
      ...module,
      description: module.description || 'Descrição não disponível', // Ensure description is always a string
      progress: progressPercentage,
      lessons: module.lessons.map(lesson => ({
        ...lesson,
        completed: userProgress?.find(p => p.aula_id === lesson.id)?.completada || false
      }))
    };
  }) || [];

  const recentActivities = [
    { activity: 'Completou a lição "Estrutura de um Beat"', time: '2 horas atrás' },
    { activity: 'Baixou samples do Módulo 2', time: '1 dia atrás' },
    { activity: 'Assistiu "Introdução ao FL Studio"', time: '3 dias atrás' },
  ];

  const handleLessonClick = (lesson) => {
    navigate(`/aula/${lesson.id}`);
  };

  // Mostrar loading enquanto os dados são carregados
  if (lessonsLoading || modulesLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se houver problemas ao carregar os dados
  if (lessonsError || modulesError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Erro ao carregar dados</h2>
          <p className="text-gray-300 mb-4">
            {lessonsError?.message || modulesError?.message || 'Erro desconhecido'}
          </p>
          <Button onClick={() => window.location.reload()} className="btn-neon">
            Tentar Novamente
          </Button>
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
                  <LessonGrid modules={modulesWithProgress} onLessonClick={handleLessonClick} />
                )}
              </TabsContent>

              <TabsContent value="progresso" className="space-y-6">
                <ModuleProgress modules={modulesWithProgress} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
