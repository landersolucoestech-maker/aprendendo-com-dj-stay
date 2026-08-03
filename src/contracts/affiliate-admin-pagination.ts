import { z } from "zod";

import { affiliateAdminDashboardSchema } from "@/contracts/affiliate";

export const affiliateAdminTotalsSchema = z
  .object({
    profiles: z.number().int().nonnegative(),
    offers: z.number().int().nonnegative(),
    available_commissions: z.number().int().nonnegative(),
    payouts: z.number().int().nonnegative(),
  })
  .strict();

export const paginatedAffiliateAdminDashboardSchema = affiliateAdminDashboardSchema
  .extend({
    totals: affiliateAdminTotalsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const pages = [
      ["profiles", value.profiles.length, value.totals.profiles],
      ["offers", value.offers.length, value.totals.offers],
      [
        "available_commissions",
        value.available_commissions.length,
        value.totals.available_commissions,
      ],
      ["payouts", value.payouts.length, value.totals.payouts],
    ] as const;

    for (const [path, pageSize, total] of pages) {
      if (pageSize > total) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: "A página não pode conter mais registros que o total persistido.",
        });
      }
    }
  });

export type PaginatedAffiliateAdminDashboard = z.infer<
  typeof paginatedAffiliateAdminDashboardSchema
>;
