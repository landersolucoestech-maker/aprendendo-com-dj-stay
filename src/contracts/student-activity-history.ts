import { z } from "zod";

import { recentProgressResponseSchema } from "@/contracts/learning";

export const studentActivityHistoryResponseSchema = z
  .object({
    total: z.number().int().nonnegative(),
    rows: recentProgressResponseSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.rows.length > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rows"],
        message: "A página não pode conter mais atividades que o total.",
      });
    }
  });

export type StudentActivityHistoryResponse = z.infer<
  typeof studentActivityHistoryResponseSchema
>;
