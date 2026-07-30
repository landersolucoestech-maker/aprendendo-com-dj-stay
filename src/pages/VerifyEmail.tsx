import { useState } from "react";
import { CheckCircle, Home, Mail, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { resendSignupConfirmation } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function readEmailFromState(state: unknown): string {
  if (!state || typeof state !== "object" || !("email" in state)) {
    return "";
  }

  const email = state.email;
  return typeof email === "string" ? email.trim() : "";
}

const VerifyEmail = () => {
  const location = useLocation();
  const email = readEmailFromState(location.state);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    if (!email) {
      toast({ title: "Email não informado", description: "Volte ao cadastro e informe seu email novamente.", variant: "destructive" });
      return;
    }

    setIsResending(true);
    const { error } = await resendSignupConfirmation(email);
    setIsResending(false);

    if (error) {
      toast({ title: "Não foi possível reenviar", description: getAuthErrorMessage(error), variant: "destructive" });
      return;
    }

    toast({ title: "Email reenviado", description: "Verifique sua caixa de entrada e a pasta de spam." });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 max-w-md w-full text-center">
        <CardHeader>
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Mail className="w-10 h-10 text-blue-400" /></div>
          <CardTitle className="text-2xl">Verifique seu email</CardTitle>
          <CardDescription className="text-gray-300">Enviamos um link de confirmação{email ? ` para ${email}` : ""}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-left">
            <p className="text-blue-400 font-semibold flex items-center"><CheckCircle className="w-4 h-4 mr-2" />Próximos passos</p>
            <p className="text-sm text-gray-300 mt-2">Abra o link recebido. Depois da confirmação, você será direcionado novamente para a plataforma.</p>
          </div>
          <Button onClick={handleResendEmail} disabled={isResending || !email} className="w-full btn-brand">{isResending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}{isResending ? "Reenviando..." : "Reenviar email"}</Button>
          <Link to="/login" className="block"><Button variant="outline" className="w-full border-white/20">Ir para o login</Button></Link>
          <Link to="/" className="block"><Button variant="secondary" className="w-full"><Home className="w-4 h-4 mr-2" />Voltar ao início</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
