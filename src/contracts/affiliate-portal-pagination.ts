import { z } from "zod";

import { affiliatePortalSchema } from "@/contracts/affiliate";

export const affiliatePortalTotalsSchema = z
  .object({
    offers: z.number().int().nonnegative(),
    links: z.number().int().nonnegative(),
    commissions: z.number().int().nonnegative(),
    payouts: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
  })
  .strict();

export const paginatedAffiliatePortalSchema = affiliatePortalSchema
  .extend({
    totals: affiliatePortalTotalsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const pages = [
      ["offers", value.offers.length, value.totals.offers],
      ["links", value.links.length, value.totals.links],
      ["commissions", value.commissions.length, value.totals.commissions],
      ["payouts", value.payouts.length, value.totals.payouts],
      ["events", value.events.length, value.totals.events],
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

export type PaginatedAffiliatePortal = z.infer<
  typeof paginatedAffiliatePortalSchema
>;
