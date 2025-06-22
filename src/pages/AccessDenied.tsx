
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-repeat flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-gray-300">
            Você não tem permissão para acessar esta página. Verifique se você está logado e possui as permissões necessárias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Link to="/" className="block">
              <Button className="w-full btn-brand">
                <Home className="w-4 h-4 mr-2" />
                Ir para Home
              </Button>
            </Link>
            <Link to="/login" className="block">
              <Button variant="secondary" className="w-full">
                Fazer Login
              </Button>
            </Link>
          </div>
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Se você acredita que isso é um erro, entre em contato com o suporte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
