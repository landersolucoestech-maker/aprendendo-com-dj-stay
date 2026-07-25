import { FormEvent, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/platform";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.user) throw new Error("A sessão não foi criada.");

      const requestedRoute = (location.state as { from?: string } | null)?.from;
      if (requestedRoute) {
        navigate(requestedRoute, { replace: true });
        return;
      }

      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", data.user.id);
      const roleNames = (roles ?? []).map((entry: { role: string }) => entry.role);
      if (roleNames.some((role: string) => ["owner", "admin", "instructor"].includes(role))) navigate("/instrutor", { replace: true });
      else if (roleNames.includes("support")) navigate("/instrutor/atendimento", { replace: true });
      else navigate("/dashboard", { replace: true });
      toast({ title: "Login realizado", description: "Sua sessão foi iniciada com segurança." });
    } catch (error) {
      const message = error instanceof Error && error.message.includes("Invalid login credentials") ? "E-mail ou senha incorretos." : error instanceof Error ? error.message : "Não foi possível entrar.";
      toast({ title: "Erro no login", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 w-full max-w-md">
        <CardHeader className="text-center"><CardTitle className="text-2xl gradient-text">Entrar</CardTitle><CardDescription className="text-gray-400">Acesse seus cursos ou o painel de gestão.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="login-email">E-mail</Label><div className="relative"><Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><Input id="login-email" type="email" className="pl-9" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div></div>
            <div className="space-y-2"><Label htmlFor="login-password">Senha</Label><div className="relative"><Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><Input id="login-password" type={showPassword ? "text" : "password"} className="pl-9 pr-10" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <div className="flex justify-end"><Link to="/esqueceu-senha" className="text-sm text-purple-400 hover:text-purple-300">Esqueci minha senha</Link></div>
            <Button className="w-full" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
          </form>
          <p className="text-sm text-gray-400 text-center mt-6">Ainda não possui conta? <Link to="/matricule-se" className="text-purple-400 hover:text-purple-300">Criar conta</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
