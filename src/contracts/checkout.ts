import { z } from "zod";

export const checkoutSubjectTypeSchema = z.enum(["course", "digital_product"]);

export const hostedCheckoutInputSchema = z
  .object({
    subjectType: checkoutSubjectTypeSchema,
    subjectId: z.string().uuid(),
    licenseId: z.string().uuid().nullable(),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.subjectType === "course" && value.licenseId !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["licenseId"],
        message: "Curso não aceita licença de produto digital.",
      });
    }

    if (value.subjectType === "digital_product" && value.licenseId === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["licenseId"],
        message: "Produto digital exige uma licença publicada.",
      });
    }
  });

export const hostedCheckoutResultSchema = z
  .object({
    checkoutIntentId: z.string().uuid(),
    checkoutUrl: z.string().url().refine((value) => value.startsWith("https://"), {
      message: "A URL do checkout deve usar HTTPS.",
    }),
    expiresAt: z.string().datetime({ offset: true }),
    status: z.literal("checkout_created"),
  })
  .strict();

export type HostedCheckoutInput = z.infer<typeof hostedCheckoutInputSchema>;
export type HostedCheckoutResult = z.infer<typeof hostedCheckoutResultSchema>;
