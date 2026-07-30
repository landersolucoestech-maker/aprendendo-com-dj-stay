import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const courseStatusSchema = z.enum(["draft", "published", "archived"]);
export const enrollmentStatusSchema = z.enum(["pending", "active", "suspended", "revoked"]);
export const enrollmentSourceSchema = z.enum(["manual_grant", "purchase"]);

export const courseSummarySchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1).max(200),
    slug: z.string().trim().min(1).max(160),
    status: courseStatusSchema,
  })
  .strict();

export const enrollmentWithCourseSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    course_id: uuidSchema,
    status: enrollmentStatusSchema,
    source: enrollmentSourceSchema,
    source_reference: z.string().nullable(),
    payment_confirmed_at: timestampSchema.nullable(),
    starts_at: timestampSchema,
    expires_at: timestampSchema.nullable(),
    status_reason: z.string().nullable(),
    courses: courseSummarySchema,
  })
  .strict();

export const enrollmentsWithCourseSchema = z.array(enrollmentWithCourseSchema);

export type EnrollmentWithCourse = z.infer<typeof enrollmentWithCourseSchema>;
