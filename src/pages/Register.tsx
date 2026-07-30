import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { signUpWithPassword } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RegistrationForm {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
  readonly confirmation: string;
  readonly acceptedTerms: boolean;
}

const INITIAL_FORM: RegistrationForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmation: "",
  acceptedTerms: false,
};

const Register = () => {
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const setField = <Key extends keyof RegistrationForm>(key: Key, value: RegistrationForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Dados incompletos", description: "Informe nome e email.", variant: "destructive" });
      return;
    }

    if (form.password.length < 8 || form.password !== form.confirmation) {
      toast({ title: "Senha inválida", description: "Use pelo menos 8 caracteres e confirme a mesma senha.", variant: "destructive" });
      return;
    }

    if (!form.acceptedTerms) {
      toast({ title: "Termos obrigatórios", description: "Aceite os termos e a política de privacidade.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { data, error } = await signUpWithPassword({ email: form.email, password: form.password, fullName: form.name, phone: form.phone });
    setIsLoading(false);

    if (error || !data.user) {
      toast({ title: "Não foi possível criar a conta", description: getAuthErrorMessage(error), variant: "destructive" });
      return;
    }

    if (data.session) {
      navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/verificar-email", { replace: true, state: { email: form.email.trim().toLowerCase() } });
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="glass-card border-white/10 w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl gradient-text">Matricule-se</CardTitle>
          <CardDescription className="text-gray-300">Crie sua conta para acessar a plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input id="name" value={form.name} onChange={(event) => setField("name", event.target.value)} className="pl-10 bg-white/5 border-white/20 text-white" required disabled={isLoading} /></div></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input id="email" type="email" value={form.email} onChange={(event) => setField("email", event.target.value)} className="pl-10 bg-white/5 border-white/20 text-white" required disabled={isLoading} /></div></div>
            <div className="space-y-2"><Label htmlFor="phone">Telefone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input id="phone" type="tel" value={form.phone} onChange={(event) => setField("phone", event.target.value)} className="pl-10 bg-white/5 border-white/20 text-white" disabled={isLoading} /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setField("password", event.target.value)} className="pl-10 pr-10 bg-white/5 border-white/20 text-white" minLength={8} required disabled={isLoading} /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            <div className="space-y-2"><Label htmlFor="confirmation">Confirmar senha</Label><Input id="confirmation" type="password" value={form.confirmation} onChange={(event) => setField("confirmation", event.target.value)} className="bg-white/5 border-white/20 text-white" required disabled={isLoading} /></div>
            <div className="flex items-start gap-2"><Checkbox id="terms" checked={form.acceptedTerms} onCheckedChange={(checked) => setField("acceptedTerms", checked === true)} /><Label htmlFor="terms" className="text-sm text-gray-300">Aceito os termos de uso e a política de privacidade.</Label></div>
            <Button type="submit" className="w-full btn-neon" disabled={isLoading}>{isLoading ? "Criando conta..." : "Criar conta"}</Button>
          </form>
          <p className="text-center text-gray-300 mt-6">Já possui conta? <Link to="/login" className="text-neon-purple font-medium">Entrar</Link></p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
