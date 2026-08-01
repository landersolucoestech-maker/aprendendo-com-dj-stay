import { Heart, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { FavoriteToggleButton } from "@/components/student/FavoriteToggleButton";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useStudentFavorites } from "@/hooks/useStudentFavorites";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const StudentFavorites = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const favoritesQuery = useStudentFavorites();
  const metadata = useMemo(() => {
    if (!user) return null;
    try {
      return getUserMetadataProfile(user);
    } catch {
      return null;
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!user) {
    return <PageState variant="loading" title="Validando conta" description="Confirmando a sessão do aluno." />;
  }

  const favorites = favoritesQuery.data?.favorites ?? [];

  return (
    <StudentPortalShell
      displayName={metadata?.fullName ?? user.email ?? "Aluno"}
      email={user.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    >
      <div className="space-y-8">
        <StudentSectionHeader
          title="Favoritos"
          description="Cursos e produtos digitais publicados que você salvou para acessar depois."
          action={
            <Button asChild variant="outline">
              <Link to="/marketplace">
                <ShoppingBag aria-hidden="true" />
                Explorar marketplace
              </Link>
            </Button>
          }
        />

        {favoritesQuery.isLoading ? (
          <PageState variant="loading" title="Carregando favoritos" description="Consultando somente os favoritos desta conta." />
        ) : favoritesQuery.error ? (
          <PageState
            variant="error"
            title="Favoritos indisponíveis"
            description={getErrorMessage(favoritesQuery.error, "Não foi possível carregar seus favoritos.")}
          />
        ) : favorites.length === 0 ? (
          <PageState
            variant="empty"
            icon={Heart}
            title="Nenhum favorito"
            description="Use o botão de coração nos produtos publicados para salvá-los aqui."
          />
        ) : (
          <section className="grid gap-4 md:grid-cols-2" aria-label="Itens favoritos">
            {favorites.map((favorite) => (
              <Card key={favorite.id} variant={favorite.subject_type === "course" ? "course" : "marketplace"}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant="outline">
                        {favorite.subject_type === "course" ? "Curso" : "Produto digital"}
                      </Badge>
                      <CardTitle className="mt-3">{favorite.title}</CardTitle>
                    </div>
                    <FavoriteToggleButton
                      subjectType={favorite.subject_type}
                      subjectId={favorite.subject_id}
                      compact
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    Salvo em {formatAppDateTime(favorite.created_at)}
                  </p>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={favorite.action_path}>Abrir</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </StudentPortalShell>
  );
};

export default StudentFavorites;
