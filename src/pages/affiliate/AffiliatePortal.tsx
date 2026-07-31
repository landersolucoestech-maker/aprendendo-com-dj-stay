import {
  BadgeDollarSign,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  MousePointerClick,
  Power,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAffiliatePortal,
  useCreateAffiliateLink,
  useDeactivateAffiliateLink,
  useRequestAffiliateProfile,
} from "@/hooks/useAffiliateProgram";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";

const formatCurrency = (amountCents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    amountCents / 100,
  );

const formatDate = (value: string | null): string =>
  value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value)) : "—";

const commissionStatusLabel: Readonly<Record<string, string>> = {
  pending: "Pendente",
  available: "Disponível",
  held: "Retida",
  paid: "Paga",
  reversed: "Revertida",
};

const payoutStatusLabel: Readonly<Record<string, string>> = {
  draft: "Em preparação",
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
  icon: typeof BadgeDollarSign;
}) => (
  <Card className="border-white/10 bg-white/5">
    <CardContent className="flex items-center gap-4 p-5">
      <span className="rounded-xl bg-violet-500/15 p-3 text-violet-200">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const AffiliatePortal = () => {
  const portalQuery = useAffiliatePortal();
  const requestProfile = useRequestAffiliateProfile();
  const createLink = useCreateAffiliateLink();
  const deactivateLink = useDeactivateAffiliateLink();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");

  const copyShareUrl = async (code: string): Promise<void> => {
    const shareUrl = `${window.location.origin}/r/${code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado", description: shareUrl });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Copie o endereço diretamente pela barra do navegador.",
        variant: "destructive",
      });
    }
  };

  const handleProfileRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await requestProfile.mutateAsync(displayName);
      toast({
        title: "Solicitação registrada",
        description: "Seu perfil será liberado após a aprovação administrativa.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível solicitar o perfil",
        description: getErrorMessage(error, "Revise os dados e tente novamente."),
        variant: "destructive",
      });
    }
  };

  const handleCreateLink = async (
    subjectType: "course" | "digital_product",
    subjectId: string,
  ): Promise<void> => {
    try {
      await createLink.mutateAsync({
        subjectType,
        subjectId,
        destinationPath: subjectType === "digital_product" ? "/marketplace" : "/",
      });
      toast({ title: "Link criado", description: "O link rastreável já está disponível." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar o link",
        description: getErrorMessage(error, "A oferta pode não estar mais disponível."),
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (linkId: string): Promise<void> => {
    try {
      await deactivateLink.mutateAsync(linkId);
      toast({ title: "Link desativado", description: "Novos cliques não serão atribuídos." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível desativar o link",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
    }
  };

  if (portalQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-9 w-9 animate-spin text-violet-300" />
      </main>
    );
  }

  if (portalQuery.error || !portalQuery.data) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <Card className="mx-auto max-w-2xl border-red-500/20 bg-red-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-100">
              <ShieldAlert className="h-5 w-5" />
              Portal indisponível
            </CardTitle>
            <CardDescription className="text-red-100/80">
              {getErrorMessage(portalQuery.error, "Não foi possível carregar seus dados.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => void portalQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const portal = portalQuery.data;

  if (!portal.profile) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <UserRoundCheck className="h-6 w-6" />
                Solicitar perfil de afiliado
              </CardTitle>
              <CardDescription className="text-gray-400">
                A conta já possui o papel de afiliado, mas ainda precisa solicitar a ativação do
                programa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void handleProfileRequest(event)}>
                <input
                  className={fieldClass}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Nome de exibição"
                  minLength={2}
                  maxLength={120}
                  required
                />
                <Button className="btn-brand w-full" disabled={requestProfile.isPending}>
                  {requestProfile.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Enviar solicitação
                </Button>
              </form>
            </CardContent>
          </Card>
          <Link to="/editar-perfil" className="block text-center text-sm text-violet-200">
            Editar dados da conta
          </Link>
        </div>
      </main>
    );
  }

  if (portal.profile.status !== "active") {
    const suspended = portal.profile.status === "suspended";
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <Card className="mx-auto max-w-2xl border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">
              {suspended ? "Perfil suspenso" : "Solicitação em análise"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {suspended
                ? portal.profile.suspension_reason ?? "O perfil foi suspenso pela administração."
                : "Os links e as comissões serão liberados após a aprovação administrativa."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300">
            <p>Código: {portal.profile.code}</p>
            <p>Solicitado em: {formatDate(portal.profile.created_at)}</p>
            <Link to="/editar-perfil">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Editar perfil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Programa de afiliados</p>
            <h1 className="mt-3 text-4xl font-bold">Portal do afiliado</h1>
            <p className="mt-3 text-gray-400">
              Código {portal.profile.code} · atribuição last-click auditada.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/editar-perfil">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Meu perfil
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button className="btn-brand">Marketplace</Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo do afiliado">
          <SummaryCard label="Cliques" value={String(portal.summary.clicks)} icon={MousePointerClick} />
          <SummaryCard label="Conversões" value={String(portal.summary.conversions)} icon={ReceiptText} />
          <SummaryCard label="Disponível" value={formatCurrency(portal.summary.available_cents)} icon={BadgeDollarSign} />
          <SummaryCard label="Retido" value={formatCurrency(portal.summary.held_cents)} icon={ShieldAlert} />
          <SummaryCard label="Pago" value={formatCurrency(portal.summary.paid_cents)} icon={UserRoundCheck} />
        </section>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Link2 className="h-5 w-5" />
              Ofertas disponíveis
            </CardTitle>
            <CardDescription className="text-gray-400">
              A taxa e a janela são definidas pela administração e congeladas na atribuição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portal.offers.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma oferta está disponível.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {portal.offers.map((offer) => (
                  <div key={`${offer.subject_type}:${offer.subject_id}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{offer.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {(offer.commission_bps / 100).toLocaleString("pt-BR")}% · janela de {offer.attribution_window_days} dias
                        </p>
                      </div>
                      <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-100">
                        {offer.subject_type === "course" ? "Curso" : "Produto"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {offer.link_code ? (
                        <>
                          <Button type="button" size="sm" onClick={() => void copyShareUrl(offer.link_code!)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar link
                          </Button>
                          <a href={`/r/${offer.link_code}`} target="_blank" rel="noreferrer">
                            <Button type="button" size="sm" variant="outline" className="border-white/20 bg-transparent">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Abrir
                            </Button>
                          </a>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="btn-brand"
                          disabled={createLink.isPending}
                          onClick={() => void handleCreateLink(offer.subject_type, offer.subject_id)}
                        >
                          Criar link
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Links rastreáveis</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-gray-500">
                <tr><th className="pb-3">Código</th><th className="pb-3">Status</th><th className="pb-3">Cliques</th><th className="pb-3">Conversões</th><th className="pb-3">Comissão</th><th className="pb-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {portal.links.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 font-mono text-xs text-gray-300">{item.code}</td>
                    <td className="py-4">{item.status === "active" ? "Ativo" : "Inativo"}</td>
                    <td className="py-4">{item.clicks}</td>
                    <td className="py-4">{item.conversions}</td>
                    <td className="py-4">{formatCurrency(item.commission_cents)}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" className="border-white/20 bg-transparent" onClick={() => void copyShareUrl(item.code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {item.status === "active" ? (
                          <Button type="button" size="sm" variant="destructive" disabled={deactivateLink.isPending} onClick={() => void handleDeactivate(item.id)}>
                            <Power className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-white">Comissões</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {portal.commissions.length === 0 ? <p className="text-sm text-gray-400">Nenhuma comissão registrada.</p> : portal.commissions.map((commission) => (
                <div key={commission.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4"><div><p className="font-medium text-white">{commission.title}</p><p className="mt-1 text-xs text-gray-500">{formatDate(commission.created_at)} · {(commission.commission_bps / 100).toLocaleString("pt-BR")}%</p></div><span className="text-sm font-semibold text-violet-100">{formatCurrency(commission.commission_amount_cents)}</span></div>
                  <p className="mt-3 text-xs text-gray-400">Status: {commissionStatusLabel[commission.status] ?? commission.status}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-white">Repasses</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {portal.payouts.length === 0 ? <p className="text-sm text-gray-400">Nenhum repasse registrado.</p> : portal.payouts.map((payout) => (
                <div key={payout.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4"><div><p className="font-medium text-white">{payoutStatusLabel[payout.status] ?? payout.status}</p><p className="mt-1 text-xs text-gray-500">Criado em {formatDate(payout.created_at)}</p></div><span className="text-sm font-semibold text-violet-100">{formatCurrency(payout.amount_cents)}</span></div>
                  {payout.external_reference ? <p className="mt-3 text-xs text-gray-400">Referência: {payout.external_reference}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default AffiliatePortal;
