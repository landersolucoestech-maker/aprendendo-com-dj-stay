import { Bell, CheckCheck, Circle } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import { StudentSectionHeader } from "@/components/student/StudentPortalPrimitives";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
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

const StudentNotifications = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const notificationsQuery = useStudentNotifications();
  const markRead = useMarkStudentNotificationRead();
  const markAllRead = useMarkAllStudentNotificationsRead();
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

  const data = notificationsQuery.data;

  return (
    <StudentPortalShell
      displayName={metadata?.fullName ?? user.email ?? "Aluno"}
      email={user.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    >
      <div className="space-y-8">
        <StudentSectionHeader
          title="Notificações"
          description="Atualizações reais de suporte, pagamentos, acessos e certificados."
          actions={
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
          <PageState variant="loading" title="Carregando notificações" description="Consultando somente as notificações desta conta." />
        ) : notificationsQuery.error ? (
          <PageState
            variant="error"
            title="Notificações indisponíveis"
            description={getErrorMessage(notificationsQuery.error, "Não foi possível carregar suas notificações.")}
          />
        ) : !data || data.notifications.length === 0 ? (
          <PageState
            variant="empty"
            icon={Bell}
            title="Nenhuma notificação"
            description="Atualizações transacionais aparecerão aqui quando ocorrerem."
          />
        ) : (
          <section className="space-y-4" aria-label="Lista de notificações">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" aria-hidden="true" />
              {data.unread_count} não lida{data.unread_count === 1 ? "" : "s"}
            </div>
            {data.notifications.map((notification) => {
              const content = (
                <Card className={notification.read_at ? "opacity-75" : "border-course/40"}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {!notification.read_at ? <Circle className="h-2.5 w-2.5 fill-current text-course" aria-hidden="true" /> : null}
                          <Badge variant="outline">{typeLabels[notification.type]}</Badge>
                        </div>
                        <CardTitle className="mt-3 text-base">{notification.title}</CardTitle>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatAppDateTime(notification.created_at)}</span>
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
            })}
          </section>
        )}
      </div>
    </StudentPortalShell>
  );
};

export default StudentNotifications;
