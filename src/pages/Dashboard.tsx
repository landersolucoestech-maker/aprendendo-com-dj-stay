import { Award, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getUserMetadataProfile, type UserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import DashboardHeader from "@/components/DashboardHeader";
import LessonGrid from "@/components/LessonGrid";
import ModuleProgress from "@/components/ModuleProgress";
import RecentActivities from "@/components/RecentActivities";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModules } from "@/hooks/useModules";
import {
  useProgressCalculation,
  type ModuleLessonWithProgress,
} from "@/hooks/useProgressCalculation";
import { getErrorMessage } from "@/lib/error-message";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const modulesQuery = useModules();
  const progressCalculation = useProgressCalculation(modulesQuery.data);

  if (!user) {
    return null;
  }

  if (modulesQuery.isLoading || progressCalculation.isLoading || progressCalculation.data === undefined) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  const loadingError = modulesQuery.error ?? progressCalculation.error;

  if (loadingError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <h2 className="text-2xl font-bold mb-4">Erro ao carregar dados</h2>
          <p className="text-gray-300 mb-4">
            {getErrorMessage(loadingError, "Não foi possível carregar o conteúdo do curso.")}
          </p>
          <Button onClick={() => window.location.reload()} className="btn-neon">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const modulesWithProgress = progressCalculation.data;
  let metadata: UserMetadataProfile;

  try {
    metadata = getUserMetadataProfile(user);
  } catch (error: unknown) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-lg px-4">
          <h2 className="text-2xl font-bold mb-4">Erro nos dados do perfil</h2>
          <p className="text-gray-300 mb-4">
            {getErrorMessage(error, "Não foi possível validar os dados do usuário autenticado.")}
          </p>
          <Button onClick={() => window.location.reload()} className="btn-neon">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const overallProgress =
    modulesWithProgress.length === 0
      ? 0
      : Math.round(
          modulesWithProgress.reduce((total, module) => total + module.progress, 0) /
            modulesWithProgress.length,
        );
  const profile = {
    name: metadata.fullName,
    email: user.email ?? "Email não informado",
    joinDate: new Date(user.created_at).toLocaleDateString("pt-BR"),
    progress: overallProgress,
  };

  const handleLessonClick = (lesson: ModuleLessonWithProgress) =>
    navigate(`/aula/${lesson.id}`);

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader userName={profile.name} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="space-y-6">
            <UserProfile user={profile} />
            <RecentActivities />
          </div>
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
              <TabsContent value="aulas">
                <LessonGrid modules={modulesWithProgress} onLessonClick={handleLessonClick} />
              </TabsContent>
              <TabsContent value="progresso">
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
