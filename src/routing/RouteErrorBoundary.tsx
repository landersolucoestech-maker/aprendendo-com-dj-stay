import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";

type RouteErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

class RouteErrorBoundaryBase extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  override state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha não tratada na rota", error, info.componentStack);
  }

  override componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
    if (
      previousProps.resetKey !== this.props.resetKey &&
      this.state.error !== null
    ) {
      this.setState({ error: null });
    }
  }

  override render() {
    if (this.state.error === null) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <section
          className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-raised"
          role="alert"
          aria-labelledby="route-error-title"
        >
          <AlertTriangle
            className="mx-auto h-10 w-10 text-destructive"
            aria-hidden="true"
          />
          <h1 id="route-error-title" className="mt-4 text-2xl font-bold">
            Esta página não pôde ser carregada
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            O erro foi isolado nesta rota. Recarregue a página ou volte ao início.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="brand"
              onClick={() => window.location.reload()}
            >
              <RefreshCw aria-hidden="true" />
              Tentar novamente
            </Button>
            <Button asChild variant="outline">
              <a href="/">
                <Home aria-hidden="true" />
                Voltar ao início
              </a>
            </Button>
          </div>
        </section>
      </main>
    );
  }
}

export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}`;

  return (
    <RouteErrorBoundaryBase resetKey={resetKey}>
      {children}
    </RouteErrorBoundaryBase>
  );
};
