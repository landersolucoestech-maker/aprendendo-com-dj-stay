import { z } from "zod";

import { enrollmentWithCourseSchema } from "@/contracts/course-access";

const activeStudentCourseDetailSchema = enrollmentWithCourseSchema.superRefine(
  (value, context) => {
    if (value.status !== "active") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "O detalhe do curso exige matrícula ativa.",
      });
    }

    if (value.courses.status !== "published") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["courses", "status"],
        message: "O detalhe do curso exige curso publicado.",
      });
    }
  },
);

export const studentCourseDetailAccessSchema =
  activeStudentCourseDetailSchema.nullable();

export type StudentCourseDetailAccess = z.infer<
  typeof studentCourseDetailAccessSchema
>;
