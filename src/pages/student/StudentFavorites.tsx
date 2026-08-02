import { Heart } from "lucide-react";
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

const StudentFavorites = () => {
  const favoritesQuery = useStudentFavorites();
  const favorites = favoritesQuery.data ?? [];

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
        ) : favorites.length === 0 ? (
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
          <section className="grid gap-5 lg:grid-cols-2" aria-label="Itens favoritos">
            {favorites.map((favorite) => (
              <Card key={favorite.id} variant="marketplace">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant="outline">{typeLabel[favorite.item_type]}</Badge>
                      <CardTitle className="mt-3">{favorite.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {favorite.description ?? "Item salvo na sua lista de favoritos."}
                      </CardDescription>
                    </div>
                    <FavoriteToggleButton
                      subjectType={favorite.item_type}
                      subjectId={favorite.item_id}
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
          </section>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentFavorites;
