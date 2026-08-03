import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";

import { FavoriteToggleButton } from "@/components/student/FavoriteToggleButton";
import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useStudentFavorites } from "@/hooks/useStudentFavorites";
import { getErrorMessage } from "@/lib/error-message";

const typeLabel = {
  course: "Curso",
  digital_product: "Produto digital",
} as const;

const pageSize = 20;

const StudentFavorites = () => {
  const [page, setPage] = useState(0);
  const favoritesQuery = useStudentFavorites(pageSize, page * pageSize);
  const data = favoritesQuery.data;
  const favorites = data?.favorites ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoBack = page > 0;
  const canGoForward = (page + 1) * pageSize < total;

  useEffect(() => {
    if (data && page > 0 && page * pageSize >= data.total) {
      setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1));
    }
  }, [data, page]);

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          title="Favoritos"
          description="Cursos e produtos digitais que você salvou para acessar depois."
          action={
            <Button asChild variant="outline">
              <Link to="/marketplace">Explorar marketplace</Link>
            </Button>
          }
        />

        {favoritesQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando favoritos"
            description="Consultando os itens salvos nesta conta."
          />
        ) : favoritesQuery.error ? (
          <PageState
            variant="error"
            title="Favoritos indisponíveis"
            description={getErrorMessage(
              favoritesQuery.error,
              "Não foi possível carregar seus favoritos.",
            )}
          />
        ) : total === 0 ? (
          <PageState
            variant="empty"
            icon={Heart}
            title="Nenhum favorito salvo"
            description="Use o botão de coração no marketplace para montar sua lista."
            action={
              <Button asChild variant="context">
                <Link to="/marketplace">Ver catálogo</Link>
              </Button>
            }
          />
        ) : (
          <section className="space-y-5" aria-label="Itens favoritos">
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {total} favorito{total === 1 ? "" : "s"} salvo{total === 1 ? "" : "s"}
              </span>
              <span>
                Página {page + 1} de {totalPages}
              </span>
            </div>

            {favorites.length === 0 ? (
              <PageState
                variant="empty"
                icon={Heart}
                title="Nenhum favorito nesta página"
                description="A página será ajustada automaticamente após a atualização da lista."
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {favorites.map((favorite) => (
                  <Card key={favorite.id} variant="marketplace">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Badge variant="outline">{typeLabel[favorite.subject_type]}</Badge>
                          <CardTitle className="mt-3">{favorite.title}</CardTitle>
                          <CardDescription className="mt-2">
                            Item salvo na sua lista de favoritos.
                          </CardDescription>
                        </div>
                        <FavoriteToggleButton
                          subjectType={favorite.subject_type}
                          subjectId={favorite.subject_id}
                          compact
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="context" className="w-full">
                        <Link to={favorite.action_path}>Abrir</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <nav
              className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4"
              aria-label="Paginação de favoritos"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoBack || favoritesQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoForward || favoritesQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          </section>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentFavorites;
