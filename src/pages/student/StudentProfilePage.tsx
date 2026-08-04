import { useMemo } from "react";
import { UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const formatDateTime = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "Não definido" });

const StudentProfilePage = () => {
  const { user } = useAuth();
  const profileQuery = useUserProfile();
  const metadata = useMemo(() => {
    if (!user) return null;

    try {
      return getUserMetadataProfile(user);
    } catch {
      return null;
    }
  }, [user]);

  if (profileQuery.isLoading || !user) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="loading"
          title="Carregando perfil"
          description="Consultando dados da conta e avatar privado."
        />
      </StudentPortalPageFrame>
    );
  }

  if (profileQuery.error) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="error"
          title="Perfil indisponível"
          description={getErrorMessage(
            profileQuery.error,
            "Não foi possível carregar o perfil.",
          )}
        />
      </StudentPortalPageFrame>
    );
  }

  return (
    <StudentPortalPageFrame>
      <div className="space-y-6">
        <StudentSectionHeader
          title="Perfil"
          description="Dados da conta autenticada e avatar privado."
        />

        <Card variant="course">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            <Avatar className="h-24 w-24 border border-course/30">
              {profileQuery.data?.avatarSignedUrl ? (
                <AvatarImage
                  src={profileQuery.data.avatarSignedUrl}
                  alt="Avatar do aluno"
                />
              ) : null}
              <AvatarFallback>
                <UserRound className="h-10 w-10" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold text-foreground">
                {metadata?.fullName ?? "Nome não informado"}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {user.email ?? "Email não informado"}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Conta criada em {formatDateTime(user.created_at)}
              </p>
            </div>
            <Button asChild variant="context" className="w-full sm:w-auto">
              <Link to="/aluno/perfil/editar">Editar perfil</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="course">
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd className="mt-1 text-foreground">
                    {metadata?.phone || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Website</dt>
                  <dd className="mt-1 break-all text-foreground">
                    {metadata?.website || "Não informado"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card variant="course">
            <CardHeader>
              <CardTitle>Biografia</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              {metadata?.bio || "Nenhuma biografia informada."}
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentProfilePage;
