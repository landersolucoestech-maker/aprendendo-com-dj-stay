import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  History,
  Library,
  PlayCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import {
  StudentSectionHeader,
  StudentStatCard,
} from "@/components/student/StudentPortalPrimitives";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { getActiveEnrollments, useCourseAccess } from "@/hooks/useCourseAccess";
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useStudentLibrarySummary } from "@/hooks/useStudentLibrarySummary";
import { useUserProgress } from "@/hooks/useUserProgress";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const formatAccessDate = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "sem prazo definido" });

const StudentDashboardPage = () => {
  const accessQuery = useCourseAccess();
  const progressQuery = useUserProgress();
  const activitiesQuery = useRecentActivities(5);
  const librarySummaryQuery = useStudentLibrarySummary();

  if (
    accessQuery.isLoading ||
    progressQuery.isLoading ||
    activitiesQuery.isLoading ||
    librarySummaryQuery.isLoading
  ) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="loading"
          title="Carregando portal"
          description="Consultando matrículas, progresso, atividades e o total de materiais liberados."
        />
      </StudentPortalPageFrame>
    );
  }

  const error =
    accessQuery.error ??
    progressQuery.error ??
    activitiesQuery.error ??
    librarySummaryQuery.error;

  if (error) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="error"
          title="Não foi possível montar o painel"
          description={getErrorMessage(
            error,
            "Não foi possível montar o painel do aluno.",
          )}
        />
      </StudentPortalPageFrame>
    );
  }

  const activeEnrollments = getActiveEnrollments(accessQuery.data ?? []);
  const progressRows = progressQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];
  const averageProgress =
    progressRows.length === 0
      ? 0
      : Math.round(
          progressRows.reduce(
            (total, row) => total + row.progresso_percentual,
            0,
          ) / progressRows.length,
        );
  const completedLessons = progressRows.filter((row) => row.completada).length;
  const libraryTotal = librarySummaryQuery.data?.total ?? 0;

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          eyebrow="Portal do Aluno"
          title="Visão geral"
          description="Acompanhe seus acessos, progresso, materiais e atividades reais."
        />

        <section
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-label="Resumo acadêmico"
        >
          <StudentStatCard
            label="Cursos ativos"
            value={String(activeEnrollments.length)}
            description="Matrículas válidas neste momento"
            icon={GraduationCap}
          />
          <StudentStatCard
            label="Progresso médio"
            value={`${averageProgress}%`}
            description="Média das aulas iniciadas"
            icon={PlayCircle}
          />
          <StudentStatCard
            label="Aulas concluídas"
            value={String(completedLessons)}
            description="Conclusões persistidas no banco"
            icon={CheckCircle2}
          />
          <StudentStatCard
            label="Materiais liberados"
            value={String(libraryTotal)}
            description="Total exato de arquivos privados acessíveis"
            icon={Library}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card variant="course">
            <CardHeader>
              <CardTitle>Continuar estudando</CardTitle>
              <CardDescription>
                Três matrículas ativas mais recentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeEnrollments.length === 0 ? (
                <PageState
                  variant="empty"
                  compact
                  icon={BookOpen}
                  title="Nenhuma matrícula ativa"
                  description="Os cursos aparecerão aqui quando houver uma matrícula válida."
                />
              ) : (
                activeEnrollments.slice(0, 3).map((enrollment) => (
                  <article
                    key={enrollment.id}
                    className="surface-muted flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {enrollment.courses.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Acesso até {formatAccessDate(enrollment.expires_at)}
                      </p>
                    </div>
                    <Button asChild variant="context" className="w-full sm:w-auto">
                      <Link to={`/aluno/cursos/${enrollment.course_id}`}>
                        Abrir curso
                      </Link>
                    </Button>
                  </article>
                ))
              )}
              <Button asChild variant="link">
                <Link to="/aluno/cursos">Ver todos os cursos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card variant="course">
            <CardHeader>
              <CardTitle>Atividades recentes</CardTitle>
              <CardDescription>Últimas cinco atualizações.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activities.length === 0 ? (
                <PageState
                  variant="empty"
                  compact
                  icon={History}
                  title="Nenhuma atividade registrada"
                />
              ) : (
                activities.map((activity) => (
                  <article
                    key={activity.id}
                    className="border-b border-border pb-4 last:border-0"
                  >
                    <p className="text-sm text-foreground">{activity.activity}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </article>
                ))
              )}
              <Button asChild variant="link">
                <Link to="/aluno/historico">Ver histórico completo</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentDashboardPage;
