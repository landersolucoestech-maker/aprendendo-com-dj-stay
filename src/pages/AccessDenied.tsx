import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const getReason = (state: unknown): string => {
  if (!state || typeof state !== "object" || !("reason" in state)) {
    return "Sua sessão não possui acesso a esta página.";
  }

  const reason = Reflect.get(state, "reason");
  return typeof reason === "string" && reason.trim().length > 0
    ? reason
    : "Sua sessão não possui acesso a esta página.";
};

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader>
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <CardTitle className="text-2xl">Acesso negado</CardTitle>
          <CardDescription className="text-gray-300">{getReason(location.state)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Link to={session ? "/portal" : "/"} className="block">
            <Button className="w-full btn-brand">
              <Home className="w-4 h-4 mr-2" />
              {session ? "Meu portal" : "Início"}
            </Button>
          </Link>
          {!session && (
            <Link to="/login" className="block">
              <Button variant="secondary" className="w-full">
                Fazer login
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
