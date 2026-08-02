import { z } from "zod";

export const studentCommunicationPreferencesSchema = z.object({
  in_app_transactional: z.literal(true),
  email_transactional: z.boolean(),
  email_product_updates: z.boolean(),
  email_marketing: z.boolean(),
  privacy_analytics: z.boolean(),
  consent_version: z.string().nullable(),
  consented_at: z.string().datetime({ offset: true }).nullable(),
  updated_at: z.string().datetime({ offset: true }),
});

export const updateStudentCommunicationPreferencesSchema = z.object({
  email_transactional: z.boolean(),
  email_product_updates: z.boolean(),
  email_marketing: z.boolean(),
  privacy_analytics: z.boolean(),
  consent_version: z.string().trim().min(1).max(100).nullable(),
}).superRefine((value, context) => {
  if ((value.email_marketing || value.privacy_analytics) && !value.consent_version) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["consent_version"],
      message: "A versão do consentimento é obrigatória.",
    });
  }
});

export type StudentCommunicationPreferences = z.infer<
  typeof studentCommunicationPreferencesSchema
>;
export type UpdateStudentCommunicationPreferences = z.infer<
  typeof updateStudentCommunicationPreferencesSchema
>;
