import { Download, FileArchive, Library, PackageCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DigitalProductDeliverable } from "@/contracts/marketplace";
import {
  useDigitalProductDeliverables,
  useMyDigitalProducts,
  type OwnedDigitalProduct,
} from "@/hooks/useDigitalMarketplace";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";
import { downloadPrivateAsset } from "@/lib/private-assets";

const formatDate = (value: string | null): string =>
  value === null
    ? "Sem prazo definido"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value));

const accessSourceLabel: Readonly<Record<string, string>> = {
  manual_grant: "Concessão manual",
  complimentary: "Acesso cortesia",
  purchase: "Compra confirmada",
};

const OwnedProductCard = ({ item }: { item: OwnedDigitalProduct }) => {
  const deliverablesQuery = useDigitalProductDeliverables(item.product.id);
  const { toast } = useToast();

  const handleDownload = async (deliverable: DigitalProductDeliverable): Promise<void> => {
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
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl text-white">{item.product.title}</CardTitle>
            <CardDescription className="mt-2 text-gray-400">
              {item.product.short_description ?? "Produto digital liberado para sua conta."}
            </CardDescription>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acesso ativo
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300 sm:grid-cols-2">
          <p>
            <span className="text-gray-500">Origem:</span>{" "}
            {accessSourceLabel[item.access.source] ?? item.access.source}
          </p>
          <p>
            <span className="text-gray-500">Validade:</span> {formatDate(item.access.expires_at)}
          </p>
          <p>
            <span className="text-gray-500">Licença:</span> {item.license.title}
          </p>
          <p>
            <span className="text-gray-500">Versão dos termos:</span> {item.license.version}
          </p>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            <h2 className="font-semibold text-white">Arquivos liberados</h2>
          </div>

          {deliverablesQuery.isLoading ? (
            <p className="text-sm text-gray-400">Carregando arquivos...</p>
          ) : deliverablesQuery.error ? (
            <p className="text-sm text-red-300">
              {getErrorMessage(deliverablesQuery.error, "Não foi possível carregar os arquivos.")}
            </p>
          ) : (deliverablesQuery.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
              Nenhum entregável está disponível para este acesso.
            </p>
          ) : (
            <div className="space-y-3">
              {(deliverablesQuery.data ?? []).map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{deliverable.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {deliverable.description ?? deliverable.assets.original_name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/20 bg-transparent"
                    onClick={() => void handleDownload(deliverable)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MyDigitalProducts = () => {
  const ownedProductsQuery = useMyDigitalProducts();

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Biblioteca digital</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <Library className="h-9 w-9" />
              Meus produtos
            </h1>
            <p className="mt-3 text-gray-400">
              Produtos digitais com acesso ativo, licença registrada e downloads privados.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/marketplace">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Ver marketplace
              </Button>
            </Link>
            <Link to="/portal">
              <Button className="btn-brand">Voltar ao portal</Button>
            </Link>
          </div>
        </header>

        {ownedProductsQuery.isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-gray-300">
            Carregando seus produtos...
          </div>
        ) : ownedProductsQuery.error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            {getErrorMessage(ownedProductsQuery.error, "Não foi possível carregar seus produtos.")}
          </div>
        ) : (ownedProductsQuery.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <PackageCheck className="mb-4 h-10 w-10 text-gray-500" />
            <h2 className="text-xl font-semibold">Nenhum produto liberado</h2>
            <p className="mt-2 max-w-xl text-sm text-gray-400">
              Somente acessos ativos e comprovados aparecem aqui. Redirecionamentos de pagamento não liberam arquivos.
            </p>
          </div>
        ) : (
          <section className="space-y-6" aria-label="Produtos digitais adquiridos">
            {(ownedProductsQuery.data ?? []).map((item) => (
              <OwnedProductCard key={item.access.id} item={item} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
};

export default MyDigitalProducts;
