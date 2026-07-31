import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const getReason = (state: unknown): string => {
  if (!state || typeof state !== "object" || !("reason" in state)) {
    return "Sua sessão não possui acesso a esta página.";
  }

  const reason = Reflect.get(state, "reason");
  return typeof reason === "string" && reason.trim().length > 0
    ? reason
    : "Sua sessão não possui acesso a esta página.";
};

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card
        className="glass-card w-full max-w-md border-border text-center"
        role="alert"
      >
        <CardHeader>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-10 w-10" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Acesso negado</CardTitle>
          <CardDescription className="text-muted-foreground">
            {getReason(location.state)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Button>

          <Button asChild variant="brand" className="w-full">
            <Link to={session ? "/portal" : "/"}>
              <Home className="h-4 w-4" aria-hidden="true" />
              {session ? "Meu portal" : "Início"}
            </Link>
          </Button>

          {!session ? (
            <Button asChild variant="secondary" className="w-full">
              <Link to="/login">Fazer login</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
};

export default AccessDenied;
