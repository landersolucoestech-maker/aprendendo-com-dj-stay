import { ArrowRight, CheckCircle, Home } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { useAuth } from "@/auth/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSafeInternalPath,
  toSafeReturnLocation,
} from "@/routing/route-state";

const Verified = () => {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const returnPath = getSafeInternalPath(searchParams.get("return"));
  const primaryPath = session ? returnPath : "/login";
  const primaryLabel = session ? "Continuar" : "Fazer login";
  const primaryState = session
    ? undefined
    : { from: toSafeReturnLocation(returnPath) };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card
        className="glass-card w-full max-w-md border-border text-center"
        role="status"
        aria-live="polite"
      >
        <CardHeader>
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckCircle className="h-10 w-10" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Email confirmado</CardTitle>
          <CardDescription className="text-muted-foreground">
            A confirmação foi processada pelo Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant="brand" className="w-full">
            <Link to={primaryPath} state={primaryState}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {primaryLabel}
            </Link>
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

export default Verified;
