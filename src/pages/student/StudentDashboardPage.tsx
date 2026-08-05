import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  History,
  Library,
  PlayCircle,
} from "lucide-react";
import { Link } from "react-router";

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
import { useRecentActivities } from "@/hooks/useRecentActivities";
import { useStudentCourseAccess } from "@/hooks/useStudentCourseAccess";
import { useStudentLibrarySummary } from "@/hooks/useStudentLibrarySummary";
import { useStudentProgressSummary } from "@/hooks/useStudentProgressSummary";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const formatAccessDate = (value: string | null): string =>
  formatAppDateTime(value, { fallback: "sem prazo definido" });

const StudentDashboardPage = () => {
  const accessQuery = useStudentCourseAccess(0, 1, 3);
  const progressSummaryQuery = useStudentProgressSummary();
  const activitiesQuery = useRecentActivities(5);
  const librarySummaryQuery = useStudentLibrarySummary();

  if (
    accessQuery.isLoading ||
    progressSummaryQuery.isLoading ||
    activitiesQuery.isLoading ||
    librarySummaryQuery.isLoading
  ) {
    return (
      <StudentPortalPageFrame>
        <PageState
          variant="loading"
          title="Carregando portal"
          description="Consultando matrículas, resumos acadêmicos, atividades e materiais liberados."
        />
      </StudentPortalPageFrame>
    );
  }

  const error =
    accessQuery.error ??
    progressSummaryQuery.error ??
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

  const access = accessQuery.data ?? {
    total: 0,
    active_total: 0,
    active_enrollments: [],
    enrollments: [],
  };
  const activities = activitiesQuery.data ?? [];
  const progressSummary = progressSummaryQuery.data ?? {
    started_lessons: 0,
    completed_lessons: 0,
    average_progress_percent: 0,
  };
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
            value={String(access.active_total)}
            description="Total válido pelo relógio do servidor"
            icon={GraduationCap}
          />
          <StudentStatCard
            label="Progresso médio"
            value={`${progressSummary.average_progress_percent}%`}
            description={`Média de ${progressSummary.started_lessons} aulas iniciadas`}
            icon={PlayCircle}
          />
          <StudentStatCard
            label="Aulas concluídas"
            value={String(progressSummary.completed_lessons)}
            description="Conclusões agregadas no banco"
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
              {access.active_enrollments.length === 0 ? (
                <PageState
                  variant="empty"
                  compact
                  icon={BookOpen}
                  title="Nenhuma matrícula ativa"
                  description="Os cursos aparecerão aqui quando houver uma matrícula válida."
                />
              ) : (
                access.active_enrollments.map((enrollment) => (
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
