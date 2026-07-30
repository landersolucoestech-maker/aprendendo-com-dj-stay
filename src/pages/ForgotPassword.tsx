import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { requestPasswordReset } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const { error } = await requestPasswordReset(email);
    setIsLoading(false);

    if (error) {
      toast({ title: "Não foi possível enviar o email", description: getAuthErrorMessage(error), variant: "destructive" });
      return;
    }

    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 w-full max-w-md">
        <CardHeader className="text-center"><CardTitle className="text-2xl gradient-text">{isSubmitted ? "Email enviado" : "Recuperar senha"}</CardTitle><CardDescription className="text-gray-300">{isSubmitted ? "Caso o endereço exista, as instruções foram enviadas." : "Informe seu email para receber um link seguro."}</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 bg-white/5 border-white/20 text-white" required disabled={isLoading} /></div></div>
              <Button type="submit" className="w-full btn-neon" disabled={isLoading}>{isLoading ? "Enviando..." : "Enviar instruções"}</Button>
            </form>
          ) : (
            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="w-full border-white/20">Usar outro email</Button>
          )}
          <Link to="/login" className="flex items-center justify-center text-neon-purple"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao login</Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
