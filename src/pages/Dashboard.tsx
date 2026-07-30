import { Award, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { getUserMetadataProfile } from "@/auth/user-metadata";
import DashboardHeader from "@/components/DashboardHeader";
import LessonGrid from "@/components/LessonGrid";
import ModuleProgress from "@/components/ModuleProgress";
import RecentActivities from "@/components/RecentActivities";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLessons } from "@/hooks/useLessons";
import { useModules, type ModuleLesson } from "@/hooks/useModules";
import { useProgressCalculation } from "@/hooks/useProgressCalculation";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: lessons, isLoading: lessonsLoading, error: lessonsError } = useLessons();
  const { data: modules, isLoading: modulesLoading, error: modulesError } = useModules();
  const modulesWithProgress = useProgressCalculation(modules);

  if (!user) {
    return null;
  }

  const metadata = getUserMetadataProfile(user);
  const overallProgress = modulesWithProgress.length > 0
    ? Math.round(modulesWithProgress.reduce((total, module) => total + module.progress, 0) / modulesWithProgress.length)
    : 0;
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "Não informado";
  const profile = {
    name: metadata.fullName,
    email: user.email ?? "",
    joinDate: createdAt,
    progress: overallProgress,
  };

  const handleLessonClick = (lesson: ModuleLesson) => navigate(`/aula/${lesson.id}`);

  if (lessonsLoading || modulesLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" /><p className="text-gray-300">Carregando conteúdo...</p></div></div>;
  }

  if (lessonsError || modulesError) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Erro ao carregar dados</h2><p className="text-gray-300 mb-4">{lessonsError?.message ?? modulesError?.message ?? "Erro desconhecido"}</p><Button onClick={() => window.location.reload()} className="btn-neon">Tentar novamente</Button></div></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader userName={profile.name} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="space-y-6"><UserProfile user={profile} /><RecentActivities /></div>
          <div className="lg:col-span-3">
            <Tabs defaultValue="aulas" className="space-y-6">
              <TabsList className="bg-white/10 border-white/20"><TabsTrigger value="aulas" className="data-[state=active]:bg-white/20"><BookOpen className="w-4 h-4 mr-2" />Aulas</TabsTrigger><TabsTrigger value="progresso" className="data-[state=active]:bg-white/20"><Award className="w-4 h-4 mr-2" />Progresso</TabsTrigger></TabsList>
              <TabsContent value="aulas"><LessonGrid modules={modulesWithProgress} onLessonClick={handleLessonClick} /></TabsContent>
              <TabsContent value="progresso"><ModuleProgress modules={modulesWithProgress} /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
