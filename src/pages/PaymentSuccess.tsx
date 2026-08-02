import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Home,
  Loader2,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import {
  checkoutIntentIdSchema,
  type CheckoutReturnFound,
} from "@/contracts/checkout-return";
import { useCheckoutReturn } from "@/hooks/useCheckoutReturn";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import {
  classifyCheckoutReturn,
  shouldPollCheckoutReturn,
  type CheckoutReturnViewState,
} from "@/lib/checkout-return";
import { getErrorMessage } from "@/lib/error-message";

interface StateCopy {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tone: string;
}

const stateCopy: Record<CheckoutReturnViewState, StateCopy> = {
  pending: {
    title: "Aguardando confirmação do pagamento",
    description:
      "O checkout retornou, mas o webhook do provedor ainda não confirmou o pagamento desta compra.",
    icon: Clock3,
    tone: "text-amber-300",
  },
  finalizing_access: {
    title: "Pagamento confirmado; liberando acesso",
    description:
      "A ordem exata já está paga. A plataforma está concluindo a matrícula ou a entrega digital.",
    icon: Loader2,
    tone: "text-amber-300",
  },
  success: {
    title: "Compra confirmada",
    description:
      "O pagamento e o acesso desta compra foram confirmados pelo estado persistido da plataforma.",
    icon: CheckCircle2,
    tone: "text-emerald-400",
  },
  cancelled: {
    title: "Checkout cancelado",
    description: "Nenhum acesso foi liberado por este checkout cancelado.",
    icon: Ban,
    tone: "text-muted-foreground",
  },
  expired: {
    title: "Checkout expirado",
    description: "O prazo deste checkout terminou antes da confirmação do pagamento.",
    icon: Clock3,
    tone: "text-amber-300",
  },
  failed: {
    title: "Não foi possível concluir o checkout",
    description: "O provedor ou a tentativa de pagamento registrou uma falha.",
    icon: AlertTriangle,
    tone: "text-destructive",
  },
  refund_pending: {
    title: "Reembolso em processamento",
    description: "O reembolso desta compra foi iniciado e ainda não terminou.",
    icon: Undo2,
    tone: "text-amber-300",
  },
  refunded: {
    title: "Pagamento reembolsado",
    description: "O pagamento desta compra foi reembolsado e o acesso não deve ser considerado ativo.",
    icon: Undo2,
    tone: "text-muted-foreground",
  },
  chargeback_pending: {
    title: "Compra em análise de contestação",
    description: "Existe uma contestação ou disputa financeira em andamento para esta compra.",
    icon: ShieldAlert,
    tone: "text-amber-300",
  },
  chargeback_won: {
    title: "Contestação revertida",
    description: "A contestação foi revertida. O estado do acesso abaixo continua sendo a fonte de verdade.",
    icon: CheckCircle2,
    tone: "text-emerald-400",
  },
  chargeback_lost: {
    title: "Contestação concluída contra a compra",
    description: "A contestação foi perdida e o acesso desta compra não deve permanecer liberado.",
    icon: ShieldAlert,
    tone: "text-destructive",
  },
  access_suspended: {
    title: "Acesso suspenso",
    description: "O pagamento existe, mas o entitlement desta compra está suspenso.",
    icon: ShieldAlert,
    tone: "text-amber-300",
  },
  access_revoked: {
    title: "Acesso revogado",
    description: "O entitlement desta compra foi revogado e não controla mais o acesso.",
    icon: Ban,
    tone: "text-destructive",
  },
};

const orderStatusLabel: Record<string, string> = {
  checkout_pending: "Checkout criado",
  payment_pending: "Pagamento pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  expired: "Expirado",
  refund_pending: "Reembolso pendente",
  refunded: "Reembolsado",
  chargeback_pending: "Contestação pendente",
  chargeback_won: "Contestação revertida",
  chargeback_lost: "Contestação perdida",
};

const billingTypeLabel: Record<string, string> = {
  unknown: "Não informado",
  pix: "Pix",
  credit_card: "Cartão de crédito",
};

const formatMoney = (amountCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);

const formatDateTime = (value: string | null | undefined): string =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Ainda não registrado";

const accessAction = (
  checkout: CheckoutReturnFound,
  role: string | undefined,
): { to: string; label: string; icon: LucideIcon } => {
  if (checkout.subject_type === "digital_product") {
    return { to: "/meus-produtos", label: "Abrir meus produtos", icon: PackageCheck };
  }
  if (role === "administrador_proprietario") {
    return {
      to: `/admin/cursos/${checkout.subject_id}/preview`,
      label: "Abrir preview do curso",
      icon: ReceiptText,
    };
  }
  if (role === "aluno") {
    return {
      to: `/aluno/cursos/${checkout.subject_id}`,
      label: "Acessar curso",
      icon: ReceiptText,
    };
  }
  return { to: "/portal", label: "Voltar ao portal", icon: Home };
};

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const rawCheckoutIntentId = searchParams.get("checkout_intent");
  const parsedCheckoutIntentId = checkoutIntentIdSchema.safeParse(
    rawCheckoutIntentId,
  );
  const checkoutIntentId = parsedCheckoutIntentId.success
    ? parsedCheckoutIntentId.data
    : null;
  const checkoutQuery = useCheckoutReturn(checkoutIntentId);
  const roleQuery = useCurrentRole();

  if (checkoutIntentId === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-xl">
          <PageState
            variant="error"
            title="Retorno de pagamento inválido"
            description="O endereço não contém um identificador de checkout válido. Nenhum acesso foi alterado por esta página."
            action={<Button asChild><Link to="/portal">Voltar ao portal</Link></Button>}
          />
        </div>
      </main>
    );
  }

  if (checkoutQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-xl">
          <PageState
            variant="loading"
            title="Consultando esta compra"
            description="Carregando o pedido, a tentativa de pagamento e o entitlement vinculados ao checkout retornado."
          />
        </div>
      </main>
    );
  }

  if (checkoutQuery.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-xl">
          <PageState
            variant="error"
            title="Não foi possível consultar esta compra"
            description={getErrorMessage(
              checkoutQuery.error,
              "O estado financeiro não pôde ser carregado agora.",
            )}
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => void checkoutQuery.refetch()}
              >
                Tentar novamente
              </Button>
            }
          />
        </div>
      </main>
    );
  }

  const checkout = checkoutQuery.data;
  if (!checkout?.found) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-xl">
          <PageState
            variant="empty"
            title="Compra não encontrada"
            description="Este checkout não pertence à conta autenticada ou não existe. Nenhum detalhe financeiro foi exposto."
            action={<Button asChild><Link to="/portal">Voltar ao portal</Link></Button>}
          />
        </div>
      </main>
    );
  }

  const viewState = classifyCheckoutReturn(checkout);
  const copy = stateCopy[viewState];
  const StateIcon = copy.icon;
  const polling = shouldPollCheckoutReturn(checkout);
  const canOpenAccess =
    (viewState === "success" || viewState === "chargeback_won") &&
    checkout.entitlement?.status === "active" &&
    checkout.entitlement.controls_access;
  const primaryAction = accessAction(checkout, roleQuery.data?.role);
  const PrimaryIcon = primaryAction.icon;
  const retryPath =
    checkout.subject_type === "course" ? "/cursos" : "/marketplace";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="glass-card w-full max-w-2xl border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted/40">
            <StateIcon
              className={`h-10 w-10 ${copy.tone} ${viewState === "finalizing_access" ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </div>
          <CardTitle className="text-2xl">{copy.title}</CardTitle>
          <CardDescription className="mx-auto max-w-xl">
            {copy.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Detalhes da compra">
            <div className="surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Item
              </p>
              <p className="mt-2 font-semibold text-foreground">{checkout.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {checkout.subject_type === "course" ? "Curso" : "Produto digital"}
              </p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Valor
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {formatMoney(checkout.amount_cents)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {billingTypeLabel[checkout.attempt?.billing_type ?? "unknown"]}
              </p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Estado do pedido
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {checkout.order
                  ? orderStatusLabel[checkout.order.status] ?? checkout.order.status
                  : "Pedido ainda não criado"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirmação: {formatDateTime(checkout.order?.payment_confirmed_at)}
              </p>
            </div>
            <div className="surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Estado do acesso
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {checkout.entitlement
                  ? checkout.entitlement.status === "active"
                    ? "Ativo"
                    : checkout.entitlement.status === "suspended"
                      ? "Suspenso"
                      : "Revogado"
                  : "Ainda não criado"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Atualizado em {formatDateTime(checkout.updated_at)}
              </p>
            </div>
          </section>

          {checkout.failure_reason || checkout.failure_code ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              {checkout.failure_reason ?? checkout.failure_code}
            </div>
          ) : null}

          {polling ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              {checkoutQuery.isFetching ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Clock3 className="h-5 w-5 shrink-0" aria-hidden="true" />
              )}
              Esta página consulta automaticamente o estado persistido a cada três segundos enquanto a compra estiver em processamento.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {canOpenAccess ? (
              <Button asChild variant="context" className="w-full">
                <Link to={primaryAction.to}>
                  <PrimaryIcon aria-hidden="true" />
                  {primaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="context" className="w-full">
                <Link to={retryPath}>
                  <ReceiptText aria-hidden="true" />
                  Voltar às ofertas
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void checkoutQuery.refetch()}
              disabled={checkoutQuery.isFetching}
            >
              {checkoutQuery.isFetching ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              {checkoutQuery.isFetching ? "Atualizando..." : "Verificar novamente"}
            </Button>
            <Button asChild variant="secondary" className="w-full sm:col-span-2">
              <Link to="/portal">
                <Home aria-hidden="true" />
                Voltar ao portal
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default PaymentSuccess;
