import { Award, BookOpen } from "lucide-react";
import { useNavigate } from "react-router";

import { getUserMetadataProfile, type UserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import DashboardHeader from "@/components/DashboardHeader";
import LessonGrid from "@/components/LessonGrid";
import ModuleProgress from "@/components/ModuleProgress";
import RecentActivities from "@/components/RecentActivities";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveEnrollments, useCourseAccess } from "@/hooks/useCourseAccess";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { useModules } from "@/hooks/useModules";
import {
  useProgressCalculation,
  type ModuleLessonWithProgress,
} from "@/hooks/useProgressCalculation";
import { calculateOverallCourseProgress } from "@/lib/course-progress";
import { formatAppDate } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleQuery = useCurrentRole();
  const accessQuery = useCourseAccess();
  const modulesQuery = useModules();
  const progressCalculation = useProgressCalculation(modulesQuery.data);

  if (!user) {
    return null;
  }

  if (
    roleQuery.isLoading ||
    accessQuery.isLoading ||
    modulesQuery.isLoading ||
    progressCalculation.isLoading ||
    progressCalculation.data === undefined
  ) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  const loadingError =
    roleQuery.error ?? accessQuery.error ?? modulesQuery.error ?? progressCalculation.error;

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
  const activeEnrollments = accessQuery.data ? getActiveEnrollments(accessQuery.data) : [];
  const isAdministrator = roleQuery.data?.role === "administrador_proprietario";

  if (!isAdministrator && activeEnrollments.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center max-w-xl">
          <h2 className="text-2xl font-bold mb-4">Matrícula ativa necessária</h2>
          <p className="text-gray-300 mb-6">
            O conteúdo do curso permanece bloqueado até que uma matrícula ativa seja confirmada.
          </p>
          <Button onClick={() => navigate("/pagamento-sucesso")} className="btn-neon">
            Verificar acesso
          </Button>
        </div>
      </div>
    );
  }

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

  const overallProgress = calculateOverallCourseProgress(modulesWithProgress);
  const profile = {
    name: metadata.fullName,
    email: user.email ?? "Email não informado",
    joinDate: formatAppDate(user.created_at, { dateStyle: "short" }),
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
