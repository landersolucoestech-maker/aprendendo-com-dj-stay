import { z } from "zod";

import { hostedCheckoutResultSchema } from "@/contracts/checkout";

export const courseCheckoutSlugSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const courseCheckoutResolutionSchema = z
  .object({
    course_id: z.string().uuid().nullable(),
    slug: courseCheckoutSlugSchema,
    title: z.string().trim().min(1).max(200),
    checkout_eligible: z.boolean(),
    already_enrolled: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const eligibleStateIsValid =
      value.checkout_eligible &&
      !value.already_enrolled &&
      value.course_id !== null;
    const enrolledStateIsValid =
      !value.checkout_eligible &&
      value.already_enrolled &&
      value.course_id === null;

    if (!eligibleStateIsValid && !enrolledStateIsValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["checkout_eligible"],
        message: "Estado de elegibilidade do checkout de curso está incoerente.",
      });
    }
  });

const alreadyEnrolledResultSchema = z
  .object({
    status: z.literal("already_enrolled"),
    slug: courseCheckoutSlugSchema,
    title: z.string().trim().min(1).max(200),
  })
  .strict();

const checkoutCreatedResultSchema = hostedCheckoutResultSchema.extend({
  slug: courseCheckoutSlugSchema,
  title: z.string().trim().min(1).max(200),
});

export const courseCheckoutStartResultSchema = z.discriminatedUnion("status", [
  alreadyEnrolledResultSchema,
  checkoutCreatedResultSchema,
]);

export type CourseCheckoutResolution = z.infer<
  typeof courseCheckoutResolutionSchema
>;
export type CourseCheckoutStartResult = z.infer<
  typeof courseCheckoutStartResultSchema
>;
