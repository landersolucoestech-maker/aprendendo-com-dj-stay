import { useState } from "react";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { Link } from "react-router";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import {
  useMarkAllStudentNotificationsRead,
  useMarkStudentNotificationRead,
  useStudentNotifications,
} from "@/hooks/useStudentNotifications";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const typeLabels = {
  support_reply: "Suporte",
  payment_confirmed: "Pagamento",
  access_granted: "Acesso",
  certificate_issued: "Certificado",
  system: "Sistema",
} as const;

const pageSize = 20;

const StudentNotifications = () => {
  const [page, setPage] = useState(0);
  const notificationsQuery = useStudentNotifications(pageSize, page * pageSize);
  const markRead = useMarkStudentNotificationRead();
  const markAllRead = useMarkAllStudentNotificationsRead();
  const data = notificationsQuery.data;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const canGoBack = page > 0;
  const canGoForward = (page + 1) * pageSize < (data?.total ?? 0);
  const paginationBusy = notificationsQuery.isFetching;

  return (
    <StudentPortalPageFrame>
      <div className="space-y-8">
        <StudentSectionHeader
          title="Notificações"
          description="Atualizações reais de suporte, pagamentos, acessos e certificados."
          action={
            <Button
              type="button"
              variant="outline"
              disabled={!data?.unread_count || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck aria-hidden="true" />
              Marcar todas como lidas
            </Button>
          }
        />

        {notificationsQuery.isLoading ? (
          <PageState
            variant="loading"
            title="Carregando notificações"
            description="Consultando somente as notificações desta conta."
          />
        ) : notificationsQuery.error ? (
          <PageState
            variant="error"
            title="Notificações indisponíveis"
            description={getErrorMessage(
              notificationsQuery.error,
              "Não foi possível carregar suas notificações.",
            )}
          />
        ) : !data || data.total === 0 ? (
          <PageState
            variant="empty"
            icon={Bell}
            title="Nenhuma notificação"
            description="Atualizações transacionais aparecerão aqui quando ocorrerem."
          />
        ) : (
          <section className="space-y-4" aria-label="Lista de notificações">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" aria-hidden="true" />
                {data.unread_count} não lida{data.unread_count === 1 ? "" : "s"}
              </div>
              <span>{data.total} notificação{data.total === 1 ? "" : "ões"} no histórico</span>
            </div>

            {data.notifications.length === 0 ? (
              <PageState
                variant="empty"
                icon={Bell}
                title="Nenhuma notificação nesta página"
                description="Volte à página anterior para continuar consultando o histórico."
              />
            ) : (
              data.notifications.map((notification) => {
                const content = (
                  <Card className={notification.read_at ? "opacity-75" : "border-course/40"}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {!notification.read_at ? (
                              <Circle
                                className="h-2.5 w-2.5 fill-current text-course"
                                aria-hidden="true"
                              />
                            ) : null}
                            <Badge variant="outline">{typeLabels[notification.type]}</Badge>
                          </div>
                          <CardTitle className="mt-3 text-base">{notification.title}</CardTitle>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatAppDateTime(notification.created_at)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      {!notification.read_at ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={markRead.isPending}
                          onClick={(event) => {
                            event.preventDefault();
                            markRead.mutate(notification.id);
                          }}
                        >
                          Marcar como lida
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                );

                return notification.action_path ? (
                  <Link
                    key={notification.id}
                    to={notification.action_path}
                    onClick={() => {
                      if (!notification.read_at) markRead.mutate(notification.id);
                    }}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })
            )}

            <nav
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4"
              aria-label="Paginação de notificações"
            >
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoBack || paginationBusy}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoForward || paginationBusy}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </section>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentNotifications;
