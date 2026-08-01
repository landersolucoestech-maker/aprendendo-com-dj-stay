import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CheckoutSubjectType,
  PaymentOrderStatus,
} from "@/contracts/payment-admin";
import { usePaymentAdminDashboard } from "@/hooks/usePaymentAdmin";
import { formatAppDateTime } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const pageSize = 50;
const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";

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

const subjectLabels: Record<CheckoutSubjectType, string> = {
  course: "Curso",
  digital_product: "Produto digital",
};

const formatMoney = (amountCents: number, currencyCode = "BRL") =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amountCents / 100);

const PaymentsAdmin = () => {
  const [status, setStatus] = useState<PaymentOrderStatus | null>(null);
  const [subjectType, setSubjectType] =
    useState<CheckoutSubjectType | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const dashboardQuery = usePaymentAdminDashboard({
    status,
    subjectType,
    search,
    page,
    pageSize,
  });
  const data = dashboardQuery.data;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const resetPage = () => setPage(0);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Administração
            </p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <CreditCard className="h-9 w-9" />
              Pedidos e pagamentos
            </h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Visão operacional somente leitura. Estados financeiros são alterados
              exclusivamente pelo checkout e pelos webhooks validados do provedor.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/produtos">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Produtos
              </Button>
            </Link>
            <Link to="/admin/alunos">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Alunos
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-5">
              <p className="text-sm text-gray-400">Pedidos</p>
              <p className="mt-1 text-3xl font-bold">
                {data?.summary.total_orders ?? 0}
              </p>
              <p className="mt-2 text-xs text-amber-300">
                {data?.summary.pending_orders ?? 0} pendente(s)
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-5">
              <p className="text-sm text-gray-400">Valor confirmado</p>
              <p className="mt-1 text-2xl font-bold text-emerald-100">
                {formatMoney(data?.summary.confirmed_amount_cents ?? 0)}
              </p>
              <p className="mt-2 text-xs text-emerald-300">
                {data?.summary.paid_orders ?? 0} pedido(s) atualmente pago(s)
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-5">
              <p className="text-sm text-gray-400">Reembolsado</p>
              <p className="mt-1 text-2xl font-bold text-amber-100">
                {formatMoney(data?.summary.refunded_amount_cents ?? 0)}
              </p>
              <p className="mt-2 text-xs text-amber-300">
                {data?.summary.refunded_orders ?? 0} pedido(s)
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="p-5">
              <p className="text-sm text-gray-400">Chargebacks</p>
              <p className="mt-1 text-3xl font-bold text-red-100">
                {data?.summary.chargeback_orders ?? 0}
              </p>
              <p className="mt-2 text-xs text-red-300">
                Perdido: {formatMoney(data?.summary.chargeback_lost_amount_cents ?? 0)}
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_220px]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                className={`${fieldClass} pl-10`}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
                placeholder="Buscar por pedido, título ou e-mail"
                maxLength={200}
              />
            </label>
            <select
              className={fieldClass}
              value={status ?? ""}
              onChange={(event) => {
                setStatus(
                  event.target.value
                    ? (event.target.value as PaymentOrderStatus)
                    : null,
                );
                resetPage();
              }}
              aria-label="Filtrar por status do pedido"
            >
              <option value="">Todos os status</option>
              {(Object.keys(statusLabels) as PaymentOrderStatus[]).map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={subjectType ?? ""}
              onChange={(event) => {
                setSubjectType(
                  event.target.value
                    ? (event.target.value as CheckoutSubjectType)
                    : null,
                );
                resetPage();
              }}
              aria-label="Filtrar por tipo do item"
            >
              <option value="">Cursos e produtos</option>
              {(Object.keys(subjectLabels) as CheckoutSubjectType[]).map((item) => (
                <option key={item} value={item}>
                  {subjectLabels[item]}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {dashboardQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : dashboardQuery.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            {getErrorMessage(
              dashboardQuery.error,
              "Não foi possível carregar pedidos e pagamentos.",
            )}
          </div>
        ) : (data?.orders ?? []).length === 0 ? (
          <Card className="border-white/10 bg-white/5">
            <CardContent className="p-10 text-center text-gray-400">
              Nenhum pedido encontrado.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4" aria-label="Pedidos e pagamentos">
            {(data?.orders ?? []).map((order) => (
              <Card key={order.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-xl text-white">
                        {order.title}
                      </CardTitle>
                      <CardDescription className="mt-2 text-gray-400">
                        {order.customer_email ?? order.user_id} · {subjectLabels[order.subject_type]}
                      </CardDescription>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-xl font-bold">
                        {formatMoney(order.amount_cents, order.currency_code)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200">
                        {statusLabels[order.status]}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 text-sm text-gray-300 md:grid-cols-3">
                    <p>Pedido: {order.id}</p>
                    <p>Criado: {formatAppDateTime(order.created_at)}</p>
                    <p>
                      Confirmado: {formatAppDateTime(order.payment_confirmed_at, { fallback: "Não confirmado" })}
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="flex items-center gap-2 font-semibold text-white">
                        <Banknote className="h-4 w-4" /> Última tentativa
                      </p>
                      {order.latest_attempt ? (
                        <div className="mt-3 space-y-1 text-sm text-gray-400">
                          <p>Status: {order.latest_attempt.status}</p>
                          <p>
                            Provedor: {order.latest_attempt.provider} · {order.latest_attempt.billing_type}
                          </p>
                          <p>
                            Status externo: {order.latest_attempt.provider_status ?? "Não informado"}
                          </p>
                          {order.latest_attempt.failure_code ? (
                            <p className="flex items-center gap-2 text-red-300">
                              <AlertTriangle className="h-4 w-4" />
                              {order.latest_attempt.failure_code}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">
                          Nenhuma tentativa registrada.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="flex items-center gap-2 font-semibold text-white">
                        <ShieldCheck className="h-4 w-4" /> Acesso concedido
                      </p>
                      {order.entitlement ? (
                        <div className="mt-3 space-y-1 text-sm text-gray-400">
                          <p>Status: {order.entitlement.status}</p>
                          <p>
                            Controla acesso: {order.entitlement.controls_access ? "Sim" : "Não"}
                          </p>
                          <p>Concedido: {formatAppDateTime(order.entitlement.granted_at)}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">
                          Nenhum entitlement registrado.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <p className="text-sm text-gray-500">
            Página {page + 1} de {totalPages} · {data?.total ?? 0} resultado(s)
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-transparent"
              disabled={page === 0 || dashboardQuery.isFetching}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-transparent"
              disabled={page + 1 >= totalPages || dashboardQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PaymentsAdmin;
