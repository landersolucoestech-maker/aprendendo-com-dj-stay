import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { signInWithPassword } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSafeReturnPath } from "@/routing/route-state";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast({ title: "Dados incompletos", description: "Informe email e senha.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { data, error } = await signInWithPassword(email, password);
    setIsLoading(false);

    if (error || !data.session) {
      toast({ title: "Não foi possível entrar", description: getAuthErrorMessage(error), variant: "destructive" });
      return;
    }

    navigate(getSafeReturnPath(location.state), { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="glass-card border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl gradient-text">Entrar</CardTitle>
            <CardDescription className="text-gray-300">Acesse sua conta para continuar aprendendo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 bg-white/5 border-white/20 text-white" required disabled={isLoading} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10 bg-white/5 border-white/20 text-white" required disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Link to="/esqueceu-senha" className="block text-sm text-neon-purple">Esqueceu a senha?</Link>
              <Button type="submit" className="w-full btn-neon" disabled={isLoading}>{isLoading ? "Entrando..." : "Entrar"}</Button>
            </form>
            <p className="text-center text-gray-300">Não tem uma conta? <Link to="/matricule-se" className="text-neon-purple font-medium">Matricule-se</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
