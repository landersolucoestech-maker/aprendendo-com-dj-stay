import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  Archive,
  FileArchive,
  Loader2,
  PackagePlus,
  Plus,
  Store,
  UploadCloud,
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageState } from "@/components/ui/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  DigitalLicenseKind,
  DigitalProductStatus,
} from "@/contracts/marketplace";
import {
  useArchiveDigitalProduct,
  useAttachDigitalProductDeliverable,
  useCreateDigitalProduct,
  useCreateDigitalProductLicense,
  useMarketplaceAdminProduct,
  useMarketplaceAdminProducts,
  useMarketplaceProductDeliverables,
  useMarketplaceProductLicenses,
  usePublishDigitalProduct,
  usePublishDigitalProductLicense,
  useUnpublishDigitalProduct,
  useUpdateDigitalProduct,
} from "@/hooks/useDigitalMarketplace";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-message";

const statusLabel: Readonly<Record<DigitalProductStatus, string>> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const statusVariant: Readonly<
  Record<DigitalProductStatus, BadgeProps["variant"]>
> = {
  draft: "warning",
  published: "success",
  archived: "outline",
};

const licenseKindLabel: Readonly<Record<DigitalLicenseKind, string>> = {
  personal: "Pessoal",
  commercial: "Comercial",
  extended: "Estendida",
  custom: "Personalizada",
};

const ProductConfiguration = ({
  productId,
}: {
  readonly productId: string;
}) => {
  const productQuery = useMarketplaceAdminProduct(productId);
  const licensesQuery = useMarketplaceProductLicenses(productId, "admin");
  const deliverablesQuery = useMarketplaceProductDeliverables(
    productId,
    "admin",
  );
  const updateProduct = useUpdateDigitalProduct();
  const createLicense = useCreateDigitalProductLicense();
  const publishLicense = usePublishDigitalProductLicense();
  const attachDeliverable = useAttachDigitalProductDeliverable();
  const publishProduct = usePublishDigitalProduct();
  const unpublishProduct = useUnpublishDigitalProduct();
  const archiveProduct = useArchiveDigitalProduct();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceAmount, setPriceAmount] = useState("0");
  const [affiliateEligible, setAffiliateEligible] = useState(false);
  const [licenseTitle, setLicenseTitle] = useState("Licença pessoal");
  const [licenseKind, setLicenseKind] =
    useState<DigitalLicenseKind>("personal");
  const [licenseTerms, setLicenseTerms] = useState("");
  const [licenseIsDefault, setLicenseIsDefault] = useState(true);
  const [deliverableTitle, setDeliverableTitle] = useState("");
  const [deliverableDescription, setDeliverableDescription] = useState("");
  const [assetId, setAssetId] = useState("");

  useEffect(() => {
    const product = productQuery.data;
    if (!product) return;

    setTitle(product.title);
    setSlug(product.slug);
    setShortDescription(product.short_description ?? "");
    setDescription(product.description ?? "");
    setCategory(product.category ?? "");
    setPriceAmount(String(product.price_amount));
    setAffiliateEligible(product.affiliate_eligible);
  }, [productQuery.data]);

  if (productQuery.isLoading) {
    return (
      <PageState
        variant="loading"
        title="Carregando produto"
        description="Consultando configuração, licenças e entregáveis persistidos."
      />
    );
  }

  if (productQuery.error || !productQuery.data) {
    return (
      <PageState
        variant="error"
        title="Produto indisponível"
        description={getErrorMessage(
          productQuery.error,
          "Não foi possível carregar o produto.",
        )}
      />
    );
  }

  const product = productQuery.data;
  const productEditable = product.status === "draft";

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updateProduct.mutateAsync({
        productId: product.id,
        expectedVersion: product.version,
        values: {
          title,
          slug,
          shortDescription,
          description,
          category,
          priceAmount: Number(priceAmount),
          currencyCode: "BRL",
          affiliateEligible,
        },
      });
      toast({
        title: "Produto atualizado",
        description: "As alterações foram persistidas.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível atualizar",
        description: getErrorMessage(
          error,
          "Atualize a página e tente novamente.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleCreateLicense = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      await createLicense.mutateAsync({
        productId: product.id,
        title: licenseTitle,
        kind: licenseKind,
        summary: "",
        termsText: licenseTerms,
        isDefault: licenseIsDefault,
      });
      setLicenseTitle("Licença pessoal");
      setLicenseTerms("");
      toast({
        title: "Licença criada",
        description:
          "A licença foi associada ao produto e recebeu versão automática.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar a licença",
        description: getErrorMessage(error, "Revise os campos da licença."),
        variant: "destructive",
      });
    }
  };

  const handlePublishLicense = async (licenseId: string): Promise<void> => {
    try {
      await publishLicense.mutateAsync(licenseId);
      toast({
        title: "Licença publicada",
        description: "A licença está disponível para publicação do produto.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível publicar a licença",
        description: getErrorMessage(
          error,
          "A operação foi bloqueada pelo backend.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleAttachDeliverable = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      await attachDeliverable.mutateAsync({
        productId: product.id,
        assetId,
        title: deliverableTitle,
        description: deliverableDescription,
      });
      setAssetId("");
      setDeliverableTitle("");
      setDeliverableDescription("");
      toast({
        title: "Entregável associado",
        description: "O arquivo foi vinculado ao produto.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível associar o arquivo",
        description: getErrorMessage(
          error,
          "Confirme o identificador do asset.",
        ),
        variant: "destructive",
      });
    }
  };

  const runLifecycle = async (
    action: "publish" | "unpublish" | "archive",
  ): Promise<void> => {
    try {
      const input = {
        productId: product.id,
        expectedVersion: product.version,
      };

      if (action === "publish") {
        await publishProduct.mutateAsync(input);
      } else if (action === "unpublish") {
        await unpublishProduct.mutateAsync(input);
      } else {
        await archiveProduct.mutateAsync(input);
      }

      toast({
        title: "Status atualizado",
        description: "O ciclo editorial foi persistido.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível alterar o status",
        description: getErrorMessage(
          error,
          "A operação foi bloqueada pelo backend.",
        ),
        variant: "destructive",
      });
    }
  };

  const lifecyclePending =
    publishProduct.isPending ||
    unpublishProduct.isPending ||
    archiveProduct.isPending;

  return (
    <div className="space-y-6">
      <Card variant="admin">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{product.title}</CardTitle>
              <CardDescription className="mt-2">
                Versão {product.version} · configuração editorial e comercial.
              </CardDescription>
            </div>
            <Badge variant={statusVariant[product.status]}>
              {statusLabel[product.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => void handleUpdate(event)}
          >
            <div className="space-y-2">
              <label
                htmlFor={`product-title-${product.id}`}
                className="text-sm font-medium"
              >
                Título
              </label>
              <Input
                id={`product-title-${product.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
                maxLength={200}
                disabled={!productEditable}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`product-slug-${product.id}`}
                className="text-sm font-medium"
              >
                Slug
              </label>
              <Input
                id={`product-slug-${product.id}`}
                value={slug}
                onChange={(event) =>
                  setSlug(event.target.value.toLowerCase())
                }
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                disabled={!productEditable}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor={`product-short-${product.id}`}
                className="text-sm font-medium"
              >
                Descrição curta
              </label>
              <Input
                id={`product-short-${product.id}`}
                value={shortDescription}
                onChange={(event) => setShortDescription(event.target.value)}
                maxLength={500}
                disabled={!productEditable}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor={`product-description-${product.id}`}
                className="text-sm font-medium"
              >
                Descrição completa
              </label>
              <Textarea
                id={`product-description-${product.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={20_000}
                disabled={!productEditable}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`product-category-${product.id}`}
                className="text-sm font-medium"
              >
                Categoria
              </label>
              <Input
                id={`product-category-${product.id}`}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={120}
                disabled={!productEditable}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`product-price-${product.id}`}
                className="text-sm font-medium"
              >
                Preço em reais
              </label>
              <Input
                id={`product-price-${product.id}`}
                type="number"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={(event) => setPriceAmount(event.target.value)}
                required
                disabled={!productEditable}
              />
            </div>
            <label
              className="flex items-center gap-3 text-sm md:col-span-2"
              htmlFor={`product-affiliate-${product.id}`}
            >
              <Checkbox
                id={`product-affiliate-${product.id}`}
                checked={affiliateEligible}
                onCheckedChange={(checked) =>
                  setAffiliateEligible(checked === true)
                }
                disabled={!productEditable}
              />
              Elegível para afiliados
            </label>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <Button
                type="submit"
                variant="context"
                disabled={!productEditable || updateProduct.isPending}
              >
                {updateProduct.isPending ? (
                  <Loader2
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                Salvar alterações
              </Button>
              {product.status === "draft" ? (
                <Button
                  type="button"
                  variant="success"
                  disabled={lifecyclePending}
                  onClick={() => void runLifecycle("publish")}
                >
                  <UploadCloud aria-hidden="true" />
                  Publicar
                </Button>
              ) : null}
              {product.status === "published" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={lifecyclePending}
                  onClick={() => void runLifecycle("unpublish")}
                >
                  Despublicar
                </Button>
              ) : null}
              {product.status !== "archived" ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={lifecyclePending}
                  onClick={() => void runLifecycle("archive")}
                >
                  <Archive aria-hidden="true" />
                  Arquivar
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card variant="admin">
          <CardHeader>
            <CardTitle>Licenças</CardTitle>
            <CardDescription>
              Defina os termos. A versão é atribuída automaticamente pelo
              banco.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="space-y-3"
              onSubmit={(event) => void handleCreateLicense(event)}
            >
              <Input
                value={licenseTitle}
                onChange={(event) => setLicenseTitle(event.target.value)}
                placeholder="Título da licença"
                required
                minLength={3}
                maxLength={200}
                disabled={!productEditable}
              />
              <Select
                value={licenseKind}
                onValueChange={(value) =>
                  setLicenseKind(value as DigitalLicenseKind)
                }
                disabled={!productEditable}
              >
                <SelectTrigger aria-label="Tipo da licença">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(licenseKindLabel).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={licenseTerms}
                onChange={(event) => setLicenseTerms(event.target.value)}
                placeholder="Termos integrais da licença"
                required
                minLength={20}
                maxLength={50_000}
                disabled={!productEditable}
              />
              <label
                className="flex items-center gap-3 text-sm"
                htmlFor={`license-default-${product.id}`}
              >
                <Checkbox
                  id={`license-default-${product.id}`}
                  checked={licenseIsDefault}
                  onCheckedChange={(checked) =>
                    setLicenseIsDefault(checked === true)
                  }
                  disabled={!productEditable}
                />
                Licença padrão
              </label>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!productEditable || createLicense.isPending}
              >
                <Plus aria-hidden="true" />
                Criar licença
              </Button>
            </form>

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
                description={getErrorMessage(licensesQuery.error)}
              />
            ) : (licensesQuery.data ?? []).length === 0 ? (
              <PageState
                variant="empty"
                compact
                title="Nenhuma licença cadastrada"
              />
            ) : (
              <div className="space-y-3">
                {(licensesQuery.data ?? []).map((license) => (
                  <article
                    key={license.id}
                    className="surface-muted p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-foreground">
                          {license.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {licenseKindLabel[license.kind]} · versão{" "}
                          {license.version}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            license.status === "published"
                              ? "success"
                              : "outline"
                          }
                        >
                          {statusLabel[license.status]}
                        </Badge>
                        {license.status === "draft" && productEditable ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={publishLicense.isPending}
                            onClick={() =>
                              void handlePublishLicense(license.id)
                            }
                          >
                            Publicar licença
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="admin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive
                className="h-5 w-5 text-admin"
                aria-hidden="true"
              />
              Entregáveis
            </CardTitle>
            <CardDescription>
              Associe assets privados já publicados no Storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="space-y-3"
              onSubmit={(event) => void handleAttachDeliverable(event)}
            >
              <Input
                value={deliverableTitle}
                onChange={(event) =>
                  setDeliverableTitle(event.target.value)
                }
                placeholder="Título do entregável"
                required
                minLength={1}
                maxLength={200}
                disabled={!productEditable}
              />
              <Textarea
                value={deliverableDescription}
                onChange={(event) =>
                  setDeliverableDescription(event.target.value)
                }
                placeholder="Descrição opcional"
                maxLength={2000}
                disabled={!productEditable}
              />
              <Input
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                placeholder="UUID do asset publicado"
                required
                disabled={!productEditable}
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={
                  !productEditable ||
                  attachDeliverable.isPending ||
                  !assetId
                }
              >
                <Plus aria-hidden="true" />
                Associar entregável
              </Button>
            </form>

            {deliverablesQuery.isLoading ? (
              <PageState
                variant="loading"
                compact
                title="Carregando entregáveis"
              />
            ) : deliverablesQuery.error ? (
              <PageState
                variant="error"
                compact
                title="Entregáveis indisponíveis"
                description={getErrorMessage(deliverablesQuery.error)}
              />
            ) : (deliverablesQuery.data ?? []).length === 0 ? (
              <PageState
                variant="empty"
                compact
                title="Nenhum arquivo associado"
              />
            ) : (
              <div className="space-y-3">
                {(deliverablesQuery.data ?? []).map((deliverable) => (
                  <article
                    key={deliverable.id}
                    className="surface-muted p-4"
                  >
                    <h3 className="font-medium text-foreground">
                      {deliverable.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deliverable.assets.original_name} · posição{" "}
                      {deliverable.position}
                    </p>
                  </article>
                ))}
              </div>
            )}
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceAmount, setPriceAmount] = useState("0");
  const [affiliateEligible, setAffiliateEligible] = useState(false);

  const handleCreateProduct = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
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
      toast({
        title: "Produto criado",
        description: "O produto foi salvo como rascunho.",
      });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível criar o produto",
        description: getErrorMessage(error, "Revise os dados informados."),
        variant: "destructive",
      });
    }
  };

  return (
    <AppPageShell
      context="admin"
      eyebrow="Administração"
      title="Produtos digitais"
      description="CMS transacional de produtos, licenças, entregáveis e publicação."
      navigation={
        <span className="inline-flex items-center gap-2 text-sm font-medium text-admin">
          <Store className="h-4 w-4" aria-hidden="true" />
          Operação do marketplace
        </span>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/marketplace">Ver catálogo</Link>
          </Button>
          <Button asChild variant="context">
            <Link to="/portal">Voltar ao portal</Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card variant="admin">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus
                  className="h-5 w-5 text-admin"
                  aria-hidden="true"
                />
                Novo produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => void handleCreateProduct(event)}
              >
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Título"
                  required
                  minLength={3}
                  maxLength={200}
                  aria-label="Título do produto"
                />
                <Input
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase())
                  }
                  placeholder="slug-do-produto"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  aria-label="Slug do produto"
                />
                <Input
                  value={shortDescription}
                  onChange={(event) =>
                    setShortDescription(event.target.value)
                  }
                  placeholder="Descrição curta"
                  maxLength={500}
                  aria-label="Descrição curta"
                />
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descrição completa"
                  maxLength={20_000}
                  aria-label="Descrição completa"
                />
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Categoria"
                  maxLength={120}
                  aria-label="Categoria"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceAmount}
                  onChange={(event) => setPriceAmount(event.target.value)}
                  required
                  aria-label="Preço em reais"
                />
                <label
                  className="flex items-center gap-3 text-sm"
                  htmlFor="new-product-affiliate"
                >
                  <Checkbox
                    id="new-product-affiliate"
                    checked={affiliateEligible}
                    onCheckedChange={(checked) =>
                      setAffiliateEligible(checked === true)
                    }
                  />
                  Elegível para afiliados
                </label>
                <Button
                  type="submit"
                  variant="context"
                  className="w-full"
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? (
                    <Loader2
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  {createProduct.isPending
                    ? "Criando..."
                    : "Criar rascunho"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card variant="admin">
            <CardHeader>
              <CardTitle>Produtos cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {productsQuery.isLoading ? (
                <PageState
                  variant="loading"
                  compact
                  title="Carregando produtos"
                />
              ) : productsQuery.error ? (
                <PageState
                  variant="error"
                  compact
                  title="Produtos indisponíveis"
                  description={getErrorMessage(productsQuery.error)}
                />
              ) : (productsQuery.data ?? []).length === 0 ? (
                <PageState
                  variant="empty"
                  compact
                  title="Nenhum produto cadastrado"
                />
              ) : (
                (productsQuery.data ?? []).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-pressed={selectedProductId === product.id}
                    className={`w-full rounded-xl border p-4 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selectedProductId === product.id
                        ? "border-admin/50 bg-admin/10 shadow-sm"
                        : "border-border bg-card hover:border-admin/30 hover:bg-muted/40"
                    }`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <span className="font-medium text-foreground">
                      {product.title}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-3">
                      <Badge variant={statusVariant[product.status]}>
                        {statusLabel[product.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        versão {product.version}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {selectedProductId ? (
          <ProductConfiguration productId={selectedProductId} />
        ) : (
          <PageState
            variant="empty"
            icon={Store}
            title="Selecione um produto"
            description="Abra um rascunho para configurar licença, entregáveis e publicação."
          />
        )}
      </div>
    </AppPageShell>
  );
};

export default DigitalProductsAdmin;
