import { FileArchive, PackagePlus, Plus, Send, ShieldCheck, Store } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAttachDigitalProductDeliverable,
  useAvailableDigitalProductAssets,
  useCreateDigitalProduct,
  useCreateDigitalProductLicense,
  useDigitalProductDeliverables,
  useMarketplaceAdminProducts,
  useMarketplaceProductLicenses,
  usePublishDigitalProduct,
  usePublishDigitalProductLicense,
} from "@/hooks/useDigitalMarketplace";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-white/40";

const statusLabel: Readonly<Record<string, string>> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const licenseKindLabel: Readonly<Record<string, string>> = {
  personal: "Pessoal",
  commercial: "Comercial",
  extended: "Estendida",
  custom: "Personalizada",
};

const ProductConfiguration = ({ productId }: { productId: string }) => {
  const productsQuery = useMarketplaceAdminProducts();
  const product = productsQuery.data?.find((item) => item.id === productId);
  const licensesQuery = useMarketplaceProductLicenses(productId);
  const deliverablesQuery = useDigitalProductDeliverables(productId);
  const assetsQuery = useAvailableDigitalProductAssets();
  const createLicense = useCreateDigitalProductLicense();
  const publishLicense = usePublishDigitalProductLicense();
  const attachDeliverable = useAttachDigitalProductDeliverable();
  const publishProduct = usePublishDigitalProduct();
  const { toast } = useToast();

  const [licenseKind, setLicenseKind] = useState("personal");
  const [licenseTitle, setLicenseTitle] = useState("");
  const [licenseSummary, setLicenseSummary] = useState("");
  const [licenseTerms, setLicenseTerms] = useState("");
  const [licenseDefault, setLicenseDefault] = useState(true);
  const [assetId, setAssetId] = useState("");
  const [deliverableTitle, setDeliverableTitle] = useState("");
  const [deliverableDescription, setDeliverableDescription] = useState("");

  const usedAssetIds = useMemo(
    () => new Set((deliverablesQuery.data ?? []).map((deliverable) => deliverable.asset_id)),
    [deliverablesQuery.data],
  );
  const availableAssets = (assetsQuery.data ?? []).filter((asset) => !usedAssetIds.has(asset.id));

  if (!product) {
    return (
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-8 text-center text-gray-400">Selecione um produto válido.</CardContent>
      </Card>
    );
  }

  const handleLicenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await createLicense.mutateAsync({
        productId,
        kind: licenseKind as "personal" | "commercial" | "extended" | "custom",
        title: licenseTitle,
        summary: licenseSummary,
        termsText: licenseTerms,
        isDefault: licenseDefault,
      });
      setLicenseTitle("");
      setLicenseSummary("");
      setLicenseTerms("");
      toast({ title: "Licença criada", description: "A versão foi salva como rascunho." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar a licença",
        description: getErrorMessage(error, "Revise os campos e tente novamente."),
        variant: "destructive",
      });
    }
  };

  const handleDeliverableSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await attachDeliverable.mutateAsync({
        productId,
        assetId,
        title: deliverableTitle,
        description: deliverableDescription,
      });
      setAssetId("");
      setDeliverableTitle("");
      setDeliverableDescription("");
      toast({ title: "Entregável associado", description: "O arquivo foi vinculado ao produto." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível associar o arquivo",
        description: getErrorMessage(error, "O asset precisa estar publicado e ser de produto digital."),
        variant: "destructive",
      });
    }
  };

  const handlePublishProduct = async () => {
    try {
      await publishProduct.mutateAsync({ id: product.id, version: product.version });
      toast({ title: "Produto publicado", description: "O item agora está visível no marketplace." });
    } catch (error: unknown) {
      toast({
        title: "Publicação bloqueada",
        description: getErrorMessage(
          error,
          "É obrigatório possuir uma licença padrão publicada e ao menos um entregável.",
        ),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl text-white">{product.title}</CardTitle>
              <CardDescription className="mt-2 text-gray-400">
                Versão {product.version} · {statusLabel[product.status] ?? product.status}
              </CardDescription>
            </div>
            <Button
              type="button"
              className="btn-brand"
              disabled={product.status !== "draft" || publishProduct.isPending}
              onClick={() => void handlePublishProduct()}
            >
              <Send className="mr-2 h-4 w-4" />
              {publishProduct.isPending ? "Publicando..." : "Publicar produto"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-gray-300 sm:grid-cols-3">
            <p>Slug: {product.slug}</p>
            <p>Moeda: {product.currency_code}</p>
            <p>Afiliados: {product.affiliate_eligible ? "Elegível" : "Não elegível"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5" />
              Licenças
            </CardTitle>
            <CardDescription className="text-gray-400">
              Termos publicados são versionados e não podem ser editados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-3" onSubmit={(event) => void handleLicenseSubmit(event)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  className={fieldClass}
                  value={licenseKind}
                  onChange={(event) => setLicenseKind(event.target.value)}
                  disabled={product.status !== "draft"}
                  aria-label="Tipo de licença"
                >
                  <option value="personal">Pessoal</option>
                  <option value="commercial">Comercial</option>
                  <option value="extended">Estendida</option>
                  <option value="custom">Personalizada</option>
                </select>
                <input
                  className={fieldClass}
                  value={licenseTitle}
                  onChange={(event) => setLicenseTitle(event.target.value)}
                  placeholder="Nome da licença"
                  required
                  minLength={3}
                  maxLength={200}
                  disabled={product.status !== "draft"}
                />
              </div>
              <input
                className={fieldClass}
                value={licenseSummary}
                onChange={(event) => setLicenseSummary(event.target.value)}
                placeholder="Resumo opcional"
                maxLength={1000}
                disabled={product.status !== "draft"}
              />
              <textarea
                className={`${fieldClass} min-h-32`}
                value={licenseTerms}
                onChange={(event) => setLicenseTerms(event.target.value)}
                placeholder="Termos completos da licença"
                required
                minLength={20}
                maxLength={50_000}
                disabled={product.status !== "draft"}
              />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={licenseDefault}
                  onChange={(event) => setLicenseDefault(event.target.checked)}
                  disabled={product.status !== "draft"}
                />
                Tornar licença padrão ao publicar
              </label>
              <Button
                type="submit"
                variant="outline"
                className="w-full border-white/20 bg-transparent"
                disabled={product.status !== "draft" || createLicense.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar versão de licença
              </Button>
            </form>

            <div className="space-y-3">
              {licensesQuery.isLoading ? (
                <p className="text-sm text-gray-400">Carregando licenças...</p>
              ) : (licensesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma licença cadastrada.</p>
              ) : (
                (licensesQuery.data ?? []).map((license) => (
                  <div key={license.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{license.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {licenseKindLabel[license.kind]} · versão {license.version} ·{" "}
                          {statusLabel[license.status]}
                          {license.is_default ? " · padrão" : ""}
                        </p>
                      </div>
                      {license.status === "draft" ? (
                        <Button
                          size="sm"
                          type="button"
                          disabled={publishLicense.isPending || product.status !== "draft"}
                          onClick={() => void publishLicense.mutateAsync(license.id)}
                        >
                          Publicar
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileArchive className="h-5 w-5" />
              Entregáveis
            </CardTitle>
            <CardDescription className="text-gray-400">
              Somente assets publicados com finalidade “produto digital”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form className="space-y-3" onSubmit={(event) => void handleDeliverableSubmit(event)}>
              <select
                className={fieldClass}
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                required
                disabled={product.status !== "draft"}
                aria-label="Asset do entregável"
              >
                <option value="">Selecione um asset publicado</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.original_name}
                  </option>
                ))}
              </select>
              <input
                className={fieldClass}
                value={deliverableTitle}
                onChange={(event) => setDeliverableTitle(event.target.value)}
                placeholder="Nome exibido do arquivo"
                required
                maxLength={200}
                disabled={product.status !== "draft"}
              />
              <textarea
                className={`${fieldClass} min-h-24`}
                value={deliverableDescription}
                onChange={(event) => setDeliverableDescription(event.target.value)}
                placeholder="Descrição opcional"
                maxLength={2000}
                disabled={product.status !== "draft"}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full border-white/20 bg-transparent"
                disabled={product.status !== "draft" || attachDeliverable.isPending || !assetId}
              >
                <Plus className="mr-2 h-4 w-4" />
                Associar entregável
              </Button>
            </form>

            <div className="space-y-3">
              {deliverablesQuery.isLoading ? (
                <p className="text-sm text-gray-400">Carregando entregáveis...</p>
              ) : (deliverablesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum arquivo associado.</p>
              ) : (
                (deliverablesQuery.data ?? []).map((deliverable) => (
                  <div key={deliverable.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="font-medium text-white">{deliverable.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {deliverable.assets.original_name} · posição {deliverable.position}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const DigitalProductsAdmin = () => {
  const productsQuery = useMarketplaceAdminProducts();
  const createProduct = useCreateDigitalProduct();
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceAmount, setPriceAmount] = useState("0");
  const [affiliateEligible, setAffiliateEligible] = useState(false);

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const product = await createProduct.mutateAsync({
        title,
        slug,
        shortDescription,
        description,
        category,
        priceAmount: Number(priceAmount),
        currencyCode: "BRL",
        affiliateEligible,
      });
      setSelectedProductId(product.id);
      setTitle("");
      setSlug("");
      setShortDescription("");
      setDescription("");
      setCategory("");
      setPriceAmount("0");
      setAffiliateEligible(false);
      toast({ title: "Produto criado", description: "O produto foi salvo como rascunho." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar o produto",
        description: getErrorMessage(error, "Revise os dados informados."),
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Administração</p>
            <h1 className="mt-3 flex items-center gap-3 text-4xl font-bold">
              <Store className="h-9 w-9" />
              Produtos digitais
            </h1>
            <p className="mt-3 text-gray-400">
              CMS transacional de produtos, licenças, entregáveis e publicação.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/marketplace">
              <Button variant="outline" className="border-white/20 bg-transparent">
                Ver catálogo
              </Button>
            </Link>
            <Link to="/portal">
              <Button className="btn-brand">Voltar ao portal</Button>
            </Link>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <PackagePlus className="h-5 w-5" />
                  Novo produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={(event) => void handleCreateProduct(event)}>
                  <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" required minLength={3} maxLength={200} />
                  <input className={fieldClass} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} placeholder="slug-do-produto" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
                  <input className={fieldClass} value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} placeholder="Descrição curta" maxLength={500} />
                  <textarea className={`${fieldClass} min-h-24`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição completa" maxLength={20_000} />
                  <input className={fieldClass} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Categoria" maxLength={120} />
                  <input className={fieldClass} type="number" min="0" step="0.01" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} required aria-label="Preço em reais" />
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={affiliateEligible} onChange={(event) => setAffiliateEligible(event.target.checked)} />
                    Elegível para afiliados
                  </label>
                  <Button type="submit" className="btn-brand w-full" disabled={createProduct.isPending}>
                    <Plus className="mr-2 h-4 w-4" />
                    {createProduct.isPending ? "Criando..." : "Criar rascunho"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">Produtos cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {productsQuery.isLoading ? (
                  <p className="text-sm text-gray-400">Carregando produtos...</p>
                ) : productsQuery.error ? (
                  <p className="text-sm text-red-300">
                    {getErrorMessage(productsQuery.error, "Não foi possível carregar os produtos.")}
                  </p>
                ) : (productsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum produto cadastrado.</p>
                ) : (
                  (productsQuery.data ?? []).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedProductId === product.id
                          ? "border-white/30 bg-white/10"
                          : "border-white/10 bg-black/20 hover:bg-white/5"
                      }`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <p className="font-medium text-white">{product.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {statusLabel[product.status]} · versão {product.version}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {selectedProductId ? (
            <ProductConfiguration productId={selectedProductId} />
          ) : (
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
                <Store className="mb-4 h-10 w-10 text-gray-500" />
                <h2 className="text-xl font-semibold">Selecione um produto</h2>
                <p className="mt-2 max-w-lg text-sm text-gray-400">
                  Abra um rascunho para configurar licença, entregáveis e publicação.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
};

export default DigitalProductsAdmin;
