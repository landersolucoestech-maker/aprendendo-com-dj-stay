import { Loader2 } from "lucide-react";

export function AuthLoadingScreen() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background text-foreground"
      aria-busy="true"
    >
      <div className="text-center" role="status" aria-live="polite">
        <Loader2
          className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-light"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">Verificando sua sessão...</p>
      </div>
    </main>
  );
}
