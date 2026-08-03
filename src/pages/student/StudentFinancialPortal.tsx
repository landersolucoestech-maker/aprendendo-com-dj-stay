import { useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import { StudentPortalPageFrame } from "@/components/student/StudentPortalPageFrame";
import {
  StudentSectionHeader,
  StudentStatCard,
} from "@/components/student/StudentPortalPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const pageSize = 20;

interface StudentFinancialPortalProps {
  readonly section: "orders" | "payments";
}

const StudentFinancialPortal = ({ section }: StudentFinancialPortalProps) => {
  const [page, setPage] = useState(0);
  const historyQuery = useStudentPaymentHistory(page, pageSize);
  const orders = historyQuery.data?.orders ?? [];
  const summary = historyQuery.data?.summary;
  const total = historyQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoBack = page > 0;
  const canGoForward = (page + 1) * pageSize < total;
  const title = section === "orders" ? "Pedidos" : "Pagamentos";

  useEffect(() => {
    if (historyQuery.data && page > 0 && page * pageSize >= historyQuery.data.total) {
      setPage(Math.max(0, Math.ceil(historyQuery.data.total / pageSize) - 1));
    }
  }, [historyQuery.data, page]);

  return (
    <StudentPortalPageFrame>
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

            {total === 0 ? (
              <PageState
                variant="empty"
                icon={section === "orders" ? PackageCheck : CreditCard}
                title={`Nenhum ${section === "orders" ? "pedido" : "pagamento"} registrado`}
                description="Os registros aparecerão aqui depois que um checkout real for criado para esta conta."
              />
            ) : (
              <section className="space-y-4" aria-label={title}>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{total} pedido{total === 1 ? "" : "s"} no histórico</span>
                  <span>
                    Página {page + 1} de {totalPages}
                  </span>
                </div>

                {orders.length === 0 ? (
                  <PageState
                    variant="empty"
                    icon={section === "orders" ? PackageCheck : CreditCard}
                    title="Nenhum registro nesta página"
                    description="A página será ajustada automaticamente após a atualização do histórico."
                  />
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} variant="course">
                      <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle>{order.title}</CardTitle>
                            <CardDescription className="mt-2">
                              Pedido {order.id} ·{" "}
                              {order.subject_type === "course"
                                ? "Curso"
                                : "Produto digital"}
                            </CardDescription>
                          </div>
                          <div className="sm:text-right">
                            <p className="font-semibold text-foreground">
                              {formatMoney(order.amount_cents, order.currency_code)}
                            </p>
                            <Badge
                              className="mt-2"
                              variant={order.status === "paid" ? "success" : "outline"}
                            >
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
                  ))
                )}

                <nav
                  className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4"
                  aria-label={`Paginação de ${title.toLowerCase()}`}
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
          </>
        )}
      </div>
    </StudentPortalPageFrame>
  );
};

export default StudentFinancialPortal;
