import {
  BadgeDollarSign,
  Ban,
  CheckCircle2,
  CreditCard,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AffiliateAdminDashboard } from "@/contracts/affiliate";
import {
  useAffiliateAdminDashboard,
  useCancelAffiliatePayout,
  useConfigureAffiliateTerms,
  useCreateAffiliatePayout,
  useMarkAffiliatePayoutPaid,
  useSetAffiliateProfileStatus,
} from "@/hooks/useAffiliateProgram";
import { useToast } from "@/hooks/use-toast";
import { formatAppDate } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";
const pageSize = 25;

const formatCurrency = (amountCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);

const formatDate = (value: string | null): string => formatAppDate(value);

const profileStatusLabel: Readonly<Record<string, string>> = {
  not_requested: "Não solicitado",
  pending: "Pendente",
  active: "Ativo",
  suspended: "Suspenso",
};

const payoutStatusLabel: Readonly<Record<string, string>> = {
  draft: "Rascunho",
  paid: "Pago",
  cancelled: "Cancelado",
};

const SummaryCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) => (
  <Card className="border-white/10 bg-white/5">
    <CardContent className="flex items-center gap-4 p-5">
      <span className="rounded-xl bg-violet-500/15 p-3 text-violet-200">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const PaginationControls = ({
  label,
  page,
  total,
  isFetching,
  onPageChange,
}: {
  label: string;
  page: number;
  total: number;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page + 1, pageCount);
  const firstItem = total === 0 ? 0 : page * pageSize + 1;
  const lastItem = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-400" aria-live="polite">
        {total === 0
          ? `Nenhum ${label}`
          : `${firstItem}–${lastItem} de ${total} ${label}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/20 bg-transparent"
          disabled={page === 0 || isFetching}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          Anterior
        </Button>
        <span className="min-w-24 text-center text-xs text-gray-400">
          Página {currentPage} de {pageCount}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/20 bg-transparent"
          disabled={page + 1 >= pageCount || isFetching}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
};

const OfferTermsForm = ({
  offer,
}: {
  offer: AffiliateAdminDashboard["offers"][number];
}) => {
  const configureTerms = useConfigureAffiliateTerms();
  const { toast } = useToast();
  const [commissionPercent, setCommissionPercent] = useState(
    offer.commission_bps === null ? "10" : String(offer.commission_bps / 100),
  );
  const [windowDays, setWindowDays] = useState(
    offer.attribution_window_days === null
      ? "30"
      : String(offer.attribution_window_days),
  );
  const [active, setActive] = useState(offer.terms_active);

  const submit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    const percent = Number(commissionPercent.replace(",", "."));
    const days = Number(windowDays);
    const commissionBps = Math.round(percent * 100);

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      toast({
        title: "Percentual inválido",
        description:
          "Informe um percentual maior que zero e de no máximo 100%.",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast({
        title: "Janela inválida",
        description: "Informe uma janela entre 1 e 365 dias.",
        variant: "destructive",
      });
      return;
    }

    try {
      await configureTerms.mutateAsync({
        subjectType: offer.subject_type,
        subjectId: offer.subject_id,
        commissionBps,
        attributionWindowDays: days,
        active,
      });
      toast({
        title: "Termos atualizados",
        description: "Novas atribuições usarão a configuração salva.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível atualizar os termos",
        description: getErrorMessage(
          error,
          "Revise os valores e tente novamente.",
        ),
        variant: "destructive",
      });
    }
  };

  return (
    <form
      className="rounded-xl border border-white/10 bg-black/20 p-4"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">{offer.title}</p>
          <p className="mt-1 text-xs text-gray-500">
            {offer.subject_type === "course" ? "Curso" : "Produto digital"} ·{" "}
            {offer.publication_status}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-300">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Ativo
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-gray-400">
          Comissão (%)
          <input
            className={fieldClass}
            inputMode="decimal"
            value={commissionPercent}
            onChange={(event) => setCommissionPercent(event.target.value)}
            required
          />
        </label>
        <label className="space-y-1 text-xs text-gray-400">
          Janela (dias)
          <input
            className={fieldClass}
            type="number"
            min={1}
            max={365}
            value={windowDays}
            onChange={(event) => setWindowDays(event.target.value)}
            required
          />
        </label>
      </div>
      <Button
        type="submit"
        size="sm"
        className="btn-brand mt-4"
        disabled={configureTerms.isPending}
      >
        {configureTerms.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Settings2 className="mr-2 h-4 w-4" />
        )}
        Salvar termos
      </Button>
    </form>
  );
};

const AffiliatesAdmin = () => {
  const [profilePage, setProfilePage] = useState(0);
  const [offerPage, setOfferPage] = useState(0);
  const [commissionPage, setCommissionPage] = useState(0);
  const [payoutPage, setPayoutPage] = useState(0);
  const dashboardQuery = useAffiliateAdminDashboard({
    profileLimit: pageSize,
    profileOffset: profilePage * pageSize,
    offerLimit: pageSize,
    offerOffset: offerPage * pageSize,
    commissionLimit: pageSize,
    commissionOffset: commissionPage * pageSize,
    payoutLimit: pageSize,
    payoutOffset: payoutPage * pageSize,
  });
  const setProfileStatus = useSetAffiliateProfileStatus();
  const createPayout = useCreateAffiliatePayout();
  const markPaid = useMarkAffiliatePayoutPaid();
  const cancelPayout = useCancelAffiliatePayout();
  const { toast } = useToast();

  const commissionsByAffiliate = useMemo(() => {
    const grouped = new Map<
      string,
      AffiliateAdminDashboard["available_commissions"]
    >();
    for (const commission of dashboardQuery.data?.available_commissions ?? []) {
      const current = grouped.get(commission.affiliate_user_id) ?? [];
      current.push(commission);
      grouped.set(commission.affiliate_user_id, current);
    }
    return [...grouped.entries()];
  }, [dashboardQuery.data?.available_commissions]);

  const activateProfile = async (userId: string): Promise<void> => {
    try {
      await setProfileStatus.mutateAsync({ userId, status: "active" });
      toast({
        title: "Afiliado ativado",
        description: "O perfil já pode criar links.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível ativar",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
    }
  };

  const suspendProfile = async (userId: string): Promise<void> => {
    const reason = window.prompt("Informe o motivo da suspensão:")?.trim();
    if (!reason) return;
    try {
      await setProfileStatus.mutateAsync({
        userId,
        status: "suspended",
        reason,
      });
      toast({
        title: "Afiliado suspenso",
        description:
          "Links ativos e atribuições pendentes foram desativados.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível suspender",
        description: getErrorMessage(
          error,
          "Revise o motivo e tente novamente.",
        ),
        variant: "destructive",
      });
    }
  };

  const createAffiliatePayout = async (
    affiliateUserId: string,
    commissionIds: string[],
  ): Promise<void> => {
    const notes = window.prompt("Observação opcional do repasse:")?.trim() ?? null;
    try {
      await createPayout.mutateAsync({ affiliateUserId, commissionIds, notes });
      setCommissionPage(0);
      setPayoutPage(0);
      toast({
        title: "Repasse criado",
        description:
          "As comissões selecionadas foram reservadas em um rascunho.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar o repasse",
        description: getErrorMessage(
          error,
          "As comissões podem ter mudado de estado.",
        ),
        variant: "destructive",
      });
    }
  };

  const payPayout = async (payoutId: string): Promise<void> => {
    const externalReference = window
      .prompt("Informe a referência externa do pagamento:")
      ?.trim();
    if (!externalReference) return;
    try {
      await markPaid.mutateAsync({ payoutId, externalReference });
      toast({
        title: "Repasse pago",
        description: "A referência externa foi registrada.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível confirmar o pagamento",
        description: getErrorMessage(
          error,
          "Verifique o estado das comissões.",
        ),
        variant: "destructive",
      });
    }
  };

  const cancelDraft = async (payoutId: string): Promise<void> => {
    const reason = window.prompt("Informe o motivo do cancelamento:")?.trim();
    if (!reason) return;
    try {
      await cancelPayout.mutateAsync({ payoutId, reason });
      setCommissionPage(0);
      toast({
        title: "Repasse cancelado",
        description: "As comissões voltaram ao saldo disponível.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível cancelar",
        description: getErrorMessage(
          error,
          "O repasse pode não estar mais em rascunho.",
        ),
        variant: "destructive",
      });
    }
  };

  if (dashboardQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-9 w-9 animate-spin text-violet-300" />
      </main>
    );
  }

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <Card className="mx-auto max-w-2xl border-red-500/20 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-red-100">
              Administração indisponível
            </CardTitle>
            <CardDescription className="text-red-100/80">
              {getErrorMessage(
                dashboardQuery.error,
                "Não foi possível carregar os afiliados.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={() => void dashboardQuery.refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const dashboard = dashboardQuery.data;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              Administração
            </p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <ShieldCheck className="h-9 w-9" />
              Programa de afiliados
            </h1>
            <p className="mt-3 max-w-2xl text-gray-400">
              Aprovação, ofertas, atribuição, comissões e pagamentos manuais
              auditados.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin/cursos">
              <Button
                variant="outline"
                className="border-white/20 bg-transparent"
              >
                Cursos
              </Button>
            </Link>
            <Link to="/admin/produtos">
              <Button className="btn-brand">Produtos</Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Afiliados"
            value={String(dashboard.summary.affiliates)}
            icon={Users}
          />
          <SummaryCard
            label="Ativos"
            value={String(dashboard.summary.active_affiliates)}
            icon={ShieldCheck}
          />
          <SummaryCard
            label="Cliques"
            value={String(dashboard.summary.clicks)}
            icon={MousePointerClick}
          />
          <SummaryCard
            label="Disponível"
            value={formatCurrency(dashboard.summary.available_cents)}
            icon={BadgeDollarSign}
          />
          <SummaryCard
            label="Pago"
            value={formatCurrency(dashboard.summary.paid_cents)}
            icon={CreditCard}
          />
        </section>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Perfis</CardTitle>
            <CardDescription className="text-gray-400">
              A suspensão desativa links e invalida atribuições ainda não
              convertidas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="pb-3">Afiliado</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Links</th>
                  <th className="pb-3">Cliques</th>
                  <th className="pb-3">Conversões</th>
                  <th className="pb-3">Disponível</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {dashboard.profiles.map((profile) => (
                  <tr key={profile.user_id}>
                    <td className="py-4">
                      <p className="font-medium text-white">
                        {profile.display_name ?? "Sem nome de exibição"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-gray-500">
                        {profile.user_id}
                      </p>
                    </td>
                    <td className="py-4">
                      {profileStatusLabel[profile.status] ?? profile.status}
                    </td>
                    <td className="py-4">{profile.links}</td>
                    <td className="py-4">{profile.clicks}</td>
                    <td className="py-4">{profile.conversions}</td>
                    <td className="py-4">
                      {formatCurrency(profile.available_cents)}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {profile.status !== "active" ? (
                          <Button
                            type="button"
                            size="sm"
                            className="btn-brand"
                            disabled={setProfileStatus.isPending}
                            onClick={() => void activateProfile(profile.user_id)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Ativar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={setProfileStatus.isPending}
                            onClick={() => void suspendProfile(profile.user_id)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Suspender
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              label="perfis"
              page={profilePage}
              total={dashboard.totals.profiles}
              isFetching={dashboardQuery.isFetching}
              onPageChange={setProfilePage}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Ofertas e termos</CardTitle>
            <CardDescription className="text-gray-400">
              Nenhuma comissão é criada sem taxa explicitamente configurada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {dashboard.offers.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Nenhum curso ou produto elegível.
                </p>
              ) : (
                dashboard.offers.map((offer) => (
                  <OfferTermsForm
                    key={`${offer.subject_type}:${offer.subject_id}`}
                    offer={offer}
                  />
                ))
              )}
            </div>
            <PaginationControls
              label="ofertas"
              page={offerPage}
              total={dashboard.totals.offers}
              isFetching={dashboardQuery.isFetching}
              onPageChange={setOfferPage}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">
              Comissões disponíveis
            </CardTitle>
            <CardDescription className="text-gray-400">
              Cada repasse reserva exatamente as comissões exibidas para um
              afiliado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commissionsByAffiliate.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nenhuma comissão disponível para repasse.
              </p>
            ) : (
              commissionsByAffiliate.map(([affiliateUserId, commissions]) => {
                const total = commissions.reduce(
                  (sum, item) => sum + item.commission_amount_cents,
                  0,
                );
                return (
                  <div
                    key={affiliateUserId}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono text-xs text-gray-400">
                          {affiliateUserId}
                        </p>
                        <p className="mt-2 text-sm text-white">
                          {commissions.length} comissão(ões) ·{" "}
                          {formatCurrency(total)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="btn-brand"
                        disabled={createPayout.isPending}
                        onClick={() =>
                          void createAffiliatePayout(
                            affiliateUserId,
                            commissions.map((item) => item.id),
                          )
                        }
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Criar repasse
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            <PaginationControls
              label="comissões"
              page={commissionPage}
              total={dashboard.totals.available_commissions}
              isFetching={dashboardQuery.isFetching}
              onPageChange={setCommissionPage}
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Histórico de repasses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="pb-3">Criado</th>
                  <th className="pb-3">Afiliado</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Referência</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {dashboard.payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="py-4">{formatDate(payout.created_at)}</td>
                    <td className="py-4 font-mono text-xs text-gray-400">
                      {payout.affiliate_user_id}
                    </td>
                    <td className="py-4">
                      {formatCurrency(payout.amount_cents)}
                    </td>
                    <td className="py-4">
                      {payoutStatusLabel[payout.status] ?? payout.status}
                    </td>
                    <td className="py-4">
                      {payout.external_reference ?? "—"}
                    </td>
                    <td className="py-4 text-right">
                      {payout.status === "draft" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="btn-brand"
                            disabled={markPaid.isPending}
                            onClick={() => void payPayout(payout.id)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Marcar pago
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={cancelPayout.isPending}
                            onClick={() => void cancelDraft(payout.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              label="repasses"
              page={payoutPage}
              total={dashboard.totals.payouts}
              isFetching={dashboardQuery.isFetching}
              onPageChange={setPayoutPage}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AffiliatesAdmin;
