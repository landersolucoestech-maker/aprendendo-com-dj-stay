import { z } from "zod";

import { uuidSchema } from "@/contracts/learning";

const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const courseStatusSchema = z.enum(["draft", "published", "archived"]);
export const enrollmentStatusSchema = z.enum(["pending", "active", "suspended", "revoked"]);
export const enrollmentSourceSchema = z.enum(["manual_grant", "purchase"]);
export const enrollmentEventTypeSchema = z.enum([
  "created",
  "payment_confirmed",
  "activated",
  "renewed",
  "suspended",
  "revoked",
  "access_denied",
]);

const sourceReferenceSchema = z.string().trim().min(8).max(200).nullable();
const statusReasonSchema = z.string().trim().min(1).max(500).nullable();

const addIssue = (
  context: z.RefinementCtx,
  path: string,
  message: string,
): void => {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
};

interface EnrollmentContractValue {
  readonly status: z.infer<typeof enrollmentStatusSchema>;
  readonly source: z.infer<typeof enrollmentSourceSchema>;
  readonly source_reference: string | null;
  readonly payment_confirmed_at: string | null;
  readonly starts_at: string;
  readonly expires_at: string | null;
  readonly status_reason: string | null;
}

const validateEnrollmentContract = (
  value: EnrollmentContractValue,
  context: z.RefinementCtx,
): void => {
  if (
    value.expires_at !== null &&
    new Date(value.expires_at).getTime() <= new Date(value.starts_at).getTime()
  ) {
    addIssue(context, "expires_at", "A expiração deve ocorrer após o início do acesso.");
  }

  if (value.source === "purchase" && value.source_reference === null) {
    addIssue(context, "source_reference", "Matrícula de compra exige referência de origem.");
  }

  if (
    value.source === "purchase" &&
    value.status === "active" &&
    value.payment_confirmed_at === null
  ) {
    addIssue(
      context,
      "payment_confirmed_at",
      "Compra ativa exige confirmação de pagamento.",
    );
  }

  if (value.source === "manual_grant" && value.status === "pending") {
    addIssue(context, "status", "Matrícula manual não pode permanecer pendente.");
  }
};

export const courseSummarySchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: courseStatusSchema,
  })
  .strict();

const enrollmentProjectionObjectSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    course_id: uuidSchema,
    status: enrollmentStatusSchema,
    source: enrollmentSourceSchema,
    source_reference: sourceReferenceSchema,
    payment_confirmed_at: nullableTimestampSchema,
    starts_at: timestampSchema,
    expires_at: nullableTimestampSchema,
    status_reason: statusReasonSchema,
    courses: courseSummarySchema,
  })
  .strict();

export const enrollmentWithCourseSchema = enrollmentProjectionObjectSchema.superRefine(
  validateEnrollmentContract,
);

export const enrollmentsWithCourseSchema = z.array(enrollmentWithCourseSchema);

const enrollmentRowObjectSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    course_id: uuidSchema,
    status: enrollmentStatusSchema,
    source: enrollmentSourceSchema,
    source_reference: sourceReferenceSchema,
    payment_confirmed_at: nullableTimestampSchema,
    starts_at: timestampSchema,
    expires_at: nullableTimestampSchema,
    granted_by_user_id: uuidSchema.nullable(),
    status_reason: statusReasonSchema,
    suspended_at: nullableTimestampSchema,
    revoked_at: nullableTimestampSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .strict();

export const enrollmentRowSchema = enrollmentRowObjectSchema
  .superRefine(validateEnrollmentContract)
  .superRefine((value, context) => {
    if (
      value.source === "manual_grant" &&
      (value.granted_by_user_id === null ||
        value.source_reference !== null ||
        value.payment_confirmed_at !== null)
    ) {
      addIssue(
        context,
        "source",
        "Matrícula manual exige concedente e não pode carregar dados de compra.",
      );
    }

    if (value.source === "purchase" && value.granted_by_user_id !== null) {
      addIssue(context, "granted_by_user_id", "Matrícula de compra não possui concedente manual.");
    }

    const openStateIsValid =
      (value.status === "pending" || value.status === "active") &&
      value.suspended_at === null &&
      value.revoked_at === null;
    const suspendedStateIsValid =
      value.status === "suspended" &&
      value.suspended_at !== null &&
      value.revoked_at === null &&
      value.status_reason !== null;
    const revokedStateIsValid =
      value.status === "revoked" &&
      value.revoked_at !== null &&
      value.suspended_at === null &&
      value.status_reason !== null;

    if (!openStateIsValid && !suspendedStateIsValid && !revokedStateIsValid) {
      addIssue(context, "status", "O lifecycle da matrícula está incoerente.");
    }
  });

export const enrollmentRowsSchema = z.array(enrollmentRowSchema);

export const enrollmentEventSchema = z
  .object({
    id: uuidSchema,
    enrollment_id: uuidSchema,
    actor_user_id: uuidSchema.nullable(),
    event_type: enrollmentEventTypeSchema,
    from_status: enrollmentStatusSchema.nullable(),
    to_status: enrollmentStatusSchema.nullable(),
    details: z.record(z.string(), z.unknown()),
    created_at: timestampSchema,
  })
  .strict();

export const enrollmentEventsSchema = z.array(enrollmentEventSchema);

export type EnrollmentWithCourse = z.infer<typeof enrollmentWithCourseSchema>;
export type EnrollmentRow = z.infer<typeof enrollmentRowSchema>;
export type EnrollmentEvent = z.infer<typeof enrollmentEventSchema>;

export const getActiveEnrollments = (
  enrollments: EnrollmentWithCourse[],
  now = Date.now(),
): EnrollmentWithCourse[] =>
  enrollments.filter((enrollment) => {
    const startsAt = Date.parse(enrollment.starts_at);
    const expiresAt =
      enrollment.expires_at === null
        ? null
        : Date.parse(enrollment.expires_at);

    return (
      enrollment.status === "active" &&
      enrollment.courses.status === "published" &&
      startsAt <= now &&
      (expiresAt === null || expiresAt > now)
    );
  });
