import { z } from "zod";

import { assetRowsSchema } from "@/contracts/storage";

export const studentLibraryPageSchema = z
  .object({
    total: z.number().int().nonnegative(),
    assets: assetRowsSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.assets.length > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assets"],
        message: "A página não pode conter mais materiais que o total.",
      });
    }
  });

export type StudentLibraryPage = z.infer<typeof studentLibraryPageSchema>;
