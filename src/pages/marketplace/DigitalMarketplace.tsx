import {
  BadgeCheck,
  CreditCard,
  Loader2,
  PackageOpen,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { Link } from "react-router-dom";

import { AppPageShell } from "@/components/layout/AppPageShell";
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
import type { DigitalProduct } from "@/contracts/marketplace";
import {
  useMarketplaceProductLicenses,
  useMarketplaceProducts,
} from "@/hooks/useDigitalMarketplace";
import {
  getHostedCheckoutIdempotencyKey,
  useHostedCheckout,
} from "@/hooks/useHostedCheckout";
import { getErrorMessage } from "@/lib/error-message";

const formatCurrency = (amount: number, currencyCode: string): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(amount);

const licenseKindLabel: Readonly<Record<string, string>> = {
  personal: "Pessoal",
  commercial: "Comercial",
  extended: "Estendida",
  custom: "Personalizada",
};

const getDisplayedPrice = (product: DigitalProduct): number => {
  const now = Date.now();
  const startsAt = product.promotion_starts_at
    ? Date.parse(product.promotion_starts_at)
    : Number.NEGATIVE_INFINITY;
  const endsAt = product.promotion_ends_at
    ? Date.parse(product.promotion_ends_at)
    : Number.POSITIVE_INFINITY;
  const promotionIsActive =
    product.promotional_price_amount !== null && now >= startsAt && now < endsAt;

  return promotionIsActive
    ? product.promotional_price_amount ?? product.price_amount
    : product.price_amount;
};

const ProductCard = ({ product }: { product: DigitalProduct }) => {
  const licensesQuery = useMarketplaceProductLicenses(product.id);
  const checkoutMutation = useHostedCheckout();
  const publishedLicenses = (licensesQuery.data ?? []).filter(
    (license) => license.status === "published",
  );
  const checkoutLicense =
    publishedLicenses.find((license) => license.is_default) ??
    publishedLicenses[0] ??
    null;
  const displayedPrice = getDisplayedPrice(product);

  const startCheckout = async (): Promise<void> => {
    if (!checkoutLicense) return;

    try {
      const result = await checkoutMutation.mutateAsync({
        subjectType: "digital_product",
        subjectId: product.id,
        licenseId: checkoutLicense.id,
        idempotencyKey: getHostedCheckoutIdempotencyKey(
          "digital_product",
          product.id,
          checkoutLicense.id,
        ),
      });
      window.location.assign(result.checkoutUrl);
    } catch {
      // A mutação mantém o erro validado para apresentação abaixo.
    }
  };

  return (
    <Card
      variant="marketplace"
      className="interactive-surface flex h-full flex-col"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>{product.title}</CardTitle>
            <CardDescription className="mt-2">
              {product.short_description ??
                "Produto digital publicado no marketplace."}
            </CardDescription>
          </div>
          {product.affiliate_eligible ? (
            <Badge variant="affiliate" className="shrink-0 gap-1">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Afiliável
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {product.description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        <div className="surface-muted flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Valor
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCurrency(displayedPrice, product.currency_code)}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              O valor definitivo é validado novamente pelo servidor.
            </p>
          </div>
          {product.category ? (
            <Badge variant="marketplace" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {product.category}
            </Badge>
          ) : null}
        </div>

        <section aria-labelledby={`licenses-${product.id}`}>
          <h3 id={`licenses-${product.id}`} className="mb-2 text-sm font-semibold">
            Licenças publicadas
          </h3>
          {licensesQuery.isLoading ? (
            <PageState
              variant="loading"
              compact
              title="Carregando licenças"
            />
          ) : licensesQuery.error ? (
            <PageState
              variant="error"
              compact
              title="Licenças indisponíveis"
              description={getErrorMessage(
                licensesQuery.error,
                "Não foi possível carregar as licenças.",
              )}
            />
          ) : publishedLicenses.length === 0 ? (
            <PageState
              variant="empty"
              compact
              title="Nenhuma licença disponível"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {publishedLicenses.map((license) => (
                <Badge
                  key={license.id}
                  variant={license.id === checkoutLicense?.id ? "marketplace" : "outline"}
                >
                  {licenseKindLabel[license.kind] ?? license.title}
                  {license.is_default ? " · padrão" : ""}
                </Badge>
              ))}
            </div>
          )}
        </section>

        {checkoutMutation.error ? (
          <PageState
            variant="error"
            compact
            title="Checkout indisponível"
            description={getErrorMessage(
              checkoutMutation.error,
              "Não foi possível abrir o checkout. Tente novamente.",
            )}
          />
        ) : null}

        <div className="mt-auto space-y-3">
          <Button
            type="button"
            variant="context"
            className="w-full"
            disabled={
              licensesQuery.isLoading ||
              checkoutLicense === null ||
              checkoutMutation.isPending
            }
            onClick={() => void startCheckout()}
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard aria-hidden="true" />
            )}
            {checkoutMutation.isPending
              ? "Preparando checkout..."
              : "Comprar com Pix ou cartão"}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            O pagamento é concluído no checkout hospedado. O redirecionamento de
            retorno não confirma a compra nem libera arquivos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const DigitalMarketplace = () => {
  const productsQuery = useMarketplaceProducts();

  return (
    <AppPageShell
      context="marketplace"
      eyebrow="Marketplace"
      title="Produtos digitais"
      description="Catálogo oficial de packs, samples, presets, projetos e outros materiais digitais publicados."
      navigation={
        <span className="inline-flex items-center gap-2 text-sm font-medium text-marketplace">
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          Catálogo oficial
        </span>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/portal">Voltar ao portal</Link>
          </Button>
          <Button asChild variant="context">
            <Link to="/meus-produtos">Meus produtos</Link>
          </Button>
        </>
      }
    >
      {productsQuery.isLoading ? (
        <PageState
          variant="loading"
          title="Carregando catálogo"
          description="Consultando os produtos publicados e suas regras comerciais."
        />
      ) : productsQuery.error ? (
        <PageState
          variant="error"
          title="Marketplace indisponível"
          description={getErrorMessage(
            productsQuery.error,
            "Não foi possível carregar o marketplace.",
          )}
        />
      ) : (productsQuery.data ?? []).length === 0 ? (
        <PageState
          variant="empty"
          icon={PackageOpen}
          title="Nenhum produto publicado"
          description="O catálogo será preenchido pelo CMS administrativo."
        />
      ) : (
        <section
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Produtos digitais publicados"
        >
          {(productsQuery.data ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </AppPageShell>
  );
};

export default DigitalMarketplace;
