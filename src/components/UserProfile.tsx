
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { User, Award, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    joinDate: string;
    progress: number;
  };
}

const UserProfile = ({ user }: UserProfileProps) => {
  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-brand rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-white text-base">{user.name}</CardTitle>
            <CardDescription className="text-gray-400">{user.email}</CardDescription>
          </div>
          <Link to="/editar-perfil">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
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
        <Button className="w-full btn-brand">
          <Award className="w-4 h-4 mr-2" />
          Certificados
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
