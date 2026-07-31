import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { signInWithPassword } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSafeReturnPath } from "@/routing/route-state";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      const message = "Informe email e senha.";
      setFormError(message);
      toast({
        title: "Dados incompletos",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { data, error } = await signInWithPassword(email, password);
    setIsLoading(false);

    if (error || !data.session) {
      const message = getAuthErrorMessage(error);
      setFormError(message);
      toast({
        title: "Não foi possível entrar",
        description: message,
        variant: "destructive",
      });
      return;
    }

    navigate(getSafeReturnPath(location.state), { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="glass-card w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="gradient-text text-2xl">Entrar</CardTitle>
          <CardDescription className="text-muted-foreground">
            Acesse sua conta para continuar aprendendo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={isLoading}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-input bg-background/40 pl-10 text-foreground"
                  required
                  disabled={isLoading}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? "login-error" : undefined}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="border-input bg-background/40 pl-10 pr-12 text-foreground"
                  required
                  disabled={isLoading}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? "login-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {formError ? (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground"
              >
                {formError}
              </p>
            ) : null}

            <Link
              to="/esqueceu-senha"
              className="block rounded-sm text-sm font-medium text-primary hover:underline"
            >
              Esqueceu a senha?
            </Link>

            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground">
            Não tem uma conta?{" "}
            <Link
              to="/matricule-se"
              className="rounded-sm font-medium text-primary hover:underline"
            >
              Matricule-se
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
