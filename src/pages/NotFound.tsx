import { Home } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";

const NotFound = () => (
  <main
    className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground"
    aria-labelledby="not-found-title"
  >
    <section className="max-w-md text-center">
      <p className="gradient-text text-7xl font-black" aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className="mt-4 text-3xl font-bold">
        Página não encontrada
      </h1>
      <p className="mt-3 text-muted-foreground">
        O endereço informado não existe ou não está mais disponível.
      </p>
      <Button asChild variant="brand" className="mt-6">
        <Link to="/">
          <Home className="h-4 w-4" aria-hidden="true" />
          Voltar ao início
        </Link>
      </Button>
    </section>
  </main>
);

export default NotFound;
