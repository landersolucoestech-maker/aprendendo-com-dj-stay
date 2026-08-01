import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getUserMetadataProfile } from "@/auth/user-metadata";
import { useAuth } from "@/auth/use-auth";
import {
  StudentSectionHeader,
  StudentStatCard,
} from "@/components/student/StudentPortalPrimitives";
import { StudentPortalShell } from "@/components/student/StudentPortalShell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import type { PaymentOrderStatus } from "@/contracts/payment-admin";
import { useStudentPaymentHistory } from "@/hooks/useStudentPayments";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const statusLabels: Record<PaymentOrderStatus, string> = {
  checkout_pending: "Checkout pendente",
  payment_pending: "Pagamento pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  expired: "Expirado",
  refund_pending: "Reembolso pendente",
  refunded: "Reembolsado",
  chargeback_pending: "Chargeback pendente",
  chargeback_won: "Chargeback ganho",
  chargeback_lost: "Chargeback perdido",
};

const formatMoney = (amountCents: number, currencyCode: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amountCents / 100);

interface StudentFinancialPortalProps {
  readonly section: "orders" | "payments";
}

const StudentFinancialPortal = ({ section }: StudentFinancialPortalProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const historyQuery = useStudentPaymentHistory();
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
    return (
      <PageState
        variant="loading"
        title="Validando conta"
        description="Confirmando a sessão do aluno."
      />
    );
  }

  const orders = historyQuery.data?.orders ?? [];
  const summary = historyQuery.data?.summary;
  const title = section === "orders" ? "Pedidos" : "Pagamentos";

  return (
    <StudentPortalShell
      displayName={metadata?.fullName ?? user.email ?? "Aluno"}
      email={user.email ?? ""}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    >
      <div className="space-y-8">
        <StudentSectionHeader
          title={title}
          description={
            section === "orders"
              ? "Pedidos reais criados pelo checkout da plataforma."
              : "Cobranças, confirmações e situação do acesso vinculadas aos seus pedidos."
          }
        />

        {historyQuery.isLoading ? (
          <PageState
            variant="loading"
            title={`Carregando ${title.toLowerCase()}`}
            description="Consultando somente os registros financeiros desta conta."
          />
        ) : historyQuery.error ? (
          <PageState
            variant="error"
            title={`${title} indisponíveis`}
            description={getErrorMessage(
              historyQuery.error,
              `Não foi possível carregar seus ${title.toLowerCase()}.`,
            )}
          />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StudentStatCard
                label="Pedidos"
                value={String(summary?.total_orders ?? 0)}
                description="Registros vinculados à sua conta"
                icon={PackageCheck}
              />
              <StudentStatCard
                label="Pendentes"
                value={String(summary?.pending_orders ?? 0)}
                description="Aguardando confirmação"
                icon={Loader2}
              />
              <StudentStatCard
                label="Pagos"
                value={String(summary?.paid_orders ?? 0)}
                description="Confirmações processadas"
                icon={CheckCircle2}
              />
              <StudentStatCard
                label="Reembolsados"
                value={String(summary?.refunded_orders ?? 0)}
                description="Pedidos devolvidos"
                icon={Banknote}
              />
            </section>

            {orders.length === 0 ? (
              <PageState
                variant="empty"
                icon={section === "orders" ? PackageCheck : CreditCard}
                title={`Nenhum ${section === "orders" ? "pedido" : "pagamento"} registrado`}
                description="Os registros aparecerão aqui depois que um checkout real for criado para esta conta."
              />
            ) : (
              <section className="space-y-4" aria-label={title}>
                {orders.map((order) => (
                  <Card key={order.id} variant="course">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle>{order.title}</CardTitle>
                          <CardDescription className="mt-2">
                            Pedido {order.id} · {order.subject_type === "course" ? "Curso" : "Produto digital"}
                          </CardDescription>
                        </div>
                        <div className="sm:text-right">
                          <p className="font-semibold text-foreground">
                            {formatMoney(order.amount_cents, order.currency_code)}
                          </p>
                          <Badge className="mt-2" variant={order.status === "paid" ? "success" : "outline"}>
                            {statusLabels[order.status]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <dl className="surface-muted grid gap-3 p-4 text-sm md:grid-cols-3">
                        <div>
                          <dt className="text-muted-foreground">Criado</dt>
                          <dd className="mt-1 text-foreground">
                            {formatAppDateTime(order.created_at)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Confirmado</dt>
                          <dd className="mt-1 text-foreground">
                            {formatAppDateTime(order.payment_confirmed_at, {
                              fallback: "Ainda não confirmado",
                            })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Cobrança</dt>
                          <dd className="mt-1 text-foreground">
                            {order.latest_attempt?.billing_type ?? "Não criada"}
                          </dd>
                        </div>
                      </dl>

                      {section === "payments" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="surface-muted p-4 text-sm">
                            <p className="flex items-center gap-2 font-medium text-foreground">
                              <CreditCard className="h-4 w-4" aria-hidden="true" />
                              Última cobrança
                            </p>
                            <p className="mt-2 text-muted-foreground">
                              {order.latest_attempt
                                ? `${order.latest_attempt.provider} · ${order.latest_attempt.provider_status ?? order.latest_attempt.status}`
                                : "Nenhuma tentativa registrada."}
                            </p>
                          </div>
                          <div className="surface-muted p-4 text-sm">
                            <p className="flex items-center gap-2 font-medium text-foreground">
                              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                              Situação do acesso
                            </p>
                            <p className="mt-2 text-muted-foreground">
                              {order.entitlement
                                ? `${order.entitlement.status} · ${order.entitlement.controls_access ? "controla o acesso" : "registro informativo"}`
                                : "Nenhum acesso financeiro vinculado."}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </StudentPortalShell>
  );
};

export default StudentFinancialPortal;
