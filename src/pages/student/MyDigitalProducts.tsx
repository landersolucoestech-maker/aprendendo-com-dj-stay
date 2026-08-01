import { Download, FileArchive, Library, PackageCheck, ShieldCheck } from "lucide-react";
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
import type { DigitalProductDeliverable } from "@/contracts/marketplace";
import {
  useDigitalProductDeliverables,
  useMyDigitalProducts,
  type OwnedDigitalProduct,
} from "@/hooks/useDigitalMarketplace";
import { useToast } from "@/hooks/use-toast";
import { formatAppDate } from "@/lib/date-time";
import { getErrorMessage } from "@/lib/error-message";
import { downloadPrivateAsset } from "@/lib/private-assets";

const formatDate = (value: string | null): string =>
  formatAppDate(value, { dateStyle: "long", fallback: "Sem prazo definido" });

const accessSourceLabel: Readonly<Record<string, string>> = {
  manual_grant: "Concessão manual",
  complimentary: "Acesso cortesia",
  purchase: "Compra confirmada",
};

const OwnedProductCard = ({ item }: { item: OwnedDigitalProduct }) => {
  const deliverablesQuery = useDigitalProductDeliverables(item.product.id);
  const { toast } = useToast();

  const handleDownload = async (
    deliverable: DigitalProductDeliverable,
  ): Promise<void> => {
    try {
      await downloadPrivateAsset(deliverable.assets);
      toast({
        title: "Download iniciado",
        description: `${deliverable.title} está sendo baixado.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível baixar o arquivo",
        description: getErrorMessage(error, "O acesso ao arquivo foi recusado."),
        variant: "destructive",
      });
    }
  };

  return (
    <Card variant="marketplace">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{item.product.title}</CardTitle>
            <CardDescription className="mt-2">
              {item.product.short_description ??
                "Produto digital liberado para sua conta."}
            </CardDescription>
          </div>
          <Badge variant="success" className="w-fit gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Acesso ativo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="surface-muted grid gap-3 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Origem</dt>
            <dd className="mt-1 font-medium text-foreground">
              {accessSourceLabel[item.access.source] ?? item.access.source}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Validade</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatDate(item.access.expires_at)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Licença</dt>
            <dd className="mt-1 font-medium text-foreground">{item.license.title}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Versão dos termos</dt>
            <dd className="mt-1 font-medium text-foreground">{item.license.version}</dd>
          </div>
        </dl>

        <section aria-labelledby={`files-${item.access.id}`}>
          <div className="mb-3 flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-marketplace" aria-hidden="true" />
            <h2 id={`files-${item.access.id}`} className="font-semibold text-foreground">
              Arquivos liberados
            </h2>
          </div>

          {deliverablesQuery.isLoading ? (
            <PageState
              variant="loading"
              compact
              title="Carregando arquivos"
            />
          ) : deliverablesQuery.error ? (
            <PageState
              variant="error"
              compact
              title="Arquivos indisponíveis"
              description={getErrorMessage(
                deliverablesQuery.error,
                "Não foi possível carregar os arquivos.",
              )}
            />
          ) : (deliverablesQuery.data ?? []).length === 0 ? (
            <PageState
              variant="empty"
              compact
              title="Nenhum entregável disponível"
              description="Este acesso ainda não possui arquivos publicados."
            />
          ) : (
            <div className="space-y-3">
              {(deliverablesQuery.data ?? []).map((deliverable) => (
                <article
                  key={deliverable.id}
                  className="surface-muted flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-medium text-foreground">{deliverable.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deliverable.description ?? deliverable.assets.original_name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDownload(deliverable)}
                  >
                    <Download aria-hidden="true" />
                    Baixar
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
};

const MyDigitalProducts = () => {
  const ownedProductsQuery = useMyDigitalProducts();

  return (
    <AppPageShell
      context="marketplace"
      eyebrow="Biblioteca digital"
      title="Meus produtos"
      description="Produtos digitais com acesso ativo, licença registrada e downloads privados."
      navigation={
        <span className="inline-flex items-center gap-2 text-sm font-medium text-marketplace">
          <Library className="h-4 w-4" aria-hidden="true" />
          Entregas privadas
        </span>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/marketplace">Ver marketplace</Link>
          </Button>
          <Button asChild variant="context">
            <Link to="/portal">Voltar ao portal</Link>
          </Button>
        </>
      }
    >
      {ownedProductsQuery.isLoading ? (
        <PageState
          variant="loading"
          title="Carregando seus produtos"
          description="Validando acessos, licenças e entregáveis privados."
        />
      ) : ownedProductsQuery.error ? (
        <PageState
          variant="error"
          title="Biblioteca indisponível"
          description={getErrorMessage(
            ownedProductsQuery.error,
            "Não foi possível carregar seus produtos.",
          )}
        />
      ) : (ownedProductsQuery.data ?? []).length === 0 ? (
        <PageState
          variant="empty"
          icon={PackageCheck}
          title="Nenhum produto liberado"
          description="Somente acessos ativos e comprovados aparecem aqui. Redirecionamentos de pagamento não liberam arquivos."
        />
      ) : (
        <section className="space-y-6" aria-label="Produtos digitais adquiridos">
          {(ownedProductsQuery.data ?? []).map((item) => (
            <OwnedProductCard key={item.access.id} item={item} />
          ))}
        </section>
      )}
    </AppPageShell>
  );
};

export default MyDigitalProducts;
