import { z } from "zod";

export const checkoutCronHealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "running",
  "never_run",
  "inactive",
  "missing",
]);

export const checkoutCronRunSchema = z
  .object({
    status: z.string().min(1).max(50),
    started_at: z.string().datetime({ offset: true }),
    ended_at: z.string().datetime({ offset: true }).nullable(),
    duration_ms: z.number().int().nonnegative(),
    message: z.string().min(1).max(500).nullable(),
  })
  .strict();

export const checkoutCronHealthSchema = z
  .object({
    job_name: z.literal("expire-due-checkout-intents"),
    configured: z.boolean(),
    active: z.boolean(),
    schedule: z.string().min(1).max(100).nullable(),
    health: checkoutCronHealthStatusSchema,
    last_run_status: z.string().min(1).max(50).nullable(),
    last_run_at: z.string().datetime({ offset: true }).nullable(),
    last_success_at: z.string().datetime({ offset: true }).nullable(),
    failed_runs_24h: z.number().int().nonnegative(),
    observed_at: z.string().datetime({ offset: true }),
    runs: z.array(checkoutCronRunSchema).max(25),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.configured && (value.active || value.schedule !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Um job ausente não pode estar ativo nem possuir agenda.",
      });
    }

    if (value.health === "missing" && value.configured) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O estado missing exige configured=false.",
      });
    }

    if (value.health === "inactive" && (!value.configured || value.active)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O estado inactive exige job configurado e inativo.",
      });
    }
  });

export type CheckoutCronHealth = z.infer<typeof checkoutCronHealthSchema>;
export type CheckoutCronHealthStatus = z.infer<
  typeof checkoutCronHealthStatusSchema
>;
