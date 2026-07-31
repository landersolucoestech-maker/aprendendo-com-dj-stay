import { ArrowLeft, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { requestPasswordReset } from "@/auth/auth-service";
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

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsLoading(true);
    const { error } = await requestPasswordReset(email);
    setIsLoading(false);

    if (error) {
      const message = getAuthErrorMessage(error);
      setFormError(message);
      toast({
        title: "Não foi possível enviar o email",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitted(true);
  };

  const restart = () => {
    setFormError(null);
    setIsSubmitted(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="glass-card w-full max-w-md border-border">
        <CardHeader className="text-center">
          <CardTitle className="gradient-text text-2xl">
            {isSubmitted ? "Email enviado" : "Recuperar senha"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSubmitted
              ? "Caso o endereço exista, as instruções foram enviadas."
              : "Informe seu email para receber um link seguro."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSubmitted ? (
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
                    onChange={(event) => {
                      setFormError(null);
                      setEmail(event.target.value);
                    }}
                    className="border-input bg-background/40 pl-10 text-foreground"
                    required
                    disabled={isLoading}
                    aria-invalid={formError ? true : undefined}
                    aria-describedby={formError ? "password-reset-error" : undefined}
                  />
                </div>
              </div>

              {formError ? (
                <p
                  id="password-reset-error"
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground"
                >
                  {formError}
                </p>
              ) : null}

              <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar instruções"}
              </Button>
            </form>
          ) : (
            <div role="status" aria-live="polite" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada e também a pasta de spam.
              </p>
              <Button onClick={restart} variant="outline" className="w-full">
                Usar outro email
              </Button>
            </div>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center rounded-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
};

export default ForgotPassword;
