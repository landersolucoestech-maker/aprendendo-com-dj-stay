
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, Award, Settings, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLessons } from "@/hooks/useLessons";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useToast } from "@/hooks/use-toast";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    joinDate: string;
    progress: number;
  };
}

const UserProfile = ({ user }: UserProfileProps) => {
  const { data: profile } = useUserProfile();
  const { data: allLessons } = useLessons();
  const { data: userProgress } = useUserProgress();
  const { toast } = useToast();

  // Verificar se todas as aulas foram concluídas
  const areAllLessonsCompleted = () => {
    if (!allLessons || !userProgress) return false;
    
    const completedLessons = userProgress.filter(progress => progress.completada);
    return completedLessons.length === allLessons.length;
  };

  const allLessonsCompleted = areAllLessonsCompleted();

  const handleCertificatesClick = () => {
    if (!allLessonsCompleted) {
      toast({
        title: "Acesso restrito",
        description: "Complete todas as aulas do curso para desbloquear os certificados.",
        variant: "destructive",
      });
      return;
    }
    
    // Aqui você pode adicionar a lógica para mostrar/baixar certificados
    toast({
      title: "Certificados disponíveis!",
      description: "Parabéns por concluir o curso completo!",
    });
  };

  return (
    <Card className="glass-card border-white/10 min-w-[320px] max-w-[380px]">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between w-full gap-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Avatar className="w-14 h-14 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-brand text-white">
                <User className="w-7 h-7" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-white text-base truncate">{user.name}</CardTitle>
              <CardDescription className="text-gray-400 text-sm truncate">{user.email}</CardDescription>
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
        <div>
          <p className="text-sm text-gray-400">Membro desde</p>
          <p className="text-white">{user.joinDate}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-2">Progresso Geral</p>
          <Progress value={user.progress} className="h-2" />
          <p className="text-xs text-gray-400 mt-1">{user.progress}% concluído</p>
        </div>
        
        {!allLessonsCompleted && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-center text-orange-400 text-sm">
              <Lock className="w-4 h-4 mr-2" />
              Complete todas as aulas para desbloquear os certificados
            </div>
          </div>
        )}
        
        <Button 
          className={`w-full btn-brand ${
            !allLessonsCompleted ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={handleCertificatesClick}
          disabled={!allLessonsCompleted}
        >
          {!allLessonsCompleted ? (
            <Lock className="w-4 h-4 mr-2" />
          ) : (
            <Award className="w-4 h-4 mr-2" />
          )}
          Certificados
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
