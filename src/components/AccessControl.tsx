
import { useHasAccess } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccessControlProps {
  children: React.ReactNode;
  feature?: string;
}

const AccessControl = ({ children, feature = "este conteúdo" }: AccessControlProps) => {
  const { hasAccess, subscription, isLoading } = useHasAccess();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="glass-card border-white/10">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-white mb-2">
                Acesso Restrito
              </CardTitle>
              <p className="text-gray-300">
                Para acessar {feature}, você precisa ter uma assinatura ativa.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {subscription ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Assinatura Encontrada</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Status: <span className="capitalize">{subscription.status}</span>
                  </p>
                  {subscription.expiry_date && (
                    <p className="text-gray-300 text-sm">
                      Expira em: {new Date(subscription.expiry_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <p className="text-yellow-300 text-sm mt-2">
                    Sua assinatura está {subscription.status === 'expired' ? 'expirada' : 'inativa'}. 
                    Renove para continuar acessando o conteúdo.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-400 font-semibold">Primeira Assinatura</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Você ainda não possui uma assinatura. Assine agora para ter acesso completo ao curso.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    O que você terá acesso:
                  </h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Todas as aulas em vídeo</li>
                    <li>• Materiais e samples exclusivos</li>
                    <li>• Suporte direto com o instrutor</li>
                    <li>• Certificado de conclusão</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => navigate('/pagamento')} 
                    className="flex-1 btn-neon"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {subscription ? 'Renovar Assinatura' : 'Assinar Agora'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                    className="border-white/20 bg-transparent hover:bg-white/10"
                  >
                    Voltar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
