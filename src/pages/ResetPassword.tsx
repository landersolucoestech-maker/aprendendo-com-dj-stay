import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { updatePassword } from "@/auth/auth-service";
import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AuthLoadingScreen } from "@/routing/AuthLoadingScreen";

const ResetPassword = () => {
  const { session, status } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      toast({ title: "Senha inválida", description: "Use pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }

    if (password !== confirmation) {
      toast({ title: "Senhas diferentes", description: "Confirme a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      toast({ title: "Não foi possível redefinir a senha", description: getAuthErrorMessage(error), variant: "destructive" });
      return;
    }

    toast({ title: "Senha atualizada", description: "Sua nova senha já está ativa." });
    navigate("/dashboard", { replace: true });
  };

  if (status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/esqueceu-senha" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl gradient-text">Redefinir senha</CardTitle>
          <CardDescription className="text-gray-300">Cadastre uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10 bg-white/5 border-white/20 text-white" minLength={8} required />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="password-confirmation">Confirmar senha</Label><Input id="password-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="bg-white/5 border-white/20 text-white" minLength={8} required /></div>
            <Button type="submit" className="w-full btn-neon" disabled={isLoading}>{isLoading ? "Atualizando..." : "Atualizar senha"}</Button>
            <Link to="/dashboard" className="block text-center text-sm text-neon-purple">Cancelar</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
