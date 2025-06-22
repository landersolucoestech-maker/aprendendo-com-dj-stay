import { CheckCircle, Download, Home, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
const PaymentSuccess = () => {
  return <div className="min-h-screen w-full bg-repeat flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white mb-2">
            Pagamento Realizado!
          </CardTitle>
          <CardDescription className="text-gray-300">
            Seu pagamento foi processado com sucesso. Você já pode acessar todo o conteúdo do curso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
            <h3 className="text-green-400 font-semibold mb-2">O que acontece agora?</h3>
            <ul className="text-sm text-gray-300 space-y-1 text-left">
              <li>• Acesso liberado a todos os módulos</li>
              <li>• Recebimento do certificado ao final</li>
              <li>• Suporte técnico disponível</li>
              <li>• Acesso vitalício ao conteúdo</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Link to="/cursos" className="block">
              <Button className="w-full btn-brand">
                <Receipt className="w-4 h-4 mr-2" />
                Acessar Meus Cursos
              </Button>
            </Link>
            <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-2" />
              Baixar Comprovante
            </Button>
            <Link to="/" className="block">
              <Button variant="secondary" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-400">
              Dúvidas? Entre em contato conosco pelo email: suporte@exemplo.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default PaymentSuccess;