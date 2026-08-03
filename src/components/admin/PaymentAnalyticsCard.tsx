import {
  BarChart3,
  Banknote,
  CalendarDays,
  RefreshCw,
  ReceiptText,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PaymentOrderStatus } from "@/contracts/payment-admin";
import { usePaymentAdminAnalytics } from "@/hooks/usePaymentAnalytics";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const RANGE_OPTIONS = [7, 30, 90, 365] as const;
type RangeDays = (typeof RANGE_OPTIONS)[number];

type AnalyticsPeriod = {
  readonly days: RangeDays;
  readonly startAt: string;
  readonly endAt: string;
};

const createPeriod = (days: RangeDays): AnalyticsPeriod => {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    days,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
};

const formatMoney = (amountCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);

const formatDay = (day: string): string => {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
};

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

export const PaymentAnalyticsCard = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>(() => createPeriod(30));
  const analyticsQuery = usePaymentAdminAnalytics({
    startAt: period.startAt,
    endAt: period.endAt,
    topLimit: 10,
  });

  if (analyticsQuery.isLoading) {
    return (
      <Card className="border-white/10 bg-white/5" aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" aria-hidden="true" /> Desempenho financeiro
          </CardTitle>
          <CardDescription className="text-gray-400">
            Consolidando pedidos confirmados e reversões persistidas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (analyticsQuery.error || !analyticsQuery.data) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" /> Desempenho financeiro
          </CardTitle>
          <CardDescription className="text-gray-400">
            {getErrorMessage(
              analyticsQuery.error,
              "Não foi possível consultar o analytics financeiro.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 bg-transparent"
            onClick={() => setPeriod(createPeriod(period.days))}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const analytics = analyticsQuery.data;
  const activeStatuses = analytics.status_breakdown.filter(
    (status) => status.order_count > 0,
  );
  const recentDays = analytics.daily.slice(-14);
  const maxDailyGross = Math.max(
    1,
    ...recentDays.map((day) => day.gross_revenue_cents),
  );

  return (
    <Card className="border-white/10 bg-white/5" aria-live="polite">
      <CardHeader className="gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5" aria-hidden="true" /> Desempenho financeiro
          </CardTitle>
          <CardDescription className="mt-2 max-w-3xl text-gray-400">
            Receita confirmada por período. O valor líquido desconta reembolsos concluídos e
            chargebacks perdidos, mas não tarifas do provider, impostos ou comissões ainda não
            modeladas neste read model.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant={period.days === days ? "default" : "outline"}
              className={period.days === days ? undefined : "border-white/20 bg-transparent"}
              onClick={() => setPeriod(createPeriod(days))}
            >
              {days} dias
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-transparent"
            disabled={analyticsQuery.isFetching}
            onClick={() => setPeriod(createPeriod(period.days))}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${analyticsQuery.isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-7">
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatAppDateTime(analytics.period.start_at)} até {formatAppDateTime(analytics.period.end_at)}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <Banknote className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Receita bruta</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatMoney(analytics.summary.gross_revenue_cents)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <Banknote className="h-4 w-4 text-emerald-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Após reversões</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatMoney(analytics.summary.net_after_reversals_cents)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <ReceiptText className="h-4 w-4 text-purple-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Ticket médio</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatMoney(analytics.summary.average_ticket_cents)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <ReceiptText className="h-4 w-4 text-purple-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Pedidos confirmados</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {analytics.summary.confirmed_orders}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <Users className="h-4 w-4 text-blue-200" aria-hidden="true" />
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">Clientes únicos</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {analytics.summary.unique_customers}
            </p>
          </div>
        </div>

        {(analytics.summary.refund_pending_amount_cents > 0 ||
          analytics.summary.chargeback_pending_amount_cents > 0) && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
            <p className="font-semibold">Valores financeiros em risco</p>
            <p className="mt-2 text-amber-100/80">
              Reembolsos pendentes: {formatMoney(analytics.summary.refund_pending_amount_cents)} ·
              Chargebacks pendentes: {formatMoney(analytics.summary.chargeback_pending_amount_cents)}
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {analytics.subject_breakdown.map((subject) => (
            <div
              key={subject.subject_type}
              className="rounded-xl border border-white/10 bg-black/20 p-5"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {subject.subject_type === "course" ? "Cursos" : "Produtos digitais"}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-gray-500">Pedidos</p><p className="mt-1 font-semibold text-white">{subject.order_count}</p></div>
                <div><p className="text-gray-500">Bruto</p><p className="mt-1 font-semibold text-white">{formatMoney(subject.gross_revenue_cents)}</p></div>
                <div><p className="text-gray-500">Após reversões</p><p className="mt-1 font-semibold text-white">{formatMoney(subject.net_after_reversals_cents)}</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="payment-analytics-top-offers">
            <h2 id="payment-analytics-top-offers" className="text-sm font-semibold text-white">
              Ofertas mais vendidas
            </h2>
            {analytics.top_offers.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
                Nenhuma venda confirmada neste período.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {analytics.top_offers.map((offer, index) => (
                  <div
                    key={`${offer.subject_type}-${offer.subject_id}`}
                    className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-white">{offer.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {offer.subject_type === "course" ? "Curso" : "Produto digital"} · {offer.order_count} pedido(s)
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <p className="font-semibold text-white">{formatMoney(offer.gross_revenue_cents)}</p>
                      <p className="text-xs text-gray-500">{formatMoney(offer.net_after_reversals_cents)} após reversões</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="payment-analytics-daily">
            <h2 id="payment-analytics-daily" className="text-sm font-semibold text-white">
              Últimos dias do período
            </h2>
            <div className="mt-3 space-y-3">
              {recentDays.map((day) => (
                <div key={day.day} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
                  <span className="text-gray-500">{formatDay(day.day)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-white/40"
                      style={{ width: `${Math.max(2, (day.gross_revenue_cents / maxDailyGross) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-gray-300">{formatMoney(day.gross_revenue_cents)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Situação atual dos pedidos confirmados</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeStatuses.length === 0 ? (
              <span className="text-sm text-gray-400">Nenhum pedido confirmado no período.</span>
            ) : (
              activeStatuses.map((status) => (
                <span
                  key={status.status}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300"
                >
                  {statusLabels[status.status]}: {status.order_count} · {formatMoney(status.amount_cents)}
                </span>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
