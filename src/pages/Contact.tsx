import { Headphones, LogIn, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function Contact() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const supportEmail = import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL as string | undefined;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div><p className="text-sm text-gray-400">Ajuda e atendimento</p><h1 className="text-4xl md:text-5xl font-bold gradient-text mt-2">Fale com nossa equipe</h1><p className="text-gray-300 mt-4">O atendimento é registrado por protocolo para preservar o histórico e acompanhar cada solicitação até a resolução.</p></div>
          <Card className="glass-card border-white/10 text-left">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Headphones className="w-5 h-5" />Central de suporte</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">Dúvidas sobre acesso, aulas, materiais, pagamentos, reembolsos ou certificados devem ser enviadas pela área autenticada.</p>
              <Button className="w-full" onClick={() => navigate(user ? "/suporte" : "/login")}>
                {user ? <Headphones className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                {user ? "Abrir central de suporte" : "Entrar para solicitar atendimento"}
              </Button>
              {supportEmail && <Button asChild variant="outline" className="w-full border-white/20 bg-transparent"><a href={`mailto:${supportEmail}`}><Mail className="w-4 h-4 mr-2" />Enviar e-mail</a></Button>}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
