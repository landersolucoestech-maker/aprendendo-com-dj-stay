import { Loader2 } from "lucide-react";

export const RouteLoadingFallback = () => (
  <main
    className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground"
    aria-busy="true"
    data-route-focus-deferred="true"
  >
    <div className="text-center" role="status" aria-live="polite">
      <Loader2
        className="mx-auto mb-4 h-10 w-10 animate-spin text-context"
        aria-hidden="true"
      />
      <p className="font-medium">Carregando conteúdo...</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Preparando apenas os recursos necessários para esta página.
      </p>
    </div>
  </main>
);
