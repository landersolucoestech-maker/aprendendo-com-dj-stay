import { z } from "zod";

const certificateCodeSchema = z.string().regex(/^DJSTAY-[A-F0-9]{20}$/);
const certificateTimestampSchema = z.string().datetime({ offset: true });
const certificateSnapshotSchema = z.string().trim().min(2).max(200);
const certificatePercentSchema = z.number().int().min(0).max(100);
const revocationReasonSchema = z.string().trim().min(3).max(1000).nullable();

export const certificateStatusSchema = z.enum(["issued", "revoked"]);
export const enrollmentStatusSchema = z.enum([
  "pending",
  "active",
  "suspended",
  "revoked",
]);
export const enrollmentSourceSchema = z.enum(["manual_grant", "purchase"]);

interface CertificateRevocationValue {
  readonly status: z.infer<typeof certificateStatusSchema>;
  readonly revoked_at: string | null;
  readonly revocation_reason: string | null;
}

const validateCertificateRevocationState = (
  value: CertificateRevocationValue,
  context: z.RefinementCtx,
): void => {
  const hasRevokedAt = value.revoked_at !== null;
  const hasReason = value.revocation_reason !== null;

  if (value.status === "issued" && (hasRevokedAt || hasReason)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revoked_at"],
      message: "Certificado emitido não pode conter dados de revogação.",
    });
  }

  if (value.status === "revoked" && (!hasRevokedAt || !hasReason)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasRevokedAt ? ["revocation_reason"] : ["revoked_at"],
      message: "Certificado revogado exige horário e motivo de revogação.",
    });
  }
};

const certificateSummaryShape = {
  id: z.string().uuid(),
  code: certificateCodeSchema,
  status: certificateStatusSchema,
  student_name: certificateSnapshotSchema,
  course_title: certificateSnapshotSchema,
  completion_percent: certificatePercentSchema,
  issued_at: certificateTimestampSchema,
  revoked_at: certificateTimestampSchema.nullable(),
  revocation_reason: revocationReasonSchema,
};

export const certificateSummarySchema = z
  .object(certificateSummaryShape)
  .strict()
  .superRefine(validateCertificateRevocationState);

export const myCertificatesSchema = z.array(certificateSummarySchema);

const certificateNotFoundSchema = z
  .object({
    found: z.literal(false),
    valid: z.literal(false),
  })
  .strict();

const certificateFoundSchema = z
  .object({
    found: z.literal(true),
    valid: z.boolean(),
    code: certificateCodeSchema,
    status: certificateStatusSchema,
    student_name: certificateSnapshotSchema,
    course_title: certificateSnapshotSchema,
    completion_percent: certificatePercentSchema,
    issued_at: certificateTimestampSchema,
    revoked_at: certificateTimestampSchema.nullable(),
    revocation_reason: revocationReasonSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateCertificateRevocationState(value, context);

    if (value.valid !== (value.status === "issued")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valid"],
        message: "Validade pública deve corresponder ao status do certificado.",
      });
    }
  });

export const certificateValidationSchema = z.union([
  certificateNotFoundSchema,
  certificateFoundSchema,
]);

export const enrollmentCompletionSchema = z
  .object({
    enrollment_id: z.string().uuid(),
    user_id: z.string().uuid(),
    course_id: z.string().uuid(),
    enrollment_status: enrollmentStatusSchema,
    course_title: z.string().min(1),
    certificate_enabled: z.boolean(),
    completion_mode: z.enum([
      "all_required_lessons",
      "percentage",
      "manual",
    ]),
    minimum_percent: z.number().int().min(1).max(100),
    total_lessons: z.number().int().nonnegative(),
    completed_lessons: z.number().int().nonnegative(),
    completion_percent: certificatePercentSchema,
    eligible: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.completed_lessons > value.total_lessons) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completed_lessons"],
        message: "Aulas concluídas não podem exceder o total de aulas.",
      });
    }

    const expectedPercent =
      value.total_lessons === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              (value.completed_lessons / value.total_lessons) * 100,
            ),
          );

    if (value.completion_percent !== expectedPercent) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completion_percent"],
        message: "Percentual de conclusão diverge das contagens de aulas.",
      });
    }

    const expectedEligibility =
      value.enrollment_status === "active" &&
      value.certificate_enabled &&
      (value.completion_mode === "manual" ||
        value.completion_percent >= value.minimum_percent);

    if (value.eligible !== expectedEligibility) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eligible"],
        message: "Elegibilidade diverge das regras de matrícula e curso.",
      });
    }
  });

export const adminStudentSchema = z
  .object({
    user_id: z.string().uuid(),
    email: z.string().email().nullable(),
    name: z.string().min(1),
    created_at: certificateTimestampSchema,
    enrollment_count: z.number().int().nonnegative(),
    certificate_count: z.number().int().nonnegative(),
  })
  .strict();

export const adminCourseSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1),
    status: z.enum(["draft", "published", "archived"]),
    certificate_enabled: z.boolean(),
    certificate_min_completion_percent: z.number().int().min(1).max(100),
  })
  .strict();

export const adminEnrollmentObjectSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    course_id: z.string().uuid(),
    course_title: z.string().min(1),
    status: enrollmentStatusSchema,
    source: enrollmentSourceSchema,
    starts_at: certificateTimestampSchema,
    expires_at: certificateTimestampSchema.nullable(),
    status_reason: z.string().nullable(),
    completion: enrollmentCompletionSchema,
    active_certificate_id: z.string().uuid().nullable(),
    active_certificate_code: certificateCodeSchema.nullable(),
  })
  .strict();

export type AdminEnrollmentValue = z.infer<typeof adminEnrollmentObjectSchema>;

export const validateAdminEnrollmentState = (
  value: AdminEnrollmentValue,
  context: z.RefinementCtx,
): void => {
  const hasCertificateId = value.active_certificate_id !== null;
  const hasCertificateCode = value.active_certificate_code !== null;

  if (hasCertificateId !== hasCertificateCode) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasCertificateId
        ? ["active_certificate_code"]
        : ["active_certificate_id"],
      message: "Identificador e código do certificado ativo devem existir em conjunto.",
    });
  }

  const completionMatchesEnrollment =
    value.completion.enrollment_id === value.id &&
    value.completion.user_id === value.user_id &&
    value.completion.course_id === value.course_id &&
    value.completion.enrollment_status === value.status &&
    value.completion.course_title === value.course_title;

  if (!completionMatchesEnrollment) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["completion"],
      message: "Conclusão calculada não corresponde à matrícula administrativa.",
    });
  }
};

export const adminEnrollmentSchema = adminEnrollmentObjectSchema.superRefine(
  validateAdminEnrollmentState,
);

export const adminCertificateSchema = z
  .object({
    ...certificateSummaryShape,
    enrollment_id: z.string().uuid(),
    user_id: z.string().uuid(),
    course_id: z.string().uuid(),
  })
  .strict()
  .superRefine(validateCertificateRevocationState);

export const studentsAdminDashboardSchema = z
  .object({
    students: z.array(adminStudentSchema),
    courses: z.array(adminCourseSchema),
    enrollments: z.array(adminEnrollmentSchema),
    certificates: z.array(adminCertificateSchema),
  })
  .strict();

export type CertificateSummary = z.infer<typeof certificateSummarySchema>;
export type CertificateValidation = z.infer<
  typeof certificateValidationSchema
>;
export type StudentsAdminDashboard = z.infer<
  typeof studentsAdminDashboardSchema
>;
