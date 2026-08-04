import { z } from "zod";

import { enrollmentWithCourseSchema } from "@/contracts/course-access";

export const studentCourseAccessSchema = z
  .object({
    total: z.number().int().nonnegative(),
    active_total: z.number().int().nonnegative(),
    active_enrollments: z.array(enrollmentWithCourseSchema),
    enrollments: z.array(enrollmentWithCourseSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.active_total > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["active_total"],
        message: "Matrículas ativas não podem exceder o total de matrículas.",
      });
    }

    if (value.active_enrollments.length > value.active_total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["active_enrollments"],
        message: "A amostra ativa não pode exceder o total ativo.",
      });
    }

    if (value.enrollments.length > value.total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enrollments"],
        message: "A página não pode exceder o total de matrículas.",
      });
    }
  });

export type StudentCourseAccess = z.infer<typeof studentCourseAccessSchema>;
