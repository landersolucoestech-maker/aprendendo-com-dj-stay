import { z } from "zod";

const countSchema = z.number().int().nonnegative();
const percentSchema = z.number().int().min(0).max(100);

export const academicProgressBucketSchema = z.enum([
  "not_started",
  "started_1_24",
  "progress_25_49",
  "progress_50_74",
  "progress_75_99",
  "completed_100",
]);

const academicSummarySchema = z
  .object({
    enrollments_started: countSchema,
    unique_students: countSchema,
    pending_enrollments: countSchema,
    active_enrollments: countSchema,
    suspended_enrollments: countSchema,
    revoked_enrollments: countSchema,
    completed_all_lessons: countSchema,
    active_without_recent_activity: countSchema,
    valid_certificates: countSchema,
    average_completion_percent: percentSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const statusTotal =
      value.pending_enrollments +
      value.active_enrollments +
      value.suspended_enrollments +
      value.revoked_enrollments;
    if (statusTotal !== value.enrollments_started) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A distribuição de status diverge da coorte de matrículas.",
      });
    }
    if (value.active_without_recent_activity > value.active_enrollments) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["active_without_recent_activity"],
        message: "Inatividade não pode superar matrículas ativas.",
      });
    }
  });

const academicCourseBreakdownSchema = z
  .object({
    course_id: z.string().uuid(),
    course_title: z.string().min(1).max(200),
    enrollments_started: countSchema,
    unique_students: countSchema,
    active_enrollments: countSchema,
    completed_all_lessons: countSchema,
    active_without_recent_activity: countSchema,
    valid_certificates: countSchema,
    average_completion_percent: percentSchema,
  })
  .strict();

const academicProgressDistributionSchema = z
  .object({
    bucket: academicProgressBucketSchema,
    enrollment_count: countSchema,
  })
  .strict();

const academicDailySchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    enrollments_started: countSchema,
    unique_students: countSchema,
  })
  .strict();

export const academicAdminAnalyticsSchema = z
  .object({
    period: z
      .object({
        start_at: z.string().datetime({ offset: true }),
        end_at: z.string().datetime({ offset: true }),
        time_zone: z.literal("America/Sao_Paulo"),
        course_id: z.string().uuid().nullable(),
        inactive_days: z.number().int().min(7).max(180),
      })
      .strict(),
    summary: academicSummarySchema,
    course_breakdown: z.array(academicCourseBreakdownSchema),
    progress_distribution: z
      .array(academicProgressDistributionSchema)
      .length(6),
    daily: z.array(academicDailySchema).min(1).max(367),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Date(value.period.start_at) >= new Date(value.period.end_at)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["period"],
        message: "O período acadêmico precisa terminar depois do início.",
      });
    }

    const distributed = value.progress_distribution.reduce(
      (total, bucket) => total + bucket.enrollment_count,
      0,
    );
    if (distributed !== value.summary.enrollments_started) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["progress_distribution"],
        message: "A distribuição de progresso diverge da coorte.",
      });
    }
  });

export type AcademicAdminAnalytics = z.infer<
  typeof academicAdminAnalyticsSchema
>;
