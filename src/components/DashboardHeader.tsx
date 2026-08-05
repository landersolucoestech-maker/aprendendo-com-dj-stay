import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  readonly userName: string;
}

const DashboardHeader = ({ userName }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      toast({ title: "Não foi possível sair", description: getAuthErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold gradient-text">Área do Aluno</h1><p className="text-gray-300 mt-1">Bem-vindo de volta, {userName}!</p></div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white" onClick={() => navigate("/editar-perfil")} aria-label="Editar perfil"><Settings className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white" onClick={handleLogout} aria-label="Sair"><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
