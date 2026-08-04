import { z } from "zod";

export const studentLibrarySummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
  })
  .strict();

export type StudentLibrarySummary = z.infer<
  typeof studentLibrarySummarySchema
>;
