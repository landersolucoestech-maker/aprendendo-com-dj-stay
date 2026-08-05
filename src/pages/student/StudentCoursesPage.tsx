import { useEffect, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useStudentCourseAccess } from "@/hooks/useStudentCourseAccess";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const pageSize = 20;

const statusLabels: Readonly<Record<string, string>> = {
  pending: "Pendente",
  active: "Ativa",
  suspended: "Suspensa",
  revoked: "Revogada",
};

const statusVariants: Readonly<Record<string, BadgeProps["variant"]>> = {
  pending: "warning",
  active: "success",
  suspended: "warning",
  revoked: "destructive",
};

const formatDate = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "Sem prazo definido" });

const StudentCoursesPage = () => {
  const [page, setPage] = useState(0);
  const accessQuery = useStudentCourseAccess(page, pageSize, 3);
  const data = accessQuery.data;
  const enrollments = data?.enrollments ?? [];
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
      <div className="space-y-6">
        <StudentSectionHeader
          title="Meus cursos"
          description="Histórico completo de matrículas, com acesso atual calculado pelo servidor."
        />

        {accessQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando matrículas"
            description="Consultando a página solicitada e o resumo de acesso ativo."
          />
        ) : accessQuery.error ? (
          <PageState
            variant="error"
            title="Cursos indisponíveis"
            description={getErrorMessage(
              accessQuery.error,
              "Não foi possível carregar seus cursos.",
            )}
          />
        ) : total === 0 ? (
          <PageState
            variant="empty"
            icon={BookOpen}
            title="Nenhum curso encontrado"
            description="Os cursos aparecerão aqui quando uma matrícula for criada."
          />
        ) : (
          <section className="space-y-5" aria-label="Matrículas do aluno">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {total} matrícula{total === 1 ? "" : "s"}; {data?.active_total ?? 0} com acesso ativo
              </span>
              <span>
                Página {page + 1} de {totalPages}
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {enrollments.map(({ enrollment, access_active: active }) => (
                <Card key={enrollment.id} variant="course">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{enrollment.courses.title}</CardTitle>
                        <CardDescription className="mt-2">
                          Matrícula {statusLabels[enrollment.status] ?? enrollment.status}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          active
                            ? "success"
                            : statusVariants[enrollment.status] ?? "outline"
                        }
                      >
                        {active ? "Acesso ativo" : "Sem acesso atual"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <dl className="surface-muted grid gap-3 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Início</dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(enrollment.starts_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Validade</dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(enrollment.expires_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Origem</dt>
                        <dd className="mt-1 text-foreground">
                          {enrollment.source === "purchase"
                            ? "Compra"
                            : "Concessão manual"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Pagamento confirmado
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDate(enrollment.payment_confirmed_at)}
                        </dd>
                      </div>
                    </dl>

                    {enrollment.status_reason ? (
                      <div className="surface-muted p-3 text-sm text-muted-foreground">
                        {enrollment.status_reason}
                      </div>
                    ) : null}

                    {active ? (
                      <Button asChild variant="context" className="w-full">
                        <Link to={`/aluno/cursos/${enrollment.course_id}`}>
                          Acessar conteúdo
                        </Link>
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        Conteúdo indisponível
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <nav
              className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4"
              aria-label="Paginação das matrículas"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoBack || accessQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoForward || accessQuery.isFetching}
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

export default StudentCoursesPage;
