
import { CheckCircle, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Verified = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-purple-900 flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            Email Verificado!
          </CardTitle>
          <CardDescription className="text-gray-300">
            Sua conta foi verificada com sucesso. Você já pode acessar todos os recursos da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
            <h3 className="text-green-400 font-semibold mb-2 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Conta Ativada
            </h3>
            <p className="text-sm text-gray-300">
              Sua conta está agora totalmente ativada e você pode começar a usar todos os recursos da nossa plataforma de produção de funk.
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/dashboard" className="block">
              <Button className="w-full btn-brand">
                <ArrowRight className="w-4 h-4 mr-2" />
                Ir para Dashboard
              </Button>
            </Link>
            
            <Link to="/login" className="block">
              <Button 
                variant="outline" 
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Fazer Login
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
              Bem-vindo à nossa plataforma! Agora você pode explorar todos os cursos e recursos disponíveis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verified;
