import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";
import { assetRowSchema } from "@/contracts/storage";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const nullableTextSchema = z.string().nullable();

export const digitalProductStatusSchema = z.enum(["draft", "published", "archived"]);
export const digitalLicenseStatusSchema = z.enum(["draft", "published", "archived"]);
export const digitalLicenseKindSchema = z.enum(["personal", "commercial", "extended", "custom"]);
export const digitalProductAccessStatusSchema = z.enum(["active", "revoked"]);
export const digitalProductAccessSourceSchema = z.enum(["manual_grant", "complimentary", "purchase"]);

export const digitalProductSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(3).max(200),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    short_description: nullableTextSchema,
    description: nullableTextSchema,
    category: nullableTextSchema,
    status: digitalProductStatusSchema,
    cover_asset_id: uuidSchema.nullable(),
    thumbnail_asset_id: uuidSchema.nullable(),
    price_amount: z.number().nonnegative(),
    currency_code: z.string().regex(/^[A-Z]{3}$/),
    promotional_price_amount: z.number().nonnegative().nullable(),
    promotion_starts_at: nullableTimestampSchema,
    promotion_ends_at: nullableTimestampSchema,
    availability_starts_at: nullableTimestampSchema,
    availability_ends_at: nullableTimestampSchema,
    affiliate_eligible: z.boolean(),
    version: z.number().int().positive(),
    created_by_user_id: uuidSchema.nullable(),
    updated_by_user_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    published_at: nullableTimestampSchema,
    unpublished_at: nullableTimestampSchema,
    archived_at: nullableTimestampSchema,
    deleted_at: nullableTimestampSchema,
  })
  .strict();

export const digitalProductsSchema = z.array(digitalProductSchema);

export const digitalProductLicenseSchema = z
  .object({
    id: uuidSchema,
    product_id: uuidSchema,
    kind: digitalLicenseKindSchema,
    title: z.string().trim().min(3).max(200),
    summary: nullableTextSchema,
    terms_text: z.string().trim().min(20).max(50_000),
    version: z.number().int().positive(),
    status: digitalLicenseStatusSchema,
    is_default: z.boolean(),
    created_by_user_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    published_at: nullableTimestampSchema,
    archived_at: nullableTimestampSchema,
  })
  .strict();

export const digitalProductLicensesSchema = z.array(digitalProductLicenseSchema);

export const digitalProductDeliverableRowSchema = z
  .object({
    id: uuidSchema,
    product_id: uuidSchema,
    asset_id: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: nullableTextSchema,
    position: z.number().int().nonnegative(),
    required: z.boolean(),
    created_by_user_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
    deleted_at: nullableTimestampSchema,
  })
  .strict();

export const digitalProductDeliverableSchema = digitalProductDeliverableRowSchema
  .extend({ assets: assetRowSchema })
  .strict();

export const digitalProductDeliverablesSchema = z.array(digitalProductDeliverableSchema);

export const digitalProductAccessSchema = z
  .object({
    id: uuidSchema,
    product_id: uuidSchema,
    user_id: uuidSchema,
    license_id: uuidSchema,
    status: digitalProductAccessStatusSchema,
    source: digitalProductAccessSourceSchema,
    source_reference: nullableTextSchema,
    license_snapshot: z.record(z.string(), z.unknown()),
    granted_by_user_id: uuidSchema.nullable(),
    granted_at: timestampSchema,
    expires_at: nullableTimestampSchema,
    revoked_at: nullableTimestampSchema,
    revocation_reason: nullableTextSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const digitalProductAccessesSchema = z.array(digitalProductAccessSchema);

export const marketplaceCreateProductInputSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    shortDescription: z.string().trim().max(500),
    description: z.string().trim().max(20_000),
    category: z.string().trim().max(120),
    priceAmount: z.number().nonnegative(),
    currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    affiliateEligible: z.boolean(),
  })
  .strict();

export const marketplaceCreateLicenseInputSchema = z
  .object({
    productId: uuidSchema,
    kind: digitalLicenseKindSchema,
    title: z.string().trim().min(3).max(200),
    summary: z.string().trim().max(1000),
    termsText: z.string().trim().min(20).max(50_000),
    isDefault: z.boolean(),
  })
  .strict();

export const marketplaceAttachDeliverableInputSchema = z
  .object({
    productId: uuidSchema,
    assetId: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000),
  })
  .strict();

export type DigitalProduct = z.infer<typeof digitalProductSchema>;
export type DigitalProductLicense = z.infer<typeof digitalProductLicenseSchema>;
export type DigitalProductDeliverableRow = z.infer<typeof digitalProductDeliverableRowSchema>;
export type DigitalProductDeliverable = z.infer<typeof digitalProductDeliverableSchema>;
export type DigitalProductAccess = z.infer<typeof digitalProductAccessSchema>;
export type MarketplaceCreateProductInput = z.infer<typeof marketplaceCreateProductInputSchema>;
export type MarketplaceCreateLicenseInput = z.infer<typeof marketplaceCreateLicenseInputSchema>;
export type MarketplaceAttachDeliverableInput = z.infer<typeof marketplaceAttachDeliverableInputSchema>;
