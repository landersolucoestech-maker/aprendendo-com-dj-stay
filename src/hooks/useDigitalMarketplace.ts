import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseDataContract } from "@/contracts/contract-error";
import {
  digitalProductAccessesSchema,
  digitalProductDeliverablesSchema,
  digitalProductLicensesSchema,
  digitalProductSchema,
  digitalProductsSchema,
  marketplaceAttachDeliverableInputSchema,
  marketplaceCreateLicenseInputSchema,
  marketplaceCreateProductInputSchema,
  type DigitalProduct,
  type DigitalProductAccess,
  type DigitalProductDeliverable,
  type DigitalProductLicense,
  type MarketplaceAttachDeliverableInput,
  type MarketplaceCreateLicenseInput,
  type MarketplaceCreateProductInput,
} from "@/contracts/marketplace";
import { assetRowsSchema, type AssetRow } from "@/contracts/storage";
import { supabase } from "@/integrations/supabase/client";

const productSelect = [
  "id",
  "title",
  "slug",
  "short_description",
  "description",
  "category",
  "status",
  "cover_asset_id",
  "thumbnail_asset_id",
  "price_amount",
  "currency_code",
  "promotional_price_amount",
  "promotion_starts_at",
  "promotion_ends_at",
  "availability_starts_at",
  "availability_ends_at",
  "affiliate_eligible",
  "version",
  "published_at",
].join(",");

const licenseSelect = [
  "id",
  "product_id",
  "kind",
  "title",
  "summary",
  "terms_text",
  "version",
  "status",
  "is_default",
  "published_at",
].join(",");

const accessSelect = [
  "id",
  "product_id",
  "user_id",
  "license_id",
  "status",
  "source",
  "source_reference",
  "license_snapshot",
  "granted_at",
  "expires_at",
  "revoked_at",
  "revocation_reason",
].join(",");

export interface OwnedDigitalProduct {
  access: DigitalProductAccess;
  product: DigitalProduct;
  license: DigitalProductLicense;
}

export const useMarketplaceProducts = () =>
  useQuery({
    queryKey: ["digital-marketplace", "products"],
    queryFn: async (): Promise<DigitalProduct[]> => {
      const { data, error } = await supabase
        .from("digital_products")
        .select(productSelect)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return parseDataContract(digitalProductsSchema, data, "catálogo de produtos digitais");
    },
  });

export const useMarketplaceAdminProducts = () =>
  useQuery({
    queryKey: ["digital-marketplace", "admin-products"],
    queryFn: async (): Promise<DigitalProduct[]> => {
      const { data, error } = await supabase
        .from("digital_products")
        .select(productSelect)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return parseDataContract(digitalProductsSchema, data, "produtos digitais administrativos");
    },
  });

export const useMarketplaceProductLicenses = (productId: string | undefined) =>
  useQuery({
    queryKey: ["digital-marketplace", "licenses", productId],
    enabled: productId !== undefined,
    queryFn: async (): Promise<DigitalProductLicense[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("digital_product_licenses")
        .select(licenseSelect)
        .eq("product_id", productId)
        .order("kind")
        .order("version", { ascending: false });

      if (error) throw error;
      return parseDataContract(digitalProductLicensesSchema, data, "licenças do produto digital");
    },
  });

export const useDigitalProductDeliverables = (productId: string | undefined) =>
  useQuery({
    queryKey: ["digital-marketplace", "deliverables", productId],
    enabled: productId !== undefined,
    queryFn: async (): Promise<DigitalProductDeliverable[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("digital_product_deliverables")
        .select("id,product_id,asset_id,title,description,position,required,assets(*)")
        .eq("product_id", productId)
        .is("deleted_at", null)
        .order("position");

      if (error) throw error;
      return parseDataContract(
        digitalProductDeliverablesSchema,
        data,
        "entregáveis do produto digital",
      );
    },
  });

export const useAvailableDigitalProductAssets = () =>
  useQuery({
    queryKey: ["digital-marketplace", "available-assets"],
    queryFn: async (): Promise<AssetRow[]> => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("purpose", "digital_product")
        .eq("state", "published")
        .is("lesson_id", null)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return parseDataContract(assetRowsSchema, data, "assets disponíveis para produtos digitais");
    },
  });

export const useMyDigitalProducts = () =>
  useQuery({
    queryKey: ["digital-marketplace", "owned-products"],
    queryFn: async (): Promise<OwnedDigitalProduct[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: accessData, error: accessError } = await supabase
        .from("digital_product_accesses")
        .select(accessSelect)
        .eq("user_id", user.id)
        .eq("status", "active")
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("granted_at", { ascending: false });

      if (accessError) throw accessError;
      const accesses = parseDataContract(
        digitalProductAccessesSchema,
        accessData,
        "acessos ativos a produtos digitais",
      );
      if (accesses.length === 0) return [];

      const productIds = [...new Set(accesses.map((access) => access.product_id))];
      const licenseIds = [...new Set(accesses.map((access) => access.license_id))];
      const [{ data: productData, error: productError }, { data: licenseData, error: licenseError }] =
        await Promise.all([
          supabase.from("digital_products").select(productSelect).in("id", productIds),
          supabase.from("digital_product_licenses").select(licenseSelect).in("id", licenseIds),
        ]);

      if (productError) throw productError;
      if (licenseError) throw licenseError;

      const products = parseDataContract(digitalProductsSchema, productData, "produtos adquiridos");
      const licenses = parseDataContract(
        digitalProductLicensesSchema,
        licenseData,
        "licenças adquiridas",
      );
      const productsById = new Map(products.map((product) => [product.id, product]));
      const licensesById = new Map(licenses.map((license) => [license.id, license]));

      return accesses.map((access) => {
        const product = productsById.get(access.product_id);
        const license = licensesById.get(access.license_id);
        if (!product || !license) {
          throw new Error("O acesso digital não possui produto e licença consistentes.");
        }
        return { access, product, license };
      });
    },
  });

export const useCreateDigitalProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarketplaceCreateProductInput): Promise<DigitalProduct> => {
      const value = parseDataContract(
        marketplaceCreateProductInputSchema,
        input,
        "criação de produto digital",
      );
      const { data, error } = await supabase.rpc("create_digital_product", {
        p_payload: {
          title: value.title,
          slug: value.slug,
          short_description: value.shortDescription || null,
          description: value.description || null,
          category: value.category || null,
          price_amount: value.priceAmount,
          currency_code: value.currencyCode,
          affiliate_eligible: value.affiliateEligible,
        },
      });
      if (error) throw error;
      return parseDataContract(digitalProductSchema, data, "produto digital criado");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace"] });
    },
  });
};

export const useCreateDigitalProductLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarketplaceCreateLicenseInput): Promise<DigitalProductLicense> => {
      const value = parseDataContract(
        marketplaceCreateLicenseInputSchema,
        input,
        "criação de licença digital",
      );
      const { data, error } = await supabase.rpc("create_digital_product_license", {
        p_product_id: value.productId,
        p_payload: {
          kind: value.kind,
          title: value.title,
          summary: value.summary || null,
          terms_text: value.termsText,
          is_default: value.isDefault,
        },
      });
      if (error) throw error;
      return parseDataContract(digitalProductLicenseSchema, data, "licença digital criada");
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace", "licenses", input.productId] });
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace", "admin-products"] });
    },
  });
};

export const usePublishDigitalProductLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (licenseId: string): Promise<DigitalProductLicense> => {
      const { data, error } = await supabase.rpc("publish_digital_product_license", {
        p_license_id: licenseId,
      });
      if (error) throw error;
      return parseDataContract(digitalProductLicenseSchema, data, "licença digital publicada");
    },
    onSuccess: async (license) => {
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace", "licenses", license.product_id] });
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace", "admin-products"] });
    },
  });
};

export const useAttachDigitalProductDeliverable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MarketplaceAttachDeliverableInput) => {
      const value = parseDataContract(
        marketplaceAttachDeliverableInputSchema,
        input,
        "associação de entregável digital",
      );
      const { data, error } = await supabase.rpc("attach_digital_product_deliverable", {
        p_product_id: value.productId,
        p_asset_id: value.assetId,
        p_payload: { title: value.title, description: value.description || null },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace", "deliverables", input.productId] });
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace", "admin-products"] });
    },
  });
};

export const usePublishDigitalProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Pick<DigitalProduct, "id" | "version">): Promise<DigitalProduct> => {
      const { data, error } = await supabase.rpc("publish_digital_product", {
        p_product_id: product.id,
        p_expected_version: product.version,
      });
      if (error) throw error;
      return parseDataContract(digitalProductSchema, data, "produto digital publicado");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["digital-marketplace"] });
    },
  });
};
