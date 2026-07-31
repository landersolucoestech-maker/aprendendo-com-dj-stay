import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { signUpWithPassword } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const setField = <Key extends keyof RegistrationForm>(
    key: Key,
    value: RegistrationForm[Key],
  ) => {
    setFormError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const reportError = (title: string, message: string) => {
    setFormError(message);
    toast({ title, description: message, variant: "destructive" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.email.trim()) {
      reportError("Dados incompletos", "Informe nome e email.");
      return;
    }

    if (form.password.length < 8 || form.password !== form.confirmation) {
      reportError(
        "Senha inválida",
        "Use pelo menos 8 caracteres e confirme a mesma senha.",
      );
      return;
    }

    if (!form.acceptedTerms) {
      reportError(
        "Termos obrigatórios",
        "Aceite os termos de uso e a política de privacidade.",
      );
      return;
    }

    setIsLoading(true);
    const { data, error } = await signUpWithPassword({
      email: form.email,
      password: form.password,
      fullName: form.name,
      phone: form.phone,
    });
    setIsLoading(false);

    if (error || !data.user) {
      reportError("Não foi possível criar a conta", getAuthErrorMessage(error));
      return;
    }

    if (data.session) {
      navigate("/portal", { replace: true });
      return;
    }

    navigate("/verificar-email", {
      replace: true,
      state: { email: form.email.trim().toLowerCase() },
    });
  };

  const genericErrorDescription = formError ? "registration-error" : undefined;
  const passwordDescription = formError
    ? "password-requirements registration-error"
    : "password-requirements";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="glass-card w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="gradient-text text-2xl">Matricule-se</CardTitle>
          <CardDescription className="text-muted-foreground">
            Crie sua conta para acessar a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={isLoading}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  className="border-input bg-background/40 pl-10 text-foreground"
                  required
                  disabled={isLoading}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={genericErrorDescription}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="border-input bg-background/40 pl-10 text-foreground"
                  required
                  disabled={isLoading}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={genericErrorDescription}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="border-input bg-background/40 pl-10 text-foreground"
                  disabled={isLoading}
                  aria-describedby={genericErrorDescription}
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setField("password", event.target.value)}
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
              <p id="password-requirements" className="text-xs text-muted-foreground">
                Use pelo menos 8 caracteres.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmar senha</Label>
              <Input
                id="confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                value={form.confirmation}
                onChange={(event) => setField("confirmation", event.target.value)}
                className="border-input bg-background/40 text-foreground"
                required
                disabled={isLoading}
                aria-invalid={formError ? true : undefined}
                aria-describedby={genericErrorDescription}
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={form.acceptedTerms}
                onCheckedChange={(checked) =>
                  setField("acceptedTerms", checked === true)
                }
                disabled={isLoading}
                aria-invalid={formError ? true : undefined}
                aria-describedby={genericErrorDescription}
              />
              <Label htmlFor="terms" className="text-sm leading-5 text-muted-foreground">
                Aceito os termos de uso e a política de privacidade.
              </Label>
            </div>

            {formError ? (
              <p
                id="registration-error"
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground"
              >
                {formError}
              </p>
            ) : null}

            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-muted-foreground">
            Já possui conta?{" "}
            <Link
              to="/login"
              className="rounded-sm font-medium text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default Register;
