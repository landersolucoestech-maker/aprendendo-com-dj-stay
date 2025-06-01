
import { Mail, RefreshCw, Home, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const VerifyEmail = () => {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setIsResending(true);
    
    // Simular envio de email
    setTimeout(() => {
      setIsResending(false);
      toast({
        title: "Email reenviado!",
        description: "Verifique sua caixa de entrada e spam.",
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            Verifique seu Email
          </CardTitle>
          <CardDescription className="text-gray-300">
            Enviamos um link de verificação para seu email. Clique no link para ativar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Próximos passos
            </h3>
            <ol className="text-sm text-gray-300 space-y-1 text-left">
              <li>1. Verifique sua caixa de entrada</li>
              <li>2. Procure também na pasta de spam</li>
              <li>3. Clique no link de verificação</li>
              <li>4. Faça login na plataforma</li>
            </ol>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full btn-brand"
            >
              {isResending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {isResending ? "Reenviando..." : "Reenviar Email"}
            </Button>
            
            <Link to="/login" className="block">
              <Button 
                variant="outline" 
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Já verifiquei - Fazer Login
              </Button>
            </Link>
            
            <Link to="/" className="block">
              <Button variant="secondary" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Não recebeu o email? Verifique se o endereço está correto ou entre em contato conosco.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
