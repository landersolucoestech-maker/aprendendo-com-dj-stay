import { Award, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLessons } from "@/hooks/useLessons";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserProgress } from "@/hooks/useUserProgress";
import { getErrorMessage } from "@/lib/error-message";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    joinDate: string;
    progress: number;
  };
}

const UserProfile = ({ user }: UserProfileProps) => {
  const profileQuery = useUserProfile();
  const lessonsQuery = useLessons();
  const progressQuery = useUserProgress();
  const { toast } = useToast();
  const loadingError = profileQuery.error ?? lessonsQuery.error ?? progressQuery.error;
  const queriesLoading = profileQuery.isLoading || lessonsQuery.isLoading || progressQuery.isLoading;
  const allLessonsCompleted =
    lessonsQuery.data !== undefined &&
    progressQuery.data !== undefined &&
    lessonsQuery.data.length > 0 &&
    lessonsQuery.data.every((lesson) =>
      progressQuery.data.some(
        (progress) => progress.aula_id === lesson.id && progress.completada,
      ),
    );

  const handleCertificatesClick = () => {
    if (loadingError) {
      toast({
        title: "Não foi possível validar o acesso",
        description: getErrorMessage(
          loadingError,
          "Não foi possível consultar seu progresso neste momento.",
        ),
        variant: "destructive",
      });
      return;
    }

    if (queriesLoading) {
      toast({
        title: "Progresso em carregamento",
        description: "Aguarde a validação das aulas concluídas.",
      });
      return;
    }

    if (!allLessonsCompleted) {
      toast({
        title: "Acesso restrito",
        description: "Complete todas as aulas disponíveis para desbloquear os certificados.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Conclusão validada",
      description: "A emissão de certificados será implementada na fase acadêmica correspondente.",
    });
  };

  return (
    <Card className="glass-card border-white/10 min-w-[320px] max-w-[380px]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Avatar className="w-14 h-14 flex-shrink-0">
              {profileQuery.data?.avatar_url ? <AvatarImage src={profileQuery.data.avatar_url} /> : null}
              <AvatarFallback className="bg-gradient-brand text-white">
                <User className="w-7 h-7" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-white text-base truncate">{user.name}</CardTitle>
              <CardDescription className="text-gray-400 text-sm truncate">
                {user.email}
              </CardDescription>
            </div>
          </div>
          <Link to="/editar-perfil" className="flex-shrink-0">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white h-8 w-8">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingError && (
          <p className="text-xs text-red-300">
            {getErrorMessage(loadingError, "Não foi possível carregar todos os dados do perfil.")}
          </p>
        )}
        <div>
          <p className="text-sm text-gray-400">Membro desde</p>
          <p className="text-white">{user.joinDate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-2">Progresso Geral</p>
          <Progress value={user.progress} className="h-2" />
          <p className="text-xs text-gray-400 mt-1">{user.progress}% concluído</p>
        </div>

        <Button className="w-full btn-brand" onClick={handleCertificatesClick}>
          <Award className="w-4 h-4 mr-2" />
          Certificados
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
