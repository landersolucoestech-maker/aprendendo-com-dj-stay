import { z } from "zod";

export const affiliateProfileStatusSchema = z.enum(["pending", "active", "suspended"]);
export const affiliateLinkStatusSchema = z.enum(["active", "inactive"]);
export const affiliateCommissionStatusSchema = z.enum([
  "pending",
  "available",
  "held",
  "paid",
  "reversed",
]);
export const affiliatePayoutStatusSchema = z.enum(["draft", "paid", "cancelled"]);
export const affiliateSubjectTypeSchema = z.enum(["course", "digital_product"]);

const nullableDateTime = z.string().datetime({ offset: true }).nullable();
const centsSchema = z.number().int().nonnegative();

export const affiliateProfileSchema = z.object({
  user_id: z.string().uuid(),
  code: z.string().min(8).max(32),
  status: affiliateProfileStatusSchema,
  display_name: z.string().nullable(),
  activated_at: nullableDateTime,
  suspended_at: nullableDateTime,
  suspension_reason: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const affiliatePortalSummarySchema = z.object({
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  gross_sales_cents: centsSchema,
  available_cents: centsSchema,
  held_cents: centsSchema,
  paid_cents: centsSchema,
  reversed_cents: centsSchema,
});

export const affiliateOfferSchema = z.object({
  subject_type: affiliateSubjectTypeSchema,
  subject_id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  commission_bps: z.number().int().min(1).max(10_000),
  attribution_window_days: z.number().int().min(1).max(365),
  link_id: z.string().uuid().nullable(),
  link_code: z.string().nullable(),
  destination_path: z.string().nullable(),
  link_status: affiliateLinkStatusSchema.nullable(),
});

export const affiliateLinkSchema = z.object({
  id: z.string().uuid(),
  subject_type: affiliateSubjectTypeSchema,
  subject_id: z.string().uuid(),
  code: z.string().min(8),
  status: affiliateLinkStatusSchema,
  destination_path: z.string().startsWith("/"),
  created_at: z.string().datetime({ offset: true }),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  commission_cents: centsSchema,
});

export const affiliateCommissionSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  title: z.string().min(1),
  basis_amount_cents: centsSchema,
  commission_bps: z.number().int().min(1).max(10_000),
  commission_amount_cents: centsSchema,
  status: affiliateCommissionStatusSchema,
  created_at: z.string().datetime({ offset: true }),
  available_at: nullableDateTime,
  paid_at: nullableDateTime,
});

export const affiliatePayoutSchema = z.object({
  id: z.string().uuid(),
  status: affiliatePayoutStatusSchema,
  amount_cents: centsSchema,
  external_reference: z.string().nullable(),
  notes: z.string().nullable(),
  paid_at: nullableDateTime,
  created_at: z.string().datetime({ offset: true }),
});

export const affiliateEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string().min(1),
  details: z.record(z.unknown()),
  created_at: z.string().datetime({ offset: true }),
});

export const affiliatePortalSchema = z.object({
  profile: affiliateProfileSchema.nullable(),
  summary: affiliatePortalSummarySchema,
  offers: z.array(affiliateOfferSchema),
  links: z.array(affiliateLinkSchema),
  commissions: z.array(affiliateCommissionSchema),
  payouts: z.array(affiliatePayoutSchema),
  events: z.array(affiliateEventSchema),
});

export const affiliateClickResultSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().nullable(),
  destination_path: z.string().startsWith("/").optional(),
  attribution_id: z.string().uuid().optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

export const affiliateAdminProfileSchema = z.object({
  user_id: z.string().uuid(),
  code: z.string().nullable(),
  status: z.enum(["not_requested", "pending", "active", "suspended"]),
  display_name: z.string().nullable(),
  created_at: nullableDateTime,
  activated_at: nullableDateTime,
  suspended_at: nullableDateTime,
  suspension_reason: z.string().nullable(),
  links: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  available_cents: centsSchema,
});

export const affiliateAdminOfferSchema = z.object({
  subject_type: affiliateSubjectTypeSchema,
  subject_id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  publication_status: z.string().min(1),
  affiliate_eligible: z.boolean(),
  terms_id: z.string().uuid().nullable(),
  commission_bps: z.number().int().min(1).max(10_000).nullable(),
  attribution_window_days: z.number().int().min(1).max(365).nullable(),
  terms_active: z.boolean(),
});

export const affiliateAdminCommissionSchema = z.object({
  id: z.string().uuid(),
  affiliate_user_id: z.string().uuid(),
  order_id: z.string().uuid(),
  title: z.string().min(1),
  basis_amount_cents: centsSchema,
  commission_bps: z.number().int().min(1).max(10_000),
  commission_amount_cents: centsSchema,
  created_at: z.string().datetime({ offset: true }),
});

export const affiliateAdminPayoutSchema = z.object({
  id: z.string().uuid(),
  affiliate_user_id: z.string().uuid(),
  status: affiliatePayoutStatusSchema,
  amount_cents: centsSchema,
  external_reference: z.string().nullable(),
  notes: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  paid_at: nullableDateTime,
  cancelled_at: nullableDateTime,
  commission_ids: z.array(z.string().uuid()),
});

export const affiliateAdminDashboardSchema = z.object({
  summary: z.object({
    affiliates: z.number().int().nonnegative(),
    active_affiliates: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    available_cents: centsSchema,
    held_cents: centsSchema,
    paid_cents: centsSchema,
  }),
  profiles: z.array(affiliateAdminProfileSchema),
  offers: z.array(affiliateAdminOfferSchema),
  available_commissions: z.array(affiliateAdminCommissionSchema),
  payouts: z.array(affiliateAdminPayoutSchema),
});

export type AffiliatePortal = z.infer<typeof affiliatePortalSchema>;
export type AffiliateAdminDashboard = z.infer<typeof affiliateAdminDashboardSchema>;
export type AffiliateSubjectType = z.infer<typeof affiliateSubjectTypeSchema>;
