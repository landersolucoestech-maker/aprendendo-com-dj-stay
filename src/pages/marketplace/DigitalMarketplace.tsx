import { BadgeCheck, CreditCard, Loader2, PackageOpen, ShoppingBag, Tag } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    publishedLicenses.find((license) => license.is_default) ?? publishedLicenses[0] ?? null;
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
      // The mutation exposes the validated error below without fabricating a successful checkout.
    }
  };

  return (
    <Card className="flex h-full flex-col border-white/10 bg-white/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl text-white">{product.title}</CardTitle>
            <CardDescription className="mt-2 text-gray-400">
              {product.short_description ?? "Produto digital publicado no marketplace."}
            </CardDescription>
          </div>
          {product.affiliate_eligible ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Elegível para afiliados
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {product.description ? (
          <p className="text-sm leading-6 text-gray-300">{product.description}</p>
        ) : null}

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Valor</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatCurrency(displayedPrice, product.currency_code)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              O valor definitivo é validado novamente pelo servidor.
            </p>
          </div>
          {product.category ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-300">
              <Tag className="h-4 w-4" />
              {product.category}
            </span>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-white">Licenças publicadas</p>
          {licensesQuery.isLoading ? (
            <p className="text-sm text-gray-400">Carregando licenças...</p>
          ) : licensesQuery.error ? (
            <p className="text-sm text-red-300">
              {getErrorMessage(licensesQuery.error, "Não foi possível carregar as licenças.")}
            </p>
          ) : publishedLicenses.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma licença publicada está disponível.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {publishedLicenses.map((license) => (
                <span
                  key={license.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    license.id === checkoutLicense?.id
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                      : "border-white/10 bg-white/5 text-gray-200"
                  }`}
                >
                  {licenseKindLabel[license.kind] ?? license.title}
                  {license.is_default ? " · padrão" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {checkoutMutation.error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {getErrorMessage(
              checkoutMutation.error,
              "Não foi possível abrir o checkout. Tente novamente.",
            )}
          </div>
        ) : null}

        <div className="mt-auto space-y-3">
          <Button
            type="button"
            className="btn-brand w-full"
            disabled={
              licensesQuery.isLoading || checkoutLicense === null || checkoutMutation.isPending
            }
            onClick={() => void startCheckout()}
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {checkoutMutation.isPending
              ? "Preparando checkout..."
              : "Comprar com Pix ou cartão"}
          </Button>
          <p className="text-xs leading-5 text-gray-500">
            O pagamento é concluído no checkout hospedado. O redirecionamento de retorno não
            confirma a compra nem libera arquivos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const DigitalMarketplace = () => {
  const productsQuery = useMarketplaceProducts();

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Marketplace</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <ShoppingBag className="h-9 w-9" />
              Produtos digitais
            </h1>
            <p className="mt-3 max-w-2xl text-gray-400">
              Catálogo oficial de packs, samples, presets, projetos e outros materiais digitais
              publicados.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/portal">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Voltar ao portal
              </Button>
            </Link>
            <Link to="/meus-produtos">
              <Button className="btn-brand">Meus produtos</Button>
            </Link>
          </div>
        </header>

        {productsQuery.isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-300">
            Carregando catálogo...
          </div>
        ) : productsQuery.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            {getErrorMessage(productsQuery.error, "Não foi possível carregar o marketplace.")}
          </div>
        ) : (productsQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <PackageOpen className="mb-4 h-10 w-10 text-gray-500" />
            <h2 className="text-xl font-semibold">Nenhum produto publicado</h2>
            <p className="mt-2 text-sm text-gray-400">
              O catálogo será preenchido pelo CMS administrativo.
            </p>
          </div>
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
      </div>
    </main>
  );
};

export default DigitalMarketplace;
