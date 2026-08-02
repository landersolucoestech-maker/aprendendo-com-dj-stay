import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";
import { assetRowSchema } from "@/contracts/storage";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const nullableShortDescriptionSchema = z.string().min(1).max(500).nullable();
const nullableDescriptionSchema = z.string().min(1).max(20_000).nullable();
const nullableCategorySchema = z.string().min(1).max(120).nullable();
const nullableLicenseSummarySchema = z.string().min(1).max(1_000).nullable();
const nullableDeliverableDescriptionSchema = z.string().min(1).max(2_000).nullable();
const nullableSourceReferenceSchema = z.string().min(1).max(200).nullable();
const nullableRevocationReasonSchema = z.string().min(3).max(1_000).nullable();

export const digitalProductStatusSchema = z.enum(["draft", "published", "archived"]);
export const digitalLicenseStatusSchema = z.enum(["draft", "published", "archived"]);
export const digitalLicenseKindSchema = z.enum(["personal", "commercial", "extended", "custom"]);
export const digitalProductAccessStatusSchema = z.enum(["active", "revoked"]);
export const digitalProductAccessSourceSchema = z.enum(["manual_grant", "complimentary", "purchase"]);
export const digitalProductEventTypeSchema = z.enum([
  "created",
  "updated",
  "published",
  "unpublished",
  "archived",
  "deleted",
  "deliverable_attached",
  "deliverable_updated",
  "deliverable_removed",
  "license_created",
  "license_published",
  "license_archived",
  "access_granted",
  "access_revoked",
]);

const addIssue = (
  context: z.RefinementCtx,
  path: string,
  message: string,
): void => {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
};

const isAfter = (later: string, earlier: string): boolean =>
  new Date(later).getTime() > new Date(earlier).getTime();

export const digitalProductSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(3).max(200),
    slug: z
      .string()
      .min(3)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    short_description: nullableShortDescriptionSchema,
    description: nullableDescriptionSchema,
    category: nullableCategorySchema,
    status: digitalProductStatusSchema,
    cover_asset_id: uuidSchema.nullable(),
    thumbnail_asset_id: uuidSchema.nullable(),
    price_amount: z.number().finite().nonnegative(),
    currency_code: z.string().regex(/^[A-Z]{3}$/),
    promotional_price_amount: z.number().finite().nonnegative().nullable(),
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
  .strict()
  .superRefine((value, context) => {
    if (
      value.promotional_price_amount !== null &&
      value.promotional_price_amount >= value.price_amount
    ) {
      addIssue(
        context,
        "promotional_price_amount",
        "O preço promocional deve ser menor que o preço principal.",
      );
    }

    if (
      value.promotion_starts_at !== null &&
      value.promotion_ends_at !== null &&
      !isAfter(value.promotion_ends_at, value.promotion_starts_at)
    ) {
      addIssue(
        context,
        "promotion_ends_at",
        "O fim da promoção deve ocorrer após o início.",
      );
    }

    if (
      value.availability_starts_at !== null &&
      value.availability_ends_at !== null &&
      !isAfter(value.availability_ends_at, value.availability_starts_at)
    ) {
      addIssue(
        context,
        "availability_ends_at",
        "O fim da disponibilidade deve ocorrer após o início.",
      );
    }

    const draftIsValid =
      value.status === "draft" &&
      value.archived_at === null &&
      value.deleted_at === null &&
      (value.unpublished_at === null || value.published_at !== null);
    const publishedIsValid =
      value.status === "published" &&
      value.published_at !== null &&
      value.archived_at === null &&
      value.deleted_at === null;
    const archivedIsValid =
      value.status === "archived" && value.archived_at !== null;

    if (!draftIsValid && !publishedIsValid && !archivedIsValid) {
      addIssue(
        context,
        "status",
        "O ciclo de vida do produto digital está incoerente.",
      );
    }
  });

export const digitalProductsSchema = z.array(digitalProductSchema);

export const digitalProductLicenseSchema = z
  .object({
    id: uuidSchema,
    product_id: uuidSchema,
    kind: digitalLicenseKindSchema,
    title: z.string().trim().min(3).max(200),
    summary: nullableLicenseSummarySchema,
    terms_text: z.string().trim().min(20).max(50_000),
    version: z.number().int().positive(),
    status: digitalLicenseStatusSchema,
    is_default: z.boolean(),
    created_by_user_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    published_at: nullableTimestampSchema,
    archived_at: nullableTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const draftIsValid =
      value.status === "draft" &&
      value.published_at === null &&
      value.archived_at === null;
    const publishedIsValid =
      value.status === "published" &&
      value.published_at !== null &&
      value.archived_at === null;
    const archivedIsValid =
      value.status === "archived" && value.archived_at !== null;

    if (!draftIsValid && !publishedIsValid && !archivedIsValid) {
      addIssue(
        context,
        "status",
        "O ciclo de vida da licença digital está incoerente.",
      );
    }
  });

export const digitalProductLicensesSchema = z.array(digitalProductLicenseSchema);

export const digitalProductDeliverableRowSchema = z
  .object({
    id: uuidSchema,
    product_id: uuidSchema,
    asset_id: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: nullableDeliverableDescriptionSchema,
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
    source_reference: nullableSourceReferenceSchema,
    license_snapshot: z.record(z.string(), z.unknown()),
    granted_by_user_id: uuidSchema.nullable(),
    granted_at: timestampSchema,
    expires_at: nullableTimestampSchema,
    revoked_at: nullableTimestampSchema,
    revocation_reason: nullableRevocationReasonSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.expires_at !== null &&
      !isAfter(value.expires_at, value.granted_at)
    ) {
      addIssue(
        context,
        "expires_at",
        "A expiração deve ocorrer após a concessão.",
      );
    }

    const activeIsValid =
      value.status === "active" &&
      value.revoked_at === null &&
      value.revocation_reason === null;
    const revokedIsValid =
      value.status === "revoked" &&
      value.revoked_at !== null &&
      value.revocation_reason !== null;

    if (!activeIsValid && !revokedIsValid) {
      addIssue(
        context,
        "status",
        "O estado do acesso digital está incoerente.",
      );
    }
  });

export const digitalProductAccessesSchema = z.array(digitalProductAccessSchema);

export const digitalProductEventSchema = z
  .object({
    id: uuidSchema,
    product_id: uuidSchema,
    deliverable_id: uuidSchema.nullable(),
    license_id: uuidSchema.nullable(),
    access_id: uuidSchema.nullable(),
    actor_user_id: uuidSchema.nullable(),
    event_type: digitalProductEventTypeSchema,
    version: z.number().int().positive().nullable(),
    details: z.record(z.string(), z.unknown()),
    created_at: timestampSchema,
  })
  .strict();

export const digitalProductEventsSchema = z.array(digitalProductEventSchema);

const marketplaceProductValuesSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    shortDescription: z.string().trim().max(500),
    description: z.string().trim().max(20_000),
    category: z.string().trim().max(120),
    priceAmount: z.number().finite().nonnegative(),
    currencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/),
    affiliateEligible: z.boolean(),
  })
  .strict();

export const marketplaceCreateProductInputSchema = marketplaceProductValuesSchema;

export const marketplaceUpdateProductInputSchema = z
  .object({
    productId: uuidSchema,
    expectedVersion: z.number().int().positive(),
    values: marketplaceProductValuesSchema,
  })
  .strict();

export const marketplaceProductLifecycleInputSchema = z
  .object({
    productId: uuidSchema,
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const marketplaceLicenseLifecycleInputSchema = z
  .object({
    licenseId: uuidSchema,
  })
  .strict();

export const marketplaceCreateLicenseInputSchema = z
  .object({
    productId: uuidSchema,
    kind: digitalLicenseKindSchema,
    title: z.string().trim().min(3).max(200),
    summary: z.string().trim().max(1_000),
    termsText: z.string().trim().min(20).max(50_000),
    isDefault: z.boolean(),
  })
  .strict();

export const marketplaceAttachDeliverableInputSchema = z
  .object({
    productId: uuidSchema,
    assetId: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000),
  })
  .strict();

export type DigitalProductStatus = z.infer<typeof digitalProductStatusSchema>;
export type DigitalLicenseKind = z.infer<typeof digitalLicenseKindSchema>;
export type DigitalProduct = z.infer<typeof digitalProductSchema>;
export type DigitalProductLicense = z.infer<typeof digitalProductLicenseSchema>;
export type DigitalProductDeliverableRow = z.infer<typeof digitalProductDeliverableRowSchema>;
export type DigitalProductDeliverable = z.infer<typeof digitalProductDeliverableSchema>;
export type DigitalProductAccess = z.infer<typeof digitalProductAccessSchema>;
export type DigitalProductEvent = z.infer<typeof digitalProductEventSchema>;
export type MarketplaceCreateProductInput = z.infer<typeof marketplaceCreateProductInputSchema>;
export type MarketplaceUpdateProductInput = z.infer<typeof marketplaceUpdateProductInputSchema>;
export type MarketplaceProductLifecycleInput = z.infer<typeof marketplaceProductLifecycleInputSchema>;
export type MarketplaceLicenseLifecycleInput = z.infer<typeof marketplaceLicenseLifecycleInputSchema>;
export type MarketplaceCreateLicenseInput = z.infer<typeof marketplaceCreateLicenseInputSchema>;
export type MarketplaceAttachDeliverableInput = z.infer<typeof marketplaceAttachDeliverableInputSchema>;
