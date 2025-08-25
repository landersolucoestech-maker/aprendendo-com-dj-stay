
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
import { useNavigate } from "react-router-dom";
import { useLessons } from "@/hooks/useLessons";
import { useModules } from "@/hooks/useModules";
import { useProgressCalculation } from "@/hooks/useProgressCalculation";

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
  
  // Usar o hook para calcular progresso
  const modulesWithProgress = useProgressCalculation(modules);

  console.log('Dashboard - Módulos com progresso:', modulesWithProgress);
  console.log('Dashboard - Dados brutos dos módulos:', modules);
  console.log('Dashboard - Aulas:', lessons);

  // Dados estáticos do usuário (sem autenticação)
  useEffect(() => {
    const userData = {
      name: 'Usuário Demo',
      email: 'demo@exemplo.com',
      joinDate: '15/01/2024',
      progress: 65
    };
    setUser(userData);
  }, []);

  const handleLessonClick = (lesson) => {
    console.log('Clicou na aula:', lesson);
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
    console.error('Erro no Dashboard:', { lessonsError, modulesError });
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
            <RecentActivities />
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
