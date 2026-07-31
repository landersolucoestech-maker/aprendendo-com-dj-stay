import { CheckCircle, Home, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { getAuthErrorMessage } from "@/auth/auth-errors";
import { resendSignupConfirmation } from "@/auth/auth-service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setFeedback(null);

    if (!email) {
      const message = "Volte ao cadastro e informe seu email novamente.";
      setFeedback({ type: "error", message });
      toast({
        title: "Email não informado",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    const { error } = await resendSignupConfirmation(email);
    setIsResending(false);

    if (error) {
      const message = getAuthErrorMessage(error);
      setFeedback({ type: "error", message });
      toast({
        title: "Não foi possível reenviar",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const message = "Verifique sua caixa de entrada e a pasta de spam.";
    setFeedback({ type: "success", message });
    toast({ title: "Email reenviado", description: message });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card
        className="glass-card w-full max-w-md border-border text-center"
        aria-busy={isResending}
      >
        <CardHeader>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Mail className="h-10 w-10" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Verifique seu email</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enviamos um link de confirmação{email ? ` para ${email}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-4 text-left">
            <p className="flex items-center font-semibold text-primary">
              <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Próximos passos
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra o link recebido. Depois da confirmação, você será direcionado
              novamente para a plataforma.
            </p>
          </div>

          {feedback ? (
            <p
              role={feedback.type === "error" ? "alert" : "status"}
              aria-live={feedback.type === "error" ? "assertive" : "polite"}
              className={
                feedback.type === "error"
                  ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground"
                  : "rounded-lg border border-emerald-500/30 bg-emerald-950/60 p-3 text-sm text-emerald-100"
              }
            >
              {feedback.message}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={handleResendEmail}
            disabled={isResending || !email}
            variant="brand"
            className="w-full"
          >
            {isResending ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            {isResending ? "Reenviando..." : "Reenviar email"}
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Ir para o login</Link>
          </Button>

          <Button asChild variant="secondary" className="w-full">
            <Link to="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Voltar ao início
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default VerifyEmail;
