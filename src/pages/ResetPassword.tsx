import { Eye, EyeOff, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { updatePassword } from "@/auth/auth-service";
import { useAuth } from "@/auth/use-auth";
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
import { AuthLoadingScreen } from "@/routing/AuthLoadingScreen";

const ResetPassword = () => {
  const { session, status } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reportError = (title: string, message: string) => {
    setFormError(message);
    toast({ title, description: message, variant: "destructive" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      reportError("Senha inválida", "Use pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      reportError(
        "Senhas diferentes",
        "Confirme a mesma senha nos dois campos.",
      );
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(password);
    setIsLoading(false);

    if (error) {
      reportError(
        "Não foi possível redefinir a senha",
        getAuthErrorMessage(error),
      );
      return;
    }

    toast({
      title: "Senha atualizada",
      description: "Sua nova senha já está ativa.",
    });
    navigate("/portal", { replace: true });
  };

  if (status === "loading") {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/esqueceu-senha" replace />;
  }

  const passwordDescription = formError
    ? "new-password-requirements reset-password-error"
    : "new-password-requirements";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="glass-card w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="gradient-text text-2xl">Redefinir senha</CardTitle>
          <CardDescription className="text-muted-foreground">
            Cadastre uma nova senha para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={isLoading}
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setFormError(null);
                    setPassword(event.target.value);
                  }}
                  className="border-input bg-background/40 pl-10 pr-12 text-foreground"
                  minLength={8}
                  required
                  disabled={isLoading}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={passwordDescription}
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
              <p
                id="new-password-requirements"
                className="text-xs text-muted-foreground"
              >
                Use pelo menos 8 caracteres.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-confirmation">Confirmar senha</Label>
              <Input
                id="password-confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => {
                  setFormError(null);
                  setConfirmation(event.target.value);
                }}
                className="border-input bg-background/40 text-foreground"
                minLength={8}
                required
                disabled={isLoading}
                aria-invalid={formError ? true : undefined}
                aria-describedby={formError ? "reset-password-error" : undefined}
              />
            </div>

            {formError ? (
              <p
                id="reset-password-error"
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground"
              >
                {formError}
              </p>
            ) : null}

            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? "Atualizando..." : "Atualizar senha"}
            </Button>

            <Link
              to="/portal"
              className="block rounded-sm text-center text-sm font-medium text-primary hover:underline"
            >
              Cancelar
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ResetPassword;
