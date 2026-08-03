import { z } from "zod";

import {
  adminEnrollmentObjectSchema,
  studentsAdminDashboardSchema,
  validateAdminEnrollmentState,
} from "@/contracts/certificates";

export const studentsAdminTotalsSchema = z
  .object({
    students: z.number().int().nonnegative(),
    enrollments: z.number().int().nonnegative(),
    certificates: z.number().int().nonnegative(),
    valid_certificates: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.valid_certificates > value.certificates) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valid_certificates"],
        message: "Certificados válidos não podem exceder o total de certificados.",
      });
    }
  });

export const paginatedAdminEnrollmentSchema = adminEnrollmentObjectSchema
  .extend({
    student_name: z.string().min(1),
    student_email: z.string().email().nullable(),
  })
  .strict()
  .superRefine(validateAdminEnrollmentState);

export const paginatedStudentsAdminDashboardSchema = studentsAdminDashboardSchema
  .extend({
    totals: studentsAdminTotalsSchema,
    enrollments: z.array(paginatedAdminEnrollmentSchema),
  })
  .strict()
  .superRefine((value, context) => {
    const pages = [
      ["students", value.students.length, value.totals.students],
      ["enrollments", value.enrollments.length, value.totals.enrollments],
      ["certificates", value.certificates.length, value.totals.certificates],
    ] as const;

    for (const [path, pageSize, total] of pages) {
      if (pageSize > total) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [path],
          message: "A página não pode conter mais registros que o total filtrado.",
        });
      }
    }
  });

export type PaginatedStudentsAdminDashboard = z.infer<
  typeof paginatedStudentsAdminDashboardSchema
>;
