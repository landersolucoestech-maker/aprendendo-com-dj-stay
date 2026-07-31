import { z } from "zod";

export const certificateStatusSchema = z.enum(["issued", "revoked"]);
export const enrollmentStatusSchema = z.enum(["pending", "active", "suspended", "revoked"]);
export const enrollmentSourceSchema = z.enum(["manual_grant", "purchase"]);

export const certificateSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^DJSTAY-[A-F0-9]{20}$/),
  status: certificateStatusSchema,
  student_name: z.string().min(2),
  course_title: z.string().min(2),
  completion_percent: z.number().int().min(0).max(100),
  issued_at: z.string().datetime({ offset: true }),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
  revocation_reason: z.string().nullable(),
});

export const myCertificatesSchema = z.array(certificateSummarySchema);

const certificateNotFoundSchema = z.object({
  found: z.literal(false),
  valid: z.literal(false),
});

const certificateFoundSchema = z.object({
  found: z.literal(true),
  valid: z.boolean(),
  code: z.string().regex(/^DJSTAY-[A-F0-9]{20}$/),
  status: certificateStatusSchema,
  student_name: z.string().min(2),
  course_title: z.string().min(2),
  completion_percent: z.number().int().min(0).max(100),
  issued_at: z.string().datetime({ offset: true }),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
  revocation_reason: z.string().nullable(),
});

export const certificateValidationSchema = z.union([
  certificateNotFoundSchema,
  certificateFoundSchema,
]);

export const enrollmentCompletionSchema = z.object({
  enrollment_id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  enrollment_status: enrollmentStatusSchema,
  course_title: z.string(),
  certificate_enabled: z.boolean(),
  completion_mode: z.enum(["all_required_lessons", "percentage", "manual"]),
  minimum_percent: z.number().int().min(1).max(100),
  total_lessons: z.number().int().nonnegative(),
  completed_lessons: z.number().int().nonnegative(),
  completion_percent: z.number().int().min(0).max(100),
  eligible: z.boolean(),
});

export const adminStudentSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  created_at: z.string().datetime({ offset: true }),
  enrollment_count: z.number().int().nonnegative(),
  certificate_count: z.number().int().nonnegative(),
});

export const adminCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(["draft", "published", "archived"]),
  certificate_enabled: z.boolean(),
  certificate_min_completion_percent: z.number().int().min(1).max(100),
});

export const adminEnrollmentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  course_title: z.string().min(1),
  status: enrollmentStatusSchema,
  source: enrollmentSourceSchema,
  starts_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }).nullable(),
  status_reason: z.string().nullable(),
  completion: enrollmentCompletionSchema,
  active_certificate_id: z.string().uuid().nullable(),
  active_certificate_code: z.string().regex(/^DJSTAY-[A-F0-9]{20}$/).nullable(),
});

export const adminCertificateSchema = certificateSummarySchema.extend({
  enrollment_id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
});

export const studentsAdminDashboardSchema = z.object({
  students: z.array(adminStudentSchema),
  courses: z.array(adminCourseSchema),
  enrollments: z.array(adminEnrollmentSchema),
  certificates: z.array(adminCertificateSchema),
});

export type CertificateSummary = z.infer<typeof certificateSummarySchema>;
export type CertificateValidation = z.infer<typeof certificateValidationSchema>;
export type StudentsAdminDashboard = z.infer<typeof studentsAdminDashboardSchema>;
