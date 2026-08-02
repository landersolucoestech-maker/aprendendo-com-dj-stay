import { z } from "zod";

import { checkoutSubjectTypeSchema } from "@/contracts/checkout";
import { uuidSchema } from "@/contracts/learning";

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
export const affiliateSubjectTypeSchema = checkoutSubjectTypeSchema;
export const affiliateEventTypeSchema = z.enum([
  "profile_created",
  "profile_activated",
  "profile_suspended",
  "terms_configured",
  "link_created",
  "link_deactivated",
  "click_recorded",
  "attribution_created",
  "attribution_replaced",
  "conversion_created",
  "commission_held",
  "commission_available",
  "commission_reversed",
  "commission_restored",
  "payout_created",
  "payout_paid",
  "payout_cancelled",
]);

const timestampSchema = z.string().datetime({ offset: true });
const nullableDateTimeSchema = timestampSchema.nullable();
const centsSchema = z.number().int().nonnegative();
const positiveCentsSchema = z.number().int().positive();
const profileCodeSchema = z.string().regex(/^[a-z0-9]{8,32}$/);
const linkCodeSchema = z.string().regex(/^[a-z0-9]{12,32}$/);
const nullableDisplayNameSchema = z.string().trim().min(2).max(120).nullable();
const nullableSuspensionReasonSchema = z.string().trim().min(3).max(1000).nullable();
const nullableExternalReferenceSchema = z.string().trim().min(3).max(200).nullable();
const nullableNotesSchema = z.string().max(2000).nullable();
const nullableCancellationReasonSchema = z.string().trim().min(3).max(1000).nullable();
const internalPathSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9/_?&=.-]{1,500}$/)
  .refine((value) => !value.startsWith("//") && !value.includes("\\"), {
    message: "O caminho deve permanecer interno e seguro.",
  });

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

const validateProfileState = (
  value: {
    status: z.infer<typeof affiliateProfileStatusSchema>;
    activated_at: string | null;
    suspended_at: string | null;
    suspension_reason: string | null;
  },
  context: z.RefinementCtx,
): void => {
  const pendingIsValid =
    value.status === "pending" &&
    value.activated_at === null &&
    value.suspended_at === null &&
    value.suspension_reason === null;
  const activeIsValid =
    value.status === "active" &&
    value.activated_at !== null &&
    value.suspended_at === null &&
    value.suspension_reason === null;
  const suspendedIsValid =
    value.status === "suspended" &&
    value.activated_at !== null &&
    value.suspended_at !== null &&
    value.suspension_reason !== null;

  if (!pendingIsValid && !activeIsValid && !suspendedIsValid) {
    addIssue(context, "status", "Estado do perfil de afiliado incoerente.");
  }
};

export const affiliateProfileSchema = z
  .object({
    user_id: uuidSchema,
    code: profileCodeSchema,
    status: affiliateProfileStatusSchema,
    display_name: nullableDisplayNameSchema,
    created_by_user_id: uuidSchema.nullable(),
    activated_by_user_id: uuidSchema.nullable(),
    activated_at: nullableDateTimeSchema,
    suspended_at: nullableDateTimeSchema,
    suspension_reason: nullableSuspensionReasonSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict()
  .superRefine(validateProfileState);

export const affiliateSubjectTermsRowSchema = z
  .object({
    id: uuidSchema,
    subject_type: affiliateSubjectTypeSchema,
    subject_id: uuidSchema,
    commission_bps: z.number().int().min(1).max(10_000),
    attribution_window_days: z.number().int().min(1).max(365),
    active: z.boolean(),
    created_by_user_id: uuidSchema.nullable(),
    updated_by_user_id: uuidSchema.nullable(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const affiliatePortalSummarySchema = z
  .object({
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    gross_sales_cents: centsSchema,
    available_cents: centsSchema,
    held_cents: centsSchema,
    paid_cents: centsSchema,
    reversed_cents: centsSchema,
  })
  .strict();

export const affiliateOfferSchema = z
  .object({
    subject_type: affiliateSubjectTypeSchema,
    subject_id: uuidSchema,
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    commission_bps: z.number().int().min(1).max(10_000),
    attribution_window_days: z.number().int().min(1).max(365),
    link_id: uuidSchema.nullable(),
    link_code: linkCodeSchema.nullable(),
    destination_path: internalPathSchema.nullable(),
    link_status: affiliateLinkStatusSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const linkFields = [
      value.link_id,
      value.link_code,
      value.destination_path,
      value.link_status,
    ];
    const populated = linkFields.filter((field) => field !== null).length;

    if (populated !== 0 && populated !== linkFields.length) {
      addIssue(context, "link_id", "Dados do link devem existir em conjunto.");
    }
    if (populated === linkFields.length && value.link_status !== "active") {
      addIssue(context, "link_status", "Oferta só expõe link ativo.");
    }
  });

export const affiliateLinkSchema = z
  .object({
    id: uuidSchema,
    subject_type: affiliateSubjectTypeSchema,
    subject_id: uuidSchema,
    code: linkCodeSchema,
    status: affiliateLinkStatusSchema,
    destination_path: internalPathSchema,
    created_at: timestampSchema,
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    commission_cents: centsSchema,
  })
  .strict();

export const affiliateLinkRowSchema = z
  .object({
    id: uuidSchema,
    affiliate_user_id: uuidSchema,
    subject_type: affiliateSubjectTypeSchema,
    subject_id: uuidSchema,
    code: linkCodeSchema,
    status: affiliateLinkStatusSchema,
    destination_path: internalPathSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
    deactivated_at: nullableDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const valid =
      (value.status === "active" && value.deactivated_at === null) ||
      (value.status === "inactive" && value.deactivated_at !== null);
    if (!valid) {
      addIssue(context, "status", "Estado do link de afiliado incoerente.");
    }
  });

export const affiliateCommissionSchema = z
  .object({
    id: uuidSchema,
    order_id: uuidSchema,
    title: z.string().trim().min(1),
    basis_amount_cents: positiveCentsSchema,
    commission_bps: z.number().int().min(1).max(10_000),
    commission_amount_cents: positiveCentsSchema,
    status: affiliateCommissionStatusSchema,
    created_at: timestampSchema,
    available_at: nullableDateTimeSchema,
    paid_at: nullableDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.commission_amount_cents > value.basis_amount_cents) {
      addIssue(context, "commission_amount_cents", "Comissão excede a base.");
    }

    if (
      (value.status === "pending" &&
        (value.available_at !== null || value.paid_at !== null)) ||
      (value.status === "available" &&
        (value.available_at === null || value.paid_at !== null)) ||
      (value.status === "paid" &&
        (value.available_at === null || value.paid_at === null)) ||
      ((value.status === "held" || value.status === "reversed") &&
        value.paid_at !== null)
    ) {
      addIssue(context, "status", "Estado da comissão incoerente.");
    }
  });

export const affiliatePayoutSchema = z
  .object({
    id: uuidSchema,
    status: affiliatePayoutStatusSchema,
    amount_cents: positiveCentsSchema,
    external_reference: nullableExternalReferenceSchema,
    notes: nullableNotesSchema,
    paid_at: nullableDateTimeSchema,
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.status === "paid" &&
        (value.paid_at === null || value.external_reference === null)) ||
      (value.status !== "paid" && value.paid_at !== null)
    ) {
      addIssue(context, "status", "Estado do pagamento incoerente.");
    }
  });

export const affiliatePayoutRowSchema = z
  .object({
    id: uuidSchema,
    affiliate_user_id: uuidSchema,
    status: affiliatePayoutStatusSchema,
    amount_cents: positiveCentsSchema,
    currency_code: z.literal("BRL"),
    external_reference: nullableExternalReferenceSchema,
    notes: nullableNotesSchema,
    created_by_user_id: uuidSchema.nullable(),
    paid_by_user_id: uuidSchema.nullable(),
    paid_at: nullableDateTimeSchema,
    cancelled_at: nullableDateTimeSchema,
    cancellation_reason: nullableCancellationReasonSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const draftIsValid =
      value.status === "draft" &&
      value.paid_at === null &&
      value.cancelled_at === null &&
      value.cancellation_reason === null;
    const paidIsValid =
      value.status === "paid" &&
      value.paid_at !== null &&
      value.paid_by_user_id !== null &&
      value.external_reference !== null &&
      value.cancelled_at === null &&
      value.cancellation_reason === null;
    const cancelledIsValid =
      value.status === "cancelled" &&
      value.paid_at === null &&
      value.cancelled_at !== null &&
      value.cancellation_reason !== null;

    if (!draftIsValid && !paidIsValid && !cancelledIsValid) {
      addIssue(context, "status", "Estado do payout incoerente.");
    }
  });

export const affiliateEventSchema = z
  .object({
    id: uuidSchema,
    event_type: affiliateEventTypeSchema,
    details: z.record(z.unknown()),
    created_at: timestampSchema,
  })
  .strict();

export const affiliatePortalSchema = z
  .object({
    profile: affiliateProfileSchema.nullable(),
    summary: affiliatePortalSummarySchema,
    offers: z.array(affiliateOfferSchema),
    links: z.array(affiliateLinkSchema),
    commissions: z.array(affiliateCommissionSchema),
    payouts: z.array(affiliatePayoutSchema),
    events: z.array(affiliateEventSchema),
  })
  .strict();

const affiliateClickRejectedSchema = z
  .object({
    accepted: z.literal(false),
    reason: z.enum([
      "AFFILIATE_LINK_NOT_AVAILABLE",
      "AFFILIATE_SUBJECT_NOT_AVAILABLE",
    ]),
  })
  .strict();

const affiliateClickAcceptedSchema = z
  .object({
    accepted: z.literal(true),
    reason: z.null(),
    destination_path: internalPathSchema,
    attribution_id: uuidSchema,
    expires_at: timestampSchema,
  })
  .strict();

export const affiliateClickResultSchema = z.discriminatedUnion("accepted", [
  affiliateClickRejectedSchema,
  affiliateClickAcceptedSchema,
]);

export const affiliateAdminProfileSchema = z
  .object({
    user_id: uuidSchema,
    code: profileCodeSchema.nullable(),
    status: z.enum(["not_requested", "pending", "active", "suspended"]),
    display_name: nullableDisplayNameSchema,
    created_at: nullableDateTimeSchema,
    activated_at: nullableDateTimeSchema,
    suspended_at: nullableDateTimeSchema,
    suspension_reason: nullableSuspensionReasonSchema,
    links: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    available_cents: centsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const noProfile =
      value.status === "not_requested" &&
      value.code === null &&
      value.display_name === null &&
      value.created_at === null &&
      value.activated_at === null &&
      value.suspended_at === null &&
      value.suspension_reason === null;
    const pending =
      value.status === "pending" &&
      value.code !== null &&
      value.created_at !== null &&
      value.activated_at === null &&
      value.suspended_at === null &&
      value.suspension_reason === null;
    const active =
      value.status === "active" &&
      value.code !== null &&
      value.created_at !== null &&
      value.activated_at !== null &&
      value.suspended_at === null &&
      value.suspension_reason === null;
    const suspended =
      value.status === "suspended" &&
      value.code !== null &&
      value.created_at !== null &&
      value.activated_at !== null &&
      value.suspended_at !== null &&
      value.suspension_reason !== null;

    if (!noProfile && !pending && !active && !suspended) {
      addIssue(context, "status", "Estado administrativo do perfil incoerente.");
    }
  });

export const affiliateAdminOfferSchema = z
  .object({
    subject_type: affiliateSubjectTypeSchema,
    subject_id: uuidSchema,
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    publication_status: z.string().trim().min(1),
    affiliate_eligible: z.boolean(),
    terms_id: uuidSchema.nullable(),
    commission_bps: z.number().int().min(1).max(10_000).nullable(),
    attribution_window_days: z.number().int().min(1).max(365).nullable(),
    terms_active: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const fields = [
      value.terms_id,
      value.commission_bps,
      value.attribution_window_days,
    ];
    const populated = fields.filter((field) => field !== null).length;
    if (populated !== 0 && populated !== fields.length) {
      addIssue(context, "terms_id", "Termos devem existir em conjunto.");
    }
    if (populated === 0 && value.terms_active) {
      addIssue(context, "terms_active", "Oferta sem termos não pode estar ativa.");
    }
  });

export const affiliateAdminCommissionSchema = z
  .object({
    id: uuidSchema,
    affiliate_user_id: uuidSchema,
    order_id: uuidSchema,
    title: z.string().trim().min(1),
    basis_amount_cents: positiveCentsSchema,
    commission_bps: z.number().int().min(1).max(10_000),
    commission_amount_cents: positiveCentsSchema,
    created_at: timestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.commission_amount_cents > value.basis_amount_cents) {
      addIssue(context, "commission_amount_cents", "Comissão excede a base.");
    }
  });

export const affiliateAdminPayoutSchema = z
  .object({
    id: uuidSchema,
    affiliate_user_id: uuidSchema,
    status: affiliatePayoutStatusSchema,
    amount_cents: positiveCentsSchema,
    external_reference: nullableExternalReferenceSchema,
    notes: nullableNotesSchema,
    cancellation_reason: nullableCancellationReasonSchema,
    created_at: timestampSchema,
    paid_at: nullableDateTimeSchema,
    cancelled_at: nullableDateTimeSchema,
    commission_ids: z.array(uuidSchema).min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.commission_ids).size !== value.commission_ids.length) {
      addIssue(context, "commission_ids", "Comissões duplicadas não são permitidas.");
    }

    const draft =
      value.status === "draft" &&
      value.paid_at === null &&
      value.cancelled_at === null &&
      value.cancellation_reason === null;
    const paid =
      value.status === "paid" &&
      value.paid_at !== null &&
      value.external_reference !== null &&
      value.cancelled_at === null &&
      value.cancellation_reason === null;
    const cancelled =
      value.status === "cancelled" &&
      value.paid_at === null &&
      value.cancelled_at !== null &&
      value.cancellation_reason !== null;

    if (!draft && !paid && !cancelled) {
      addIssue(context, "status", "Estado administrativo do payout incoerente.");
    }
  });

export const affiliateAdminDashboardSchema = z
  .object({
    summary: z
      .object({
        affiliates: z.number().int().nonnegative(),
        active_affiliates: z.number().int().nonnegative(),
        clicks: z.number().int().nonnegative(),
        conversions: z.number().int().nonnegative(),
        available_cents: centsSchema,
        held_cents: centsSchema,
        paid_cents: centsSchema,
      })
      .strict(),
    profiles: z.array(affiliateAdminProfileSchema),
    offers: z.array(affiliateAdminOfferSchema),
    available_commissions: z.array(affiliateAdminCommissionSchema),
    payouts: z.array(affiliateAdminPayoutSchema),
  })
  .strict();

export const affiliateDisplayNameInputSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || value.length >= 2, {
    message: "Nome deve ter ao menos 2 caracteres.",
  })
  .refine((value) => value.length <= 120, {
    message: "Nome deve ter no máximo 120 caracteres.",
  });

export const affiliateCreateLinkInputSchema = z
  .object({
    subjectType: affiliateSubjectTypeSchema,
    subjectId: uuidSchema,
    destinationPath: internalPathSchema,
  })
  .strict();

export const affiliateProfileStatusInputSchema = z.discriminatedUnion("status", [
  z
    .object({
      userId: uuidSchema,
      status: z.literal("active"),
      reason: z.null().optional(),
    })
    .strict(),
  z
    .object({
      userId: uuidSchema,
      status: z.literal("suspended"),
      reason: z.string().trim().min(3).max(1000),
    })
    .strict(),
]);

export const affiliateTermsInputSchema = z
  .object({
    subjectType: affiliateSubjectTypeSchema,
    subjectId: uuidSchema,
    commissionBps: z.number().int().min(1).max(10_000),
    attributionWindowDays: z.number().int().min(1).max(365),
    active: z.boolean(),
  })
  .strict();

export const affiliateCreatePayoutInputSchema = z
  .object({
    affiliateUserId: uuidSchema,
    commissionIds: z.array(uuidSchema).min(1).max(500),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.commissionIds).size !== value.commissionIds.length) {
      addIssue(context, "commissionIds", "Comissões duplicadas não são permitidas.");
    }
  });

export const affiliateMarkPayoutPaidInputSchema = z
  .object({
    payoutId: uuidSchema,
    externalReference: z.string().trim().min(3).max(200),
  })
  .strict();

export const affiliateCancelPayoutInputSchema = z
  .object({
    payoutId: uuidSchema,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export type AffiliatePortal = z.infer<typeof affiliatePortalSchema>;
export type AffiliateAdminDashboard = z.infer<typeof affiliateAdminDashboardSchema>;
export type AffiliateSubjectType = z.infer<typeof affiliateSubjectTypeSchema>;
