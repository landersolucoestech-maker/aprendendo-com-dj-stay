import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
} from "lucide-react";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import { useStudentActivityHistory } from "@/hooks/useStudentActivityHistory";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const pageSize = 20;

const StudentActivityHistory = () => {
  const [page, setPage] = useState(0);
  const historyQuery = useStudentActivityHistory(page, pageSize);
  const data = historyQuery.data;
  const activities = data?.activities ?? [];
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
          title="Histórico"
          description="Atividades de progresso persistidas na sua conta."
        />

        {historyQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando histórico"
            description="Consultando somente as atividades desta conta."
          />
        ) : historyQuery.error ? (
          <PageState
            variant="error"
            title="Histórico indisponível"
            description={getErrorMessage(
              historyQuery.error,
              "Não foi possível carregar o histórico.",
            )}
          />
        ) : total === 0 ? (
          <PageState
            variant="empty"
            icon={History}
            title="Nenhuma atividade registrada"
            description="O histórico será preenchido quando você iniciar ou concluir aulas."
          />
        ) : (
          <section className="space-y-4" aria-label="Histórico de atividades">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {total} atividade{total === 1 ? "" : "s"} registrada
                {total === 1 ? "" : "s"}
              </span>
              <span>
                Página {page + 1} de {totalPages}
              </span>
            </div>

            {activities.length === 0 ? (
              <PageState
                variant="empty"
                icon={History}
                title="Nenhuma atividade nesta página"
                description="A página será ajustada automaticamente após a atualização do histórico."
              />
            ) : (
              <Card variant="course">
                <CardContent className="divide-y divide-border p-0">
                  {activities.map((activity) => (
                    <article key={activity.id} className="flex gap-4 p-5">
                      <span className="mt-1">
                        {activity.completed ? (
                          <CheckCircle2
                            className="h-5 w-5 text-success"
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock3
                            className="h-5 w-5 text-course"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground">
                          {activity.lessonTitle}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {activity.moduleTitle}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {activity.completed
                              ? "Concluída"
                              : `${activity.progressPercent}% assistido`}
                          </span>
                          <span>{formatAppDateTime(activity.updatedAt)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </CardContent>
              </Card>
            )}

            <nav
              className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4"
              aria-label="Paginação do histórico"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoBack || historyQuery.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoForward || historyQuery.isFetching}
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

export default StudentActivityHistory;
