
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHasAccess } from "@/hooks/useSubscription";
import { useEffect } from "react";

const Payment = () => {
  const navigate = useNavigate();
  const { hasAccess, subscription, isLoading } = useHasAccess();

  useEffect(() => {
    if (!isLoading && hasAccess) {
      navigate('/dashboard');
    }
  }, [hasAccess, isLoading, navigate]);

  const handlePayment = async () => {
    // TODO: Implementar integração com sistema de pagamento (Stripe, etc.)
    alert('Integração com sistema de pagamento será implementada em breve!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-6 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Plano de Assinatura */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white text-center">
                  Curso FunkBeats Academy
                </CardTitle>
                <p className="text-gray-300 text-center">
                  Acesso Completo ao Curso
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">
                    R$ 297
                  </div>
                  <p className="text-gray-400">pagamento único</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Mais de 20 aulas em vídeo</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Samples e loops exclusivos</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Projetos FL Studio</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Suporte direto com instrutor</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Certificado de conclusão</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">Acesso vitalício</span>
                  </div>
                </div>

                <Button 
                  onClick={handlePayment}
                  className="w-full btn-neon text-lg py-6"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Comprar Agora
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Pagamento seguro processado via PIX, cartão de crédito ou boleto
                </p>
              </CardContent>
            </Card>

            {/* Informações do Status Atual */}
            <div className="space-y-6">
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Status da Sua Conta</CardTitle>
                </CardHeader>
                <CardContent>
                  {subscription ? (
                    <div className="space-y-4">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <p className="text-yellow-400 font-semibold mb-2">
                          Assinatura {subscription.status === 'expired' ? 'Expirada' : 'Inativa'}
                        </p>
                        <div className="text-sm text-gray-300 space-y-1">
                          <p>Status: <span className="capitalize">{subscription.status}</span></p>
                          {subscription.payment_date && (
                            <p>Último pagamento: {new Date(subscription.payment_date).toLocaleDateString('pt-BR')}</p>
                          )}
                          {subscription.expiry_date && (
                            <p>Data de expiração: {new Date(subscription.expiry_date).toLocaleDateString('pt-BR')}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Renove sua assinatura para continuar tendo acesso a todo o conteúdo do curso.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-400 font-semibold mb-2">
                          Primeira Compra
                        </p>
                        <p className="text-sm text-gray-300">
                          Você ainda não possui acesso ao curso. Adquira agora e comece a aprender!
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Sobre o Curso</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300 text-sm space-y-2">
                  <p>
                    O FunkBeats Academy é o curso mais completo de produção de funk carioca do Brasil.
                  </p>
                  <p>
                    Aprenda desde os fundamentos até técnicas avançadas de produção, mixagem e masterização.
                  </p>
                  <p>
                    Ministrado por profissionais da indústria com anos de experiência no mercado.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
