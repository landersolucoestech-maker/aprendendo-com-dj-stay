import { z } from "zod";

export const studentProgressSummarySchema = z
  .object({
    started_lessons: z.number().int().nonnegative(),
    completed_lessons: z.number().int().nonnegative(),
    average_progress_percent: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.completed_lessons > value.started_lessons) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completed_lessons"],
        message: "Aulas concluídas não podem exceder aulas iniciadas.",
      });
    }

    if (value.started_lessons === 0 && value.average_progress_percent !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["average_progress_percent"],
        message: "Aluno sem aulas iniciadas deve possuir média zero.",
      });
    }
  });

export type StudentProgressSummary = z.infer<
  typeof studentProgressSummarySchema
>;
