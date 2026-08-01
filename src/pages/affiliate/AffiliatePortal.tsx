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
import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import {
  useAffiliatePortal,
  useCreateAffiliateLink,
  useDeactivateAffiliateLink,
  useRequestAffiliateProfile,
} from "@/hooks/useAffiliateProgram";
import { useToast } from "@/hooks/use-toast";
import { formatAppDate } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";

const formatCurrency = (amountCents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    amountCents / 100,
  );

const formatDate = (value: string | null): string =>
  formatAppDate(value);

const commissionStatusLabel: Readonly<Record<string, string>> = {
  pending: "Pendente",
  available: "Disponível",
  held: "Retida",
  paid: "Paga",
  reversed: "Revertida",
};

const commissionStatusVariant: Readonly<Record<string, BadgeProps["variant"]>> = {
  pending: "warning",
  available: "success",
  held: "warning",
  paid: "info",
  reversed: "destructive",
};

const payoutStatusLabel: Readonly<Record<string, string>> = {
  draft: "Em preparação",
  paid: "Pago",
  cancelled: "Cancelado",
};

const payoutStatusVariant: Readonly<Record<string, BadgeProps["variant"]>> = {
  draft: "warning",
  paid: "success",
  cancelled: "destructive",
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
  <Card variant="affiliate">
    <CardContent className="flex items-center gap-4 p-5">
      <span className="rounded-xl bg-affiliate/15 p-3 text-affiliate">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-2xl font-bold text-foreground">{value}</p>
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
      toast({
        title: "Link criado",
        description: "O link rastreável já está disponível.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar o link",
        description: getErrorMessage(
          error,
          "A oferta pode não estar mais disponível.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (linkId: string): Promise<void> => {
    try {
      await deactivateLink.mutateAsync(linkId);
      toast({
        title: "Link desativado",
        description: "Novos cliques não serão atribuídos.",
      });
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
      <AppPageShell
        context="affiliate"
        eyebrow="Programa de afiliados"
        title="Portal do afiliado"
      >
        <PageState
          variant="loading"
          title="Carregando dados do afiliado"
          description="Consultando perfil, links, comissões e repasses auditados."
        />
      </AppPageShell>
    );
  }

  if (portalQuery.error || !portalQuery.data) {
    return (
      <AppPageShell
        context="affiliate"
        eyebrow="Programa de afiliados"
        title="Portal do afiliado"
      >
        <PageState
          variant="error"
          icon={ShieldAlert}
          title="Portal indisponível"
          description={getErrorMessage(
            portalQuery.error,
            "Não foi possível carregar seus dados.",
          )}
          action={
            <Button type="button" variant="context" onClick={() => void portalQuery.refetch()}>
              <RefreshCw aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      </AppPageShell>
    );
  }

  const portal = portalQuery.data;

  if (!portal.profile) {
    return (
      <AppPageShell
        context="affiliate"
        eyebrow="Programa de afiliados"
        title="Solicitar perfil de afiliado"
        description="A conta possui o papel de afiliado e precisa solicitar a ativação do programa."
        actions={
          <Button asChild variant="outline">
            <Link to="/editar-perfil">Editar dados da conta</Link>
          </Button>
        }
      >
        <Card variant="affiliate" className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="h-6 w-6 text-affiliate" aria-hidden="true" />
              Dados da solicitação
            </CardTitle>
            <CardDescription>
              A ativação é administrativa. Links e comissões permanecem indisponíveis
              enquanto a solicitação estiver em análise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void handleProfileRequest(event)}>
              <div className="space-y-2">
                <label htmlFor="affiliate-display-name" className="text-sm font-medium">
                  Nome de exibição
                </label>
                <Input
                  id="affiliate-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Como seu nome será exibido"
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="context"
                className="w-full"
                disabled={requestProfile.isPending}
              >
                {requestProfile.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Enviar solicitação
              </Button>
            </form>
          </CardContent>
        </Card>
      </AppPageShell>
    );
  }

  if (portal.profile.status !== "active") {
    const suspended = portal.profile.status === "suspended";
    return (
      <AppPageShell
        context="affiliate"
        eyebrow="Programa de afiliados"
        title={suspended ? "Perfil suspenso" : "Solicitação em análise"}
        description={
          suspended
            ? portal.profile.suspension_reason ??
              "O perfil foi suspenso pela administração."
            : "Os links e as comissões serão liberados após a aprovação administrativa."
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/editar-perfil">Editar perfil</Link>
          </Button>
        }
      >
        <Card variant="affiliate" className="mx-auto max-w-2xl">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant={suspended ? "destructive" : "warning"}>
                {suspended ? "Suspenso" : "Pendente"}
              </Badge>
              <Badge variant="outline">Código {portal.profile.code}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Solicitado em {formatDate(portal.profile.created_at)}
            </p>
          </CardContent>
        </Card>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell
      context="affiliate"
      eyebrow="Programa de afiliados"
      title="Portal do afiliado"
      description={`Código ${portal.profile.code} · atribuição last-click auditada.`}
      navigation={
        <span className="inline-flex items-center gap-2 text-sm font-medium text-affiliate">
          <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
          Operação financeira
        </span>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/editar-perfil">Meu perfil</Link>
          </Button>
          <Button asChild variant="context">
            <Link to="/marketplace">Marketplace</Link>
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          aria-label="Resumo do afiliado"
        >
          <SummaryCard
            label="Cliques"
            value={String(portal.summary.clicks)}
            icon={MousePointerClick}
          />
          <SummaryCard
            label="Conversões"
            value={String(portal.summary.conversions)}
            icon={ReceiptText}
          />
          <SummaryCard
            label="Disponível"
            value={formatCurrency(portal.summary.available_cents)}
            icon={BadgeDollarSign}
          />
          <SummaryCard
            label="Retido"
            value={formatCurrency(portal.summary.held_cents)}
            icon={ShieldAlert}
          />
          <SummaryCard
            label="Pago"
            value={formatCurrency(portal.summary.paid_cents)}
            icon={UserRoundCheck}
          />
        </section>

        <Card variant="affiliate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-affiliate" aria-hidden="true" />
              Ofertas disponíveis
            </CardTitle>
            <CardDescription>
              A taxa e a janela são definidas pela administração e congeladas na
              atribuição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portal.offers.length === 0 ? (
              <PageState
                variant="empty"
                compact
                title="Nenhuma oferta disponível"
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {portal.offers.map((offer) => (
                  <article
                    key={`${offer.subject_type}:${offer.subject_id}`}
                    className="surface-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{offer.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {(offer.commission_bps / 100).toLocaleString("pt-BR")}% ·
                          janela de {offer.attribution_window_days} dias
                        </p>
                      </div>
                      <Badge variant="affiliate">
                        {offer.subject_type === "course" ? "Curso" : "Produto"}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {offer.link_code ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="context"
                            onClick={() => void copyShareUrl(offer.link_code!)}
                          >
                            <Copy aria-hidden="true" />
                            Copiar link
                          </Button>
                          <Button asChild type="button" size="sm" variant="outline">
                            <a href={`/r/${offer.link_code}`} target="_blank" rel="noreferrer">
                              <ExternalLink aria-hidden="true" />
                              Abrir
                            </a>
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="context"
                          disabled={createLink.isPending}
                          onClick={() =>
                            void handleCreateLink(offer.subject_type, offer.subject_id)
                          }
                        >
                          Criar link
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="affiliate">
          <CardHeader>
            <CardTitle>Links rastreáveis</CardTitle>
            <CardDescription>
              Links ativos recebem novos cliques; links inativos preservam o histórico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portal.links.length === 0 ? (
              <PageState variant="empty" compact title="Nenhum link criado" />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3">Código</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Cliques</th>
                      <th scope="col" className="px-4 py-3">Conversões</th>
                      <th scope="col" className="px-4 py-3">Comissão</th>
                      <th scope="col" className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {portal.links.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {item.code}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={item.status === "active" ? "success" : "outline"}>
                            {item.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">{item.clicks}</td>
                        <td className="px-4 py-4">{item.conversions}</td>
                        <td className="px-4 py-4">
                          {formatCurrency(item.commission_cents)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              aria-label={`Copiar link ${item.code}`}
                              onClick={() => void copyShareUrl(item.code)}
                            >
                              <Copy aria-hidden="true" />
                            </Button>
                            {item.status === "active" ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                aria-label={`Desativar link ${item.code}`}
                                disabled={deactivateLink.isPending}
                                onClick={() => void handleDeactivate(item.id)}
                              >
                                <Power aria-hidden="true" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card variant="affiliate">
            <CardHeader>
              <CardTitle>Comissões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {portal.commissions.length === 0 ? (
                <PageState
                  variant="empty"
                  compact
                  title="Nenhuma comissão registrada"
                />
              ) : (
                portal.commissions.map((commission) => (
                  <article key={commission.id} className="surface-muted p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {commission.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(commission.created_at)} ·{" "}
                          {(commission.commission_bps / 100).toLocaleString("pt-BR")}%
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-affiliate">
                        {formatCurrency(commission.commission_amount_cents)}
                      </span>
                    </div>
                    <Badge
                      className="mt-3"
                      variant={commissionStatusVariant[commission.status] ?? "outline"}
                    >
                      {commissionStatusLabel[commission.status] ?? commission.status}
                    </Badge>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <Card variant="affiliate">
            <CardHeader>
              <CardTitle>Repasses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {portal.payouts.length === 0 ? (
                <PageState
                  variant="empty"
                  compact
                  title="Nenhum repasse registrado"
                />
              ) : (
                portal.payouts.map((payout) => (
                  <article key={payout.id} className="surface-muted p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant={payoutStatusVariant[payout.status] ?? "outline"}>
                          {payoutStatusLabel[payout.status] ?? payout.status}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Criado em {formatDate(payout.created_at)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-affiliate">
                        {formatCurrency(payout.amount_cents)}
                      </span>
                    </div>
                    {payout.external_reference ? (
                      <p className="mt-3 break-all text-xs text-muted-foreground">
                        Referência: {payout.external_reference}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppPageShell>
  );
};

export default AffiliatePortal;
